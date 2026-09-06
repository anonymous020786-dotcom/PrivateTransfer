import 'server-only'
import crypto from 'crypto'

// Lightweight, stateless anonymous identity. Each visitor gets a signed,
// tamper-evident session token stored in an httpOnly cookie. This is the
// foundation for optional accounts (e.g. associating upload history or higher
// rate limits with a stable id) without requiring a password today.

export const SESSION_COOKIE = 'fp_session'
const MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function getSecret(): string {
  return (
    process.env.FILEPIZZA_SECRET ||
    'filepizza-dev-secret-do-not-use-in-production'
  )
}

function sign(value: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(value)
    .digest('base64url')
}

export type Session = {
  id: string
  issuedAt: number
}

export function serializeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function parseSession(token: string | undefined): Session | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = sign(payload)
  // Constant-time comparison
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null
  }
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export function createSession(): Session {
  return { id: crypto.randomUUID(), issuedAt: Date.now() }
}

export type SessionCookie = {
  name: string
  value: string
  options: {
    httpOnly: boolean
    sameSite: 'lax'
    secure: boolean
    path: string
    maxAge: number
  }
}

export function buildSessionCookie(session: Session): SessionCookie {
  return {
    name: SESSION_COOKIE,
    value: serializeSession(session),
    options: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE,
    },
  }
}
