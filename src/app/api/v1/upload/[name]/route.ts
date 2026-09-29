import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import {
  addUserTransferIndex,
  defaultExpiryDays,
  expiryDate,
  hashPassword,
  hashToken,
  newTransferRecord,
  saveTransfer,
} from '../../../../../lib/transfer'
import {
  isStorageConfigured,
  putObjectStream,
} from '../../../../../lib/storage'
import { lookupApiKey } from '../../../../../lib/apiKeys'
import { generateShortSlug } from '../../../../../slugs'
import { rateLimit, getClientIp } from '../../../../../rateLimit'
import { isFeatureEnabled } from '../../../../../lib/appSettings'
import { recordActivity, requestContext } from '../../../../../lib/activity'
import { brand } from '../../../../../brand'

// Command-line uploads, transfer.sh style:
//
//   curl -T report.pdf https://host/api/v1/upload/report.pdf
//   curl -T big.iso -H "Authorization: Bearer zync_…" \
//        -H "X-Expires-Days: 30" -H "X-Max-Downloads: 5" \
//        -H "X-Password: s3cret" https://host/api/v1/upload/big.iso
//
// The body streams straight to storage. The response is plain text: the share
// link, then a curl command that deletes the transfer.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BYTES = 5 * 1024 * 1024 * 1024 // single-object PUT limit

function text(body: string, status = 200): NextResponse {
  return new NextResponse(body.endsWith('\n') ? body : `${body}\n`, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

function option(
  req: NextRequest,
  header: string,
  query: string,
): string | null {
  return req.headers.get(header) ?? req.nextUrl.searchParams.get(query)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  const ip = getClientIp(req)
  const rl = await rateLimit(`cli-upload:${ip}`, {
    limit: 20,
    windowSeconds: 600,
  })
  if (!rl.success) return text('Too many uploads — slow down.', 429)

  if (!(await isStorageConfigured()))
    return text('Cloud storage is not configured on this server.', 503)
  if (!(await isFeatureEnabled('feature_cloud_transfers', true)))
    return text('Cloud transfers are temporarily disabled.', 503)

  const name = decodeURIComponent((await params).name).slice(0, 255)
  if (!name || name.includes('/') || name.includes('\\'))
    return text('Invalid file name.', 400)

  const size = Number(req.headers.get('content-length'))
  if (!Number.isFinite(size) || size <= 0)
    return text('A Content-Length header is required (curl -T sets it).', 411)
  if (size > MAX_BYTES)
    return text(
      'Files larger than 5 GB must be uploaded from the web app.',
      413,
    )
  if (!req.body) return text('Empty body.', 400)

  let ownerId: string | null = null
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const key = await lookupApiKey(auth.slice(7))
    if (!key) return text('Invalid API key.', 401)
    ownerId = key.userId
  }

  const maxDays = ownerId ? 365 : 7
  const requestedDays = Number(option(req, 'x-expires-days', 'expires'))
  const expiryDays =
    Number.isInteger(requestedDays) && requestedDays > 0
      ? Math.min(requestedDays, maxDays)
      : defaultExpiryDays(!!ownerId)
  const maxDl = Number(option(req, 'x-max-downloads', 'max-downloads'))
  const password = req.headers.get('x-password') // header only: never in URLs/logs
  const burn = /^(1|true|yes)$/i.test(
    option(req, 'x-burn-after-read', 'burn') ?? '',
  )
  const title = (option(req, 'x-title', 'title') ?? '').slice(0, 200)

  const slug = await generateShortSlug()
  const key = `${slug}/${crypto.randomUUID()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const contentType =
    req.headers.get('content-type') || 'application/octet-stream'

  try {
    await putObjectStream(
      key,
      Readable.fromWeb(req.body as import('stream/web').ReadableStream),
      { size, contentType },
    )
  } catch (e) {
    console.error('[v1/upload]', e)
    return text(`Upload failed: ${(e as Error).message}`, 400)
  }

  const expiresAt = expiryDate(expiryDays)
  const deleteToken = crypto.randomUUID().replace(/-/g, '')
  await saveTransfer(
    newTransferRecord({
      slug,
      ownerId,
      files: [{ key, name, size, type: contentType }],
      expiresAt,
      expiryDays,
      title,
      maxDownloads: Number.isInteger(maxDl) && maxDl > 0 ? maxDl : null,
      passwordHash: password ? hashPassword(password) : null,
      burnAfterRead: burn,
      completed: true,
      uploadTokenHash: hashToken(deleteToken),
    }),
  )
  if (ownerId) {
    await addUserTransferIndex(ownerId, slug, expiresAt)
    void recordActivity(ownerId, 'transfer.created', {
      ...requestContext(req),
      detail: `${name} (curl)`,
    })
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || brand.url
  const url = `${origin}/transfer/${slug}`
  return new NextResponse(
    `${url}\n\n# Expires ${expiresAt}. Delete it early with:\n# curl -X DELETE -H "x-upload-token: ${deleteToken}" ${origin}/api/transfer/${slug}\n`,
    {
      status: 201,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Transfer-Url': url,
        'X-Delete-Token': deleteToken,
      },
    },
  )
}
