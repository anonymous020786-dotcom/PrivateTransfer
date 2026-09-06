import { type NextRequest, NextResponse } from 'next/server'
import { getTransfer, updateTransfer } from '../../../../lib/transfer'
import { getStorageClient, getStorageBucket } from '../../../../lib/storage'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  dequeueScanBatch,
  submitUrlToVirusTotal,
  getVirusTotalResult,
} from '../../../../lib/virusScan'
import { getSetting, isFeatureEnabled } from '../../../../lib/appSettings'
import { sendMail } from '../../../../email'
import { tplMalwareAlert } from '../../../../emailTemplates'
import { brand } from '../../../../brand'

// Max poll attempts before giving up on a stuck VirusTotal analysis (~1h at 5-min cron)
const MAX_POLL_ATTEMPTS = 12

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret)
    return NextResponse.json(
      { error: 'CRON_SECRET not configured.' },
      { status: 503 },
    )

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const enabled = await isFeatureEnabled('feature_virus_scan', false)
  if (!enabled)
    return NextResponse.json({ ok: true, skipped: 'feature_disabled' })

  const apiKey = await getSetting('virustotal_api_key')
  if (!apiKey) return NextResponse.json({ ok: true, skipped: 'no_api_key' })

  // Queue entries are "slug" or "slug:attempt" for polling retries.
  const entries = await dequeueScanBatch(5)
  let scanned = 0

  for (const entry of entries) {
    const colonIdx = entry.lastIndexOf(':')
    const hasAttempt = colonIdx > 0 && !isNaN(Number(entry.slice(colonIdx + 1)))
    const slug = hasAttempt ? entry.slice(0, colonIdx) : entry
    const attempt = hasAttempt ? Number(entry.slice(colonIdx + 1)) : 0

    try {
      const t = await getTransfer(slug)
      if (!t || !t.completed) continue

      if (t.scanStatus === 'scanning' && t.scanAnalysisId) {
        // Poll existing analysis
        const result = await getVirusTotalResult(apiKey, t.scanAnalysisId)
        if (result.status === 'completed') {
          const status = result.malicious > 0 ? 'infected' : 'clean'
          await updateTransfer(slug, {
            scanStatus: status,
            scanAnalysisId: null,
          })
          if (status === 'infected' && t.notifyEmail) {
            const tpl = tplMalwareAlert({
              title: t.title,
              url: `${brand.url}/transfer/${slug}`,
              slug,
            })
            void sendMail({ to: t.notifyEmail, ...tpl })
          }
          scanned++
        } else if (attempt >= MAX_POLL_ATTEMPTS) {
          // Give up — VirusTotal never resolved
          await updateTransfer(slug, {
            scanStatus: 'error',
            scanAnalysisId: null,
          })
          scanned++
        } else {
          // Still in progress — re-queue with incremented counter
          const { getRedisClient } = await import('../../../../redisClient')
          await getRedisClient().lpush('scan:queue', `${slug}:${attempt + 1}`)
        }
        continue
      }

      // First scan: get presigned URL for first file
      if (t.files.length === 0) {
        await updateTransfer(slug, { scanStatus: 'skipped' })
        continue
      }

      const storage = await getStorageClient()
      const bucket = await getStorageBucket()
      const file = t.files[0]
      const url = await getSignedUrl(
        storage,
        new GetObjectCommand({ Bucket: bucket, Key: file.key }),
        { expiresIn: 300 },
      )

      await updateTransfer(slug, { scanStatus: 'scanning' })
      const analysisId = await submitUrlToVirusTotal(apiKey, url, file.name)

      if (!analysisId) {
        await updateTransfer(slug, { scanStatus: 'error' })
      } else if (analysisId.startsWith('skipped:')) {
        await updateTransfer(slug, { scanStatus: 'skipped' })
      } else {
        await updateTransfer(slug, {
          scanStatus: 'scanning',
          scanAnalysisId: analysisId,
        })
        // Re-queue at attempt 0 to poll on next run
        const { getRedisClient } = await import('../../../../redisClient')
        await getRedisClient().lpush('scan:queue', `${slug}:0`)
      }
      scanned++
    } catch (e) {
      console.error(`[cron/scan] error scanning ${slug}:`, e)
      try {
        await updateTransfer(slug, {
          scanStatus: 'error',
          scanAnalysisId: null,
        })
      } catch {}
    }
  }

  return NextResponse.json({ ok: true, scanned })
}
