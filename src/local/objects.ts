import 'server-only'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'
import { dataDir } from './db'
import { signToken, verifyToken } from './crypto'

// Local-disk object store used when no R2/S3 bucket is configured. It mimics
// the presigned-URL model: the server hands the browser short-lived HMAC-signed
// URLs to /api/local-storage, which streams bytes to/from `.data/objects/`.

export type ObjectGrant = {
  k: string // object key
  m: 'PUT' | 'GET'
  exp: number
  ct?: string // content type (GET response / PUT expectation)
  len?: number // exact expected length for PUT
  dl?: string // attachment filename for GET
  u?: string // multipart upload id (PUT of one part)
  pn?: number // multipart part number
}

export const OBJECT_ROUTE = '/api/local-storage'

export function objectsRoot(): string {
  return path.join(dataDir(), 'objects')
}

// Resolve a key to a path inside the objects root, refusing traversal.
export function objectPath(key: string): string {
  const root = objectsRoot()
  const p = path.resolve(root, ...key.split('/').filter(Boolean))
  if (!p.startsWith(root + path.sep)) throw new Error('Invalid object key')
  return p
}

export function signObjectUrl(
  grant: Omit<ObjectGrant, 'exp'>,
  ttlSeconds: number,
): string {
  const token = signToken(
    { ...grant, exp: Date.now() + ttlSeconds * 1000 },
    'local-object',
  )
  return `${OBJECT_ROUTE}?t=${encodeURIComponent(token)}`
}

export function readGrant(token: string | null): ObjectGrant | null {
  return verifyToken<ObjectGrant>(token, 'local-object')
}

export async function deleteLocalObjects(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(async (k) => {
      try {
        const file = objectPath(k)
        await fs.promises.rm(file, { force: true })
        // Drop the per-transfer folder once empty (rmdir refuses otherwise).
        await fs.promises.rmdir(path.dirname(file)).catch(() => {})
      } catch {
        // best-effort
      }
    }),
  )
}

export async function localObjectSize(key: string): Promise<number | null> {
  try {
    return (await fs.promises.stat(objectPath(key))).size
  } catch {
    return null
  }
}

// ── Multipart ────────────────────────────────────────────────────────────────
// Parts are staged under `.data/objects/.multipart/<uploadId>/<n>` and
// concatenated into the final object on completion.

function multipartDir(uploadId: string): string {
  if (!/^[a-f0-9-]{36}$/.test(uploadId)) throw new Error('Invalid upload id')
  return path.join(objectsRoot(), '.multipart', uploadId)
}

export function partPath(uploadId: string, partNumber: number): string {
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000)
    throw new Error('Invalid part number')
  return path.join(multipartDir(uploadId), String(partNumber))
}

export async function createLocalMultipart(key: string): Promise<string> {
  objectPath(key) // validate key early
  const uploadId = crypto.randomUUID()
  await fs.promises.mkdir(multipartDir(uploadId), { recursive: true })
  return uploadId
}

export async function completeLocalMultipart(
  key: string,
  uploadId: string,
  partNumbers: number[],
): Promise<void> {
  const target = objectPath(key)
  await fs.promises.mkdir(path.dirname(target), { recursive: true })
  const tmp = `${target}.${Date.now()}.assemble`
  const out = fs.createWriteStream(tmp)
  try {
    for (const n of partNumbers) {
      await pipeline(fs.createReadStream(partPath(uploadId, n)), out, {
        end: false,
      })
    }
    await new Promise<void>((resolve, reject) =>
      out.end((e?: Error | null) => (e ? reject(e) : resolve())),
    )
    await fs.promises.rename(tmp, target)
  } catch (e) {
    out.destroy()
    await fs.promises.rm(tmp, { force: true })
    throw new Error(`Could not assemble upload: ${(e as Error).message}`)
  }
  await abortLocalMultipart(uploadId)
}

export async function abortLocalMultipart(uploadId: string): Promise<void> {
  await fs.promises.rm(multipartDir(uploadId), { recursive: true, force: true })
}

// Stream a body into an object, enforcing the exact expected size.
export async function writeLocalObject(
  key: string,
  body: NodeJS.ReadableStream,
  size: number,
): Promise<void> {
  const file = objectPath(key)
  await fs.promises.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${Date.now()}.part`
  let written = 0
  const counter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      written += chunk.length
      if (written > size) cb(new Error('Body larger than declared size'))
      else cb(null, chunk)
    },
  })
  try {
    await pipeline(body, counter, fs.createWriteStream(tmp))
    if (written !== size)
      throw new Error(`Expected ${size} bytes, received ${written}`)
    await fs.promises.rename(tmp, file)
  } catch (e) {
    await fs.promises.rm(tmp, { force: true })
    throw e
  }
}

// Remove staged multipart uploads that were never completed.
export async function pruneStaleMultipart(maxAgeMs: number): Promise<number> {
  const root = path.join(objectsRoot(), '.multipart')
  let removed = 0
  let entries: string[] = []
  try {
    entries = await fs.promises.readdir(root)
  } catch {
    return 0
  }
  for (const id of entries) {
    try {
      const st = await fs.promises.stat(path.join(root, id))
      if (Date.now() - st.mtimeMs > maxAgeMs) {
        await abortLocalMultipart(id)
        removed++
      }
    } catch {
      // raced with completion
    }
  }
  return removed
}
