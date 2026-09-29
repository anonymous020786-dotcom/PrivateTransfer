import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { Readable, Transform } from 'stream'
import { pipeline } from 'stream/promises'
import { objectPath, partPath, readGrant } from '../../../local/objects'

// Streams objects for the local-disk storage driver. Every request must carry a
// signed, unexpired grant (issued by lib/storage presign helpers) that pins the
// method, object key and — for uploads — the exact byte length.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function deny(status: number, msg: string): NextResponse {
  return NextResponse.json({ error: msg }, { status })
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const g = readGrant(req.nextUrl.searchParams.get('t'))
  if (!g || g.m !== 'PUT') return deny(403, 'Invalid or expired upload URL.')
  if (!req.body) return deny(400, 'Empty body.')

  // A multipart grant writes one staged part; otherwise the whole object.
  const file = g.u && g.pn ? partPath(g.u, g.pn) : objectPath(g.k)
  if (g.u && !fs.existsSync(path.dirname(file)))
    return deny(404, 'Upload session not found.')
  await fs.promises.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${Date.now()}.part`

  let written = 0
  const limit = g.len ?? Number.MAX_SAFE_INTEGER
  const counter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      written += chunk.length
      if (written > limit) cb(new Error('Body exceeds signed length'))
      else cb(null, chunk)
    },
  })

  try {
    await pipeline(
      Readable.fromWeb(req.body as import('stream/web').ReadableStream),
      counter,
      fs.createWriteStream(tmp),
    )
    if (g.len !== undefined && written !== g.len) {
      await fs.promises.rm(tmp, { force: true })
      return deny(400, `Expected ${g.len} bytes, received ${written}.`)
    }
    await fs.promises.rename(tmp, file)
  } catch (e) {
    await fs.promises.rm(tmp, { force: true })
    return deny(400, (e as Error).message)
  }
  const etag = g.pn ? `"${g.pn}-${written}"` : `"${written}"`
  // Next.js strips ETag from route-handler responses, so mirror it in a
  // custom header the upload client also reads.
  return new NextResponse(null, {
    status: 200,
    headers: { ETag: etag, 'X-Zync-ETag': etag },
  })
}

async function serve(req: NextRequest, head: boolean): Promise<Response> {
  const g = readGrant(req.nextUrl.searchParams.get('t'))
  if (!g || g.m !== 'GET') return deny(403, 'Invalid or expired download URL.')

  const file = objectPath(g.k)
  let size: number
  try {
    size = (await fs.promises.stat(file)).size
  } catch {
    return deny(404, 'Object not found.')
  }

  // Objects are user-uploaded and served from the app's own origin, so types
  // that can execute script (HTML, SVG, XML, JS) are downgraded to plain text
  // and everything except PDFs (Chrome's viewer refuses sandboxed frames) is
  // sandboxed by CSP.
  const requested = (g.ct || 'application/octet-stream').toLowerCase()
  const active = /html|xml|svg|javascript|ecmascript|x-shockwave/.test(
    requested,
  )
  const contentType = active ? 'text/plain; charset=utf-8' : requested
  const headers = new Headers({
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
  })
  if (contentType !== 'application/pdf')
    headers.set(
      'Content-Security-Policy',
      "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
    )
  if (g.dl) {
    headers.set(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(g.dl)}`,
    )
  }

  // Single byte-range support (video seeking, resumable downloads).
  let start = 0
  let end = size - 1
  let status = 200
  const range = req.headers.get('range')
  const m = range?.match(/^bytes=(\d*)-(\d*)$/)
  if (m && size > 0) {
    if (m[1] === '' && m[2] !== '') {
      start = Math.max(0, size - Number(m[2]))
    } else {
      start = Number(m[1] || 0)
      end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
    }
    if (start > end || start >= size) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      })
    }
    status = 206
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
  }
  headers.set('Content-Length', String(size === 0 ? 0 : end - start + 1))

  if (head || size === 0) return new Response(null, { status, headers })
  const stream = fs.createReadStream(file, { start, end })
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status,
    headers,
  })
}

export async function GET(req: NextRequest): Promise<Response> {
  return serve(req, false)
}

export async function HEAD(req: NextRequest): Promise<Response> {
  return serve(req, true)
}
