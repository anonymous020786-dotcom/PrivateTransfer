import 'server-only'
import { getRedisClient } from '../redisClient'

export type ScanStatus =
  | 'pending'
  | 'scanning'
  | 'clean'
  | 'infected'
  | 'error'
  | 'skipped'

const SCAN_QUEUE = 'scan:queue'
const SCAN_MAX_BYTES = 50 * 1024 * 1024 // 50 MB limit for VirusTotal free tier

export async function enqueueScan(slug: string): Promise<void> {
  const redis = getRedisClient()
  await redis.lpush(SCAN_QUEUE, slug)
}

export async function dequeueScanBatch(limit = 5): Promise<string[]> {
  const redis = getRedisClient()
  const results: string[] = []
  for (let i = 0; i < limit; i++) {
    const item = await redis.rpop(SCAN_QUEUE)
    if (!item) break
    results.push(item)
  }
  return results
}

// Submits a file URL to VirusTotal and returns an analysis ID
export async function submitUrlToVirusTotal(
  apiKey: string,
  fileUrl: string,
  fileName: string,
): Promise<string | null> {
  try {
    // Download file content (up to SCAN_MAX_BYTES)
    const fileRes = await fetch(fileUrl, {
      signal: AbortSignal.timeout(30_000),
    })
    if (!fileRes.ok) return null

    const contentLength = Number(fileRes.headers.get('content-length') ?? '0')
    if (contentLength > SCAN_MAX_BYTES) return 'skipped:too_large'

    const buffer = await fileRes.arrayBuffer()
    if (buffer.byteLength > SCAN_MAX_BYTES) return 'skipped:too_large'

    // Upload to VirusTotal
    const form = new FormData()
    form.append('file', new Blob([buffer]), fileName)

    const vtRes = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: { 'x-apikey': apiKey },
      body: form,
      signal: AbortSignal.timeout(60_000),
    })
    if (!vtRes.ok) return null
    const vtJson = (await vtRes.json()) as { data?: { id?: string } }
    return vtJson.data?.id ?? null
  } catch {
    return null
  }
}

// Poll VirusTotal analysis result
export async function getVirusTotalResult(
  apiKey: string,
  analysisId: string,
): Promise<{
  status: 'queued' | 'in-progress' | 'completed'
  malicious: number
}> {
  try {
    const res = await fetch(
      `https://www.virustotal.com/api/v3/analyses/${encodeURIComponent(analysisId)}`,
      {
        headers: { 'x-apikey': apiKey },
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!res.ok) return { status: 'queued', malicious: 0 }
    const json = (await res.json()) as {
      data?: {
        attributes?: {
          status?: string
          stats?: { malicious?: number; suspicious?: number }
        }
      }
    }
    const attrs = json.data?.attributes
    const vtStatus = attrs?.status ?? 'queued'
    const malicious =
      (attrs?.stats?.malicious ?? 0) + (attrs?.stats?.suspicious ?? 0)
    if (vtStatus === 'completed') return { status: 'completed', malicious }
    if (vtStatus === 'in-progress')
      return { status: 'in-progress', malicious: 0 }
    return { status: 'queued', malicious: 0 }
  } catch {
    return { status: 'queued', malicious: 0 }
  }
}
