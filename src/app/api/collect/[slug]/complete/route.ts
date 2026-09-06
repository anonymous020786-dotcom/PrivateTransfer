import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getCollect,
  updateCollect,
  CollectFile,
} from '../../../../../lib/collect'
import { sendMail } from '../../../../../email'
import { brand } from '../../../../../brand'
import { rateLimit, getClientIp } from '../../../../../rateLimit'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  files: z
    .array(
      z.object({
        key: z.string(),
        name: z.string().min(1).max(500),
        size: z.number().int().nonnegative(),
        type: z.string().max(200),
      }),
    )
    .min(1)
    .max(20),
  note: z.string().max(500).optional(),
  uploaderName: z.string().max(100).optional(),
})

function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${n} B`
}

// POST /api/collect/[slug]/complete — record uploaded files + notify owner
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const ip = getClientIp(req)
  const rl = await rateLimit(`collect-complete:${ip}`, {
    limit: 30,
    windowSeconds: 3600,
  })
  if (!rl.success)
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  const collect = await getCollect(slug)
  if (!collect)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (!collect.active)
    return NextResponse.json(
      { error: 'This file request is closed.' },
      { status: 410 },
    )

  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const newFiles: CollectFile[] = body.data.files.map((f) => ({
    key: f.key,
    name: f.name,
    size: f.size,
    type: f.type,
    uploadedAt: new Date().toISOString(),
    uploaderNote: body.data.note,
    uploaderName: body.data.uploaderName,
  }))

  const allFiles = [...collect.files, ...newFiles].slice(0, collect.maxFiles)
  await updateCollect(slug, { files: allFiles })

  // Notify owner by email (fire-and-forget)
  if (collect.ownerEmail) {
    const receivedUrl = `${brand.url}/collect/${slug}/received`
    const fileList = newFiles
      .map((f) => `• ${f.name} (${formatBytes(f.size)})`)
      .join('\n')
    void sendMail({
      to: collect.ownerEmail,
      subject: `Files received for "${collect.title}" · ${brand.name}`,
      text: `${body.data.uploaderName ? body.data.uploaderName : 'Someone'} uploaded ${newFiles.length} file${newFiles.length !== 1 ? 's' : ''} to your file request "${collect.title}".\n\n${fileList}${body.data.note ? `\n\nNote from uploader: ${body.data.note}` : ''}\n\nView all received files: ${receivedUrl}`,
      html: `<p><strong>${body.data.uploaderName ? body.data.uploaderName : 'Someone'}</strong> uploaded <strong>${newFiles.length} file${newFiles.length !== 1 ? 's' : ''}</strong> to your file request "<strong>${collect.title}</strong>".</p><ul>${newFiles.map((f) => `<li>${f.name} (${formatBytes(f.size)})</li>`).join('')}</ul>${body.data.note ? `<p><em>Note: ${body.data.note}</em></p>` : ''}<p><a href="${receivedUrl}">View all received files →</a></p>`,
    })
  }

  return NextResponse.json({ ok: true })
}
