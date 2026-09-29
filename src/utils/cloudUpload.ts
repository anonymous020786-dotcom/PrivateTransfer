'use client'

import { sha256OfBlob } from './sha256'

// Browser side of cloud uploads: presigned PUTs with automatic retry, and
// multipart uploads (parallel parts) for large files.

export type MultipartPlan = {
  uploadId: string
  partSize: number
  partUrls: string[]
}

export type UploadedPart = { partNumber: number; etag: string }

const MAX_ATTEMPTS = 5
const PART_CONCURRENCY = 4

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

// 4xx other than 408/429 mean the URL or payload is wrong — retrying won't help.
function retryable(e: unknown): boolean {
  if (!(e instanceof HttpError)) return true // network error / abort by timeout
  return e.status === 408 || e.status === 429 || e.status >= 500
}

function putOnce(
  url: string,
  body: Blob,
  contentType: string | undefined,
  onProgress: (loaded: number) => void,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    if (contentType) xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(e.loaded)
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(body.size)
        resolve(
          xhr.getResponseHeader('ETag') ?? xhr.getResponseHeader('X-Zync-ETag'),
        )
      } else reject(new HttpError(xhr.status, `Upload failed (${xhr.status})`))
    })
    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.addEventListener('timeout', () => reject(new Error('Timed out')))
    xhr.send(body)
  })
}

// PUT with exponential backoff (1s, 2s, 4s, 8s + jitter). Progress restarts
// from zero on each attempt. Resolves with the ETag response header.
export async function putWithRetry(
  url: string,
  body: Blob,
  contentType: string | undefined,
  onProgress: (loaded: number) => void,
  onRetry?: (attempt: number, error: Error) => void,
): Promise<string | null> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await putOnce(url, body, contentType, onProgress)
    } catch (e) {
      onProgress(0)
      if (attempt >= MAX_ATTEMPTS || !retryable(e)) throw e
      onRetry?.(attempt, e as Error)
      await sleep(1000 * 2 ** (attempt - 1) + Math.random() * 250)
    }
  }
}

// Upload a blob as parts, PART_CONCURRENCY at a time. `onProgress` receives
// the total bytes sent across all parts.
export async function uploadMultipart(
  blob: Blob,
  plan: MultipartPlan,
  onProgress: (loaded: number) => void,
  onRetry?: (attempt: number, error: Error) => void,
): Promise<UploadedPart[]> {
  const perPart = new Array<number>(plan.partUrls.length).fill(0)
  const report = () => onProgress(perPart.reduce((a, b) => a + b, 0))
  const parts: UploadedPart[] = []
  let next = 0

  const worker = async () => {
    while (next < plan.partUrls.length) {
      const i = next++
      const start = i * plan.partSize
      const chunk = blob.slice(
        start,
        Math.min(start + plan.partSize, blob.size),
      )
      const etag = await putWithRetry(
        plan.partUrls[i],
        chunk,
        undefined,
        (loaded) => {
          perPart[i] = loaded
          report()
        },
        onRetry,
      )
      if (!etag)
        throw new Error(
          'Storage did not return an ETag — the bucket CORS policy must expose the ETag header.',
        )
      parts.push({ partNumber: i + 1, etag })
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(PART_CONCURRENCY, plan.partUrls.length) },
      worker,
    ),
  )
  return parts.sort((a, b) => a.partNumber - b.partNumber)
}

// ── Hashing in a worker ──────────────────────────────────────────────────────

let hashWorker: Worker | null = null
let seq = 0
const pending = new Map<number, (hex: string | null) => void>()

function getHashWorker(): Worker | null {
  if (hashWorker) return hashWorker
  if (typeof Worker === 'undefined') return null
  try {
    hashWorker = new Worker(
      new URL('../workers/sha256.worker.ts', import.meta.url),
      {
        type: 'module',
      },
    )
    hashWorker.onmessage = (e: MessageEvent<{ id: number; hex?: string }>) => {
      pending.get(e.data.id)?.(e.data.hex ?? null)
      pending.delete(e.data.id)
    }
    return hashWorker
  } catch {
    return null
  }
}

// SHA-256 hex of a file; resolves null rather than failing an upload.
export function hashFile(blob: Blob): Promise<string | null> {
  const w = getHashWorker()
  if (!w) return sha256OfBlob(blob).catch(() => null)
  const id = ++seq
  return new Promise((resolve) => {
    pending.set(id, resolve)
    w.postMessage({ id, blob })
  })
}
