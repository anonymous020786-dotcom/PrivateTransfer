import 'server-only'
import crypto from 'crypto'

// Crypto primitives for the local backend: password hashing (scrypt), HMAC
// signed tokens, and RFC 6238 TOTP for two-factor authentication.

export function localSecret(): string {
  return (
    process.env.FILEPIZZA_SECRET ||
    'filepizza-dev-secret-do-not-use-in-production'
  )
}

export function hmac(value: string, purpose: string): string {
  return crypto
    .createHmac('sha256', `${purpose}:${localSecret()}`)
    .update(value)
    .digest('base64url')
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb)
}

// ── Signed tokens: base64url(JSON payload) + "." + HMAC ──────────────────────

export function signToken(payload: object, purpose: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${hmac(body, purpose)}`
}

export function verifyToken<T extends { exp?: number }>(
  token: string | undefined | null,
  purpose: string,
): T | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!safeEqual(sig, hmac(body, purpose))) return null
  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as T
    if (payload.exp && payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

// ── Passwords ────────────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, keyB64] = stored.split('$')
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false
  const expected = Buffer.from(keyB64, 'base64')
  const actual = crypto.scryptSync(
    password,
    Buffer.from(saltB64, 'base64'),
    expected.length,
  )
  return crypto.timingSafeEqual(actual, expected)
}

// ── One-time codes ───────────────────────────────────────────────────────────

export function randomDigits(n: number): string {
  let out = ''
  for (let i = 0; i < n; i++) out += crypto.randomInt(0, 10).toString()
  return out
}

export function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex')
}

// ── TOTP (RFC 6238, SHA-1, 6 digits, 30s) ────────────────────────────────────

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, '').toUpperCase().replace(/\s/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = B32.indexOf(ch)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20))
}

export function totpAt(secret: string, counter: number): string {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest()
  const offset = h[h.length - 1] & 0xf
  const code =
    (((h[offset] & 0x7f) << 24) |
      (h[offset + 1] << 16) |
      (h[offset + 2] << 8) |
      h[offset + 3]) %
    1_000_000
  return code.toString().padStart(6, '0')
}

// Accepts the current code and one step either side for clock drift.
export function verifyTotp(secret: string, code: string): boolean {
  const c = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(c)) return false
  const step = Math.floor(Date.now() / 30_000)
  return [-1, 0, 1].some((d) => safeEqual(totpAt(secret, step + d), c))
}
