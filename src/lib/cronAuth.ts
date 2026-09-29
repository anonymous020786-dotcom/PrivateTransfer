import 'server-only'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

// Cron endpoints accept `Authorization: Bearer <CRON_SECRET>` from an external
// scheduler. The built-in scheduler uses a secret derived from
// FILEPIZZA_SECRET, so it works without any extra configuration.

export function internalCronToken(): string {
  const base =
    process.env.FILEPIZZA_SECRET ||
    'filepizza-dev-secret-do-not-use-in-production'
  return crypto
    .createHmac('sha256', `cron:${base}`)
    .update('internal')
    .digest('hex')
}

function matches(auth: string | null, secret: string): boolean {
  const a = Buffer.from(auth ?? '')
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function isCronAuthorized(req: Request): true | NextResponse {
  const auth = req.headers.get('authorization')
  const external = process.env.CRON_SECRET
  // The fallback secret is public (it's in the source), so the derived token
  // is only trusted when a real secret is configured or outside production.
  const internalUsable =
    !!process.env.FILEPIZZA_SECRET || process.env.NODE_ENV !== 'production'
  if (
    (external && matches(auth, external)) ||
    (internalUsable && matches(auth, internalCronToken()))
  )
    return true
  return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
}
