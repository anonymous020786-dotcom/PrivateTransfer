import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '../../../supabase/server'
import { sendMailBg, notifyAdmins } from '../../../email'
import {
  tplWelcome,
  tplSignInAlert,
  tplCriticalAlert,
} from '../../../emailTemplates'

// OAuth callback — exchanges the auth code for a session cookie, then redirects.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/account'

  // Behind a reverse proxy (nginx/Docker), request.nextUrl.origin is the
  // INTERNAL container origin (e.g. http://<container-id>:3000). Prefer the
  // configured public site URL, then the forwarded headers, so redirects point
  // at the real domain — not an unreachable internal host.
  const fwdHost = request.headers.get('x-forwarded-host')
  const fwdProto = request.headers.get('x-forwarded-proto') || 'https'
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (fwdHost ? `${fwdProto}://${fwdHost}` : origin)

  if (code) {
    const supabase = await getSupabaseServerClient()
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        // Fire-and-forget operational emails (never block the redirect).
        try {
          const user = data?.user
          if (user?.email) {
            const meta = (user.user_metadata || {}) as {
              full_name?: string
              name?: string
            }
            const name = meta.full_name || meta.name || user.email.split('@')[0]
            const createdAt = user.created_at
              ? new Date(user.created_at).getTime()
              : 0
            const isNew = createdAt > 0 && Date.now() - createdAt < 120_000
            const when =
              new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC'
            const ip =
              request.headers.get('cf-connecting-ip') ||
              request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
              'unknown'
            const agent = request.headers.get('user-agent') || 'unknown'

            if (isNew) {
              sendMailBg({ to: user.email, ...tplWelcome(name) })
              notifyAdmins(
                tplCriticalAlert({
                  event: 'New user signup',
                  detail: `${name} <${user.email}>\nIP: ${ip}`,
                }),
              ).catch(() => {})
            } else {
              sendMailBg({
                to: user.email,
                ...tplSignInAlert(name, { time: when, ip, agent }),
              })
            }
          }
        } catch {
          /* email best-effort only */
        }
        return NextResponse.redirect(`${baseUrl}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth`)
}
