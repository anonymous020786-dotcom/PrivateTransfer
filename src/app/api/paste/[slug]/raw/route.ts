import { NextRequest, NextResponse } from 'next/server'
import { getPaste, openPaste } from '../../../../../lib/paste'

export const dynamic = 'force-dynamic'

// Plain-text access for curl/scripts: `curl https://host/api/paste/<slug>/raw`.
// Only for pastes that are neither encrypted, password-protected nor
// burn-after-read (those need the web page or POST /open).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const p = await getPaste(slug)
  if (!p) return new NextResponse('Not found\n', { status: 404 })
  if (p.encrypted || p.passwordHash || p.burnAfterRead)
    return new NextResponse(
      'This paste is protected; open it in a browser.\n',
      { status: 403 },
    )
  const r = await openPaste(slug)
  if (!r.ok) return new NextResponse('Not found\n', { status: 404 })
  return new NextResponse(r.paste.content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  })
}
