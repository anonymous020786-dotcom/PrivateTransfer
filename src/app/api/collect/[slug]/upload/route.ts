import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getCollect } from '../../../../../lib/collect'
import {
  getStorageClient,
  getStorageBucket,
  getStorageClass,
  isStorageConfigured,
} from '../../../../../lib/storage'
import { rateLimit, getClientIp } from '../../../../../rateLimit'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(500),
        size: z
          .number()
          .int()
          .nonnegative()
          .max(5 * 1024 * 1024 * 1024),
        type: z.string().max(200),
      }),
    )
    .min(1)
    .max(20),
  note: z.string().max(500).optional(),
  uploaderName: z.string().max(100).optional(),
})

// POST /api/collect/[slug]/upload — get presigned PUT URLs for uploading to a collect request
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const ip = getClientIp(req)
  const rl = await rateLimit(`collect-upload:${ip}`, {
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
  if (new Date(collect.expiresAt) < new Date())
    return NextResponse.json(
      { error: 'This file request has expired.' },
      { status: 410 },
    )

  if (!(await isStorageConfigured()))
    return NextResponse.json(
      { error: 'Storage not configured.' },
      { status: 503 },
    )

  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const remaining = collect.maxFiles - collect.files.length
  if (remaining <= 0)
    return NextResponse.json(
      { error: 'This request has reached its file limit.' },
      { status: 409 },
    )
  const filesToUpload = body.data.files.slice(0, remaining)

  const storage = await getStorageClient()
  const bucket = await getStorageBucket()
  const storageClass = await getStorageClass()

  const uploadUrls: string[] = []
  const fileKeys: string[] = []

  for (const f of filesToUpload) {
    const key = `collect/${slug}/${crypto.randomUUID()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: f.type || 'application/octet-stream',
      ContentLength: f.size,
      ...(storageClass ? { StorageClass: storageClass } : {}),
    })
    const url = await getSignedUrl(storage, cmd, { expiresIn: 14400 })
    uploadUrls.push(url)
    fileKeys.push(key)
  }

  return NextResponse.json({
    uploadUrls,
    fileKeys,
    files: filesToUpload,
    note: body.data.note,
  })
}
