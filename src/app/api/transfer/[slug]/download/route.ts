import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getStorageClient, getStorageBucket } from '../../../../../lib/storage'
import {
  getTransfer,
  updateTransfer,
  hashPassword,
  hashIp,
  sweepExpiredTransfers,
  scheduleBurn,
  recordDownloadEvent,
  markRecipientDownloaded,
} from '../../../../../lib/transfer'
import { sendMail } from '../../../../../email'
import {
  tplTransferDownloaded,
  tplDownloadReceipt,
} from '../../../../../emailTemplates'
import { brand } from '../../../../../brand'
import { rateLimit, getClientIp } from '../../../../../rateLimit'
import {
  tooManyRequests,
  notFound,
  gone,
  err,
  ok,
} from '../../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  fileIndex: z.number().int().nonnegative().max(19),
  password: z.string().max(200).optional(),
  preview: z.boolean().default(false),
  recipientToken: z.string().max(64).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params

  const ip = getClientIp(req)
  const rl = await rateLimit(`transfer-download:${ip}`, {
    limit: 15,
    windowSeconds: 300,
  })
  if (!rl.success) return tooManyRequests(rl)

  void sweepExpiredTransfers()

  const transfer = await getTransfer(slug)
  if (!transfer || !transfer.completed) return notFound('Transfer not found.')

  if (new Date(transfer.expiresAt) < new Date())
    return gone('Transfer has expired.')

  if (
    transfer.maxDownloads !== null &&
    transfer.downloadCount >= transfer.maxDownloads
  )
    return gone('Download limit reached.')

  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')

  if (transfer.passwordHash) {
    const supplied = body.data.password
    if (!supplied || hashPassword(supplied) !== transfer.passwordHash)
      return err('Incorrect password.', { status: 403 })
  }

  if (transfer.scanStatus === 'infected')
    return err(
      'This transfer has been flagged as malicious and download has been suspended.',
      { status: 451 },
    )

  const file = transfer.files[body.data.fileIndex]
  if (!file) return notFound('File not found.')

  const storage = await getStorageClient()
  const bucket = await getStorageBucket()
  const isPreview = body.data.preview

  const url = await getSignedUrl(
    storage,
    new GetObjectCommand({
      Bucket: bucket,
      Key: file.key,
      ...(isPreview
        ? { ResponseContentType: file.type || 'application/octet-stream' }
        : {
            ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
          }),
    }),
    { expiresIn: isPreview ? 300 : 900 },
  )

  // On first file of a batch download (not previews): update count, record event, send email
  if (!isPreview && body.data.fileIndex === 0) {
    const newCount = transfer.downloadCount + 1
    await updateTransfer(slug, { downloadCount: newCount })

    // Record tracking event (privacy-preserving: IP is hashed, never stored raw)
    const country = req.headers.get('cf-ipcountry') ?? 'XX'
    void recordDownloadEvent(slug, {
      at: new Date().toISOString(),
      ipHash: hashIp(ip),
      country,
    })

    // Mark per-recipient token as downloaded (if recipient opened their personalized link)
    const rt = body.data.recipientToken
    if (rt) {
      const recipientInfo = transfer.recipientTokens[rt]
      // Send receipt to recipient on their first download
      if (recipientInfo && !recipientInfo.downloadedAt) {
        const sizeStr = (() => {
          const n = transfer.totalSize
          if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
          if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
          if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
          return `${n} B`
        })()
        const tpl = tplDownloadReceipt({
          title: transfer.title,
          url: `${brand.url}/transfer/${slug}`,
          fileCount: transfer.files.length,
          totalSize: sizeStr,
          senderName: transfer.senderName || undefined,
        })
        void sendMail({
          to: recipientInfo.email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })
      }
      void markRecipientDownloaded(slug, rt)
    }

    // Notify sender: on first download always; on every download if notifyEveryDownload is set
    if (
      transfer.notifyEmail &&
      (!transfer.notifiedAt || transfer.notifyEveryDownload)
    ) {
      if (!transfer.notifiedAt)
        void updateTransfer(slug, { notifiedAt: new Date().toISOString() })
      const tpl = tplTransferDownloaded({
        title: transfer.title,
        url: `${brand.url}/transfer/${slug}`,
        downloadCount: newCount,
      })
      void sendMail({
        to: transfer.notifyEmail,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      })
    }

    // Fire webhook (fire-and-forget, never block the download)
    if (transfer.webhookUrl) {
      void fetch(transfer.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'transfer.downloaded',
          slug,
          downloadCount: newCount,
          country: req.headers.get('cf-ipcountry') ?? 'XX',
          at: new Date().toISOString(),
          title: transfer.title,
          fileCount: transfer.files.length,
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {})
    }

    // Slack notification (fire-and-forget)
    if (transfer.slackWebhookUrl) {
      const country = req.headers.get('cf-ipcountry') ?? 'XX'
      const text = `📥 *${transfer.title || 'Untitled transfer'}* was downloaded (${newCount} total) · ${country} · <${brand.url}/transfer/${slug}|View transfer>`
      void fetch(transfer.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {})
    }

    if (transfer.burnAfterRead) {
      void scheduleBurn(
        slug,
        transfer.files.map((f) => f.key),
      )
      setTimeout(() => void sweepExpiredTransfers(), 32_000)
    }
  }

  return ok({ url, name: file.name, size: file.size }, { rl })
}
