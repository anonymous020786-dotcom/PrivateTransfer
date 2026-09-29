import { NextRequest, NextResponse } from 'next/server'

// Fallback for share-sheet posts that arrive before the service worker is
// active (it normally intercepts /share-target). Files can't be carried over
// a redirect, but shared text/links still pre-fill the transfer form.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const form = await req.formData().catch(() => null)
  const params = new URLSearchParams()
  const title = form?.get('title')
  const text = [form?.get('text'), form?.get('url')]
    .filter((v) => typeof v === 'string' && v)
    .join('\n')
  if (typeof title === 'string' && title)
    params.set('title', title.slice(0, 200))
  if (text) params.set('text', text.slice(0, 1000))
  const qs = params.toString()
  return NextResponse.redirect(
    new URL(`/transfer${qs ? `?${qs}` : ''}`, req.url),
    303,
  )
}
