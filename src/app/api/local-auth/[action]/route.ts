import { NextRequest, NextResponse } from 'next/server'
import { isLocalBackend } from '../../../../local/mode'
import { runAuthAction } from '../../../../local/actions'
import { jarFromCookieStore } from '../../../../local/cookies'
import { rateLimit, getClientIp } from '../../../../rateLimit'
import { requestContext } from '../../../../lib/activity'

// HTTP bridge for the browser-side local auth client. Only mounted while the
// local backend is active; with real Supabase configured it 404s.

export const dynamic = 'force-dynamic'

// Credential-guessing surfaces get a tighter per-IP budget.
const SENSITIVE = new Set([
  'signInWithPassword',
  'signInWithOtp',
  'verifyOtp',
  'resetPasswordForEmail',
  'resend',
  'signUp',
  'mfa.verify',
])

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
): Promise<NextResponse> {
  if (!isLocalBackend())
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { action } = await params
  if (SENSITIVE.has(action)) {
    const rl = await rateLimit(`local-auth:${action}:${getClientIp(req)}`, {
      limit: 20,
      windowSeconds: 600,
    }).catch(() => ({ success: true }))
    if (!rl.success)
      return NextResponse.json({
        data: null,
        error: {
          message: 'Too many attempts. Please wait a few minutes.',
          status: 429,
        },
      })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const res = NextResponse.json({})
  const jar = jarFromCookieStore(req.cookies, res.cookies)
  const result = await runAuthAction(action, body, jar, requestContext(req))

  const out = NextResponse.json(result)
  for (const c of res.cookies.getAll()) out.cookies.set(c)
  return out
}
