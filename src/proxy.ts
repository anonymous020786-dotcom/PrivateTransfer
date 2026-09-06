import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Exact paths that require auth (no sub-path matching)
const PROTECTED_EXACT = new Set(['/transfer', '/send'])
// Prefix paths — the path itself AND all sub-paths require auth
// Note: /transfer/[slug] (download pages) are intentionally PUBLIC — share links must work without login
const PROTECTED_PREFIX = [
  '/transfer/history',
  '/account',
  '/profile',
  '/admin',
  '/stats',
  '/download',
  '/tools',
]

export default async function proxy(
  request: NextRequest,
): Promise<NextResponse> {
  const { pathname, host } = request.nextUrl

  // ── 1. Canonical redirect: www → non-www ───────────────────────────────────
  if (host.startsWith('www.')) {
    const canonical = new URL(request.url)
    canonical.host = host.replace(/^www\./, '')
    return NextResponse.redirect(canonical, { status: 301 })
  }

  // ── 2. Auth guard for protected routes ─────────────────────────────────────
  const isProtected =
    PROTECTED_EXACT.has(pathname) ||
    PROTECTED_PREFIX.some((p) => pathname === p || pathname.startsWith(p + '/'))

  const requestId = crypto.randomUUID()
  let response: NextResponse

  if (isProtected) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      response = NextResponse.next()
    } else {
      response = NextResponse.next({ request })

      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            )
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            )
          },
        },
      })

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const fwdHost = request.headers.get('x-forwarded-host')
        const fwdProto = request.headers.get('x-forwarded-proto') || 'https'
        const base =
          process.env.NEXT_PUBLIC_SITE_URL ||
          (fwdHost ? `${fwdProto}://${fwdHost}` : request.nextUrl.origin)
        const loginUrl = new URL('/login', base)
        loginUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }
  } else {
    response = NextResponse.next()
  }

  // ── 3. Security / tracing headers ──────────────────────────────────────────
  response.headers.set('X-Request-ID', requestId)
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|map)).*)',
  ],
}
