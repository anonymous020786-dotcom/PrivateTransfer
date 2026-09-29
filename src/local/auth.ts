import 'server-only'
import crypto from 'crypto'
import { getDb, persist, table, type LocalUser } from './db'
import {
  generateTotpSecret,
  hashPassword,
  randomDigits,
  sha256,
  signToken,
  verifyPassword,
  verifyToken,
  verifyTotp,
} from './crypto'
import { isAdminEmail } from '../supabase/config'

// Core of the local auth backend. Semantics follow Supabase Auth closely so the
// existing UI works unchanged: password + email-OTP sign-in, signup, recovery
// codes, profile metadata, TOTP factors and authenticator assurance levels
// (aal1 → aal2 after a TOTP challenge).

export type AuthError = { message: string; code?: string; status?: number }
export type Aal = 'aal1' | 'aal2'
export type SessionClaims = { uid: string; sv: number; aal: Aal; exp: number }

export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000
const OTP_TTL_MS = 15 * 60 * 1000
const OTP_MAX_ATTEMPTS = 5

export type PublicUser = {
  id: string
  aud: 'authenticated'
  role: 'authenticated'
  email: string
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  created_at: string
  updated_at: string
  app_metadata: { provider: 'email'; providers: ['email']; is_admin: boolean }
  user_metadata: Record<string, unknown>
  factors: Array<{
    id: string
    factor_type: 'totp'
    status: string
    friendly_name: string | null
    created_at: string
  }>
}

export function toPublicUser(u: LocalUser): PublicUser {
  return {
    id: u.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: u.email,
    email_confirmed_at: u.email_confirmed_at,
    last_sign_in_at: u.last_sign_in_at,
    created_at: u.created_at,
    updated_at: u.updated_at,
    app_metadata: {
      provider: 'email',
      providers: ['email'],
      is_admin: isAdminEmail(u.email),
    },
    user_metadata: u.user_metadata,
    factors: listFactors(u.id).map((f) => ({
      id: f.id,
      factor_type: 'totp',
      status: f.status,
      friendly_name: f.friendly_name,
      created_at: f.created_at,
    })),
  }
}

const norm = (email: string) => email.trim().toLowerCase()

export function findUserByEmail(email: string): LocalUser | undefined {
  return getDb().users.find((u) => u.email === norm(email))
}

export function findUserById(id: string): LocalUser | undefined {
  return getDb().users.find((u) => u.id === id)
}

export function listUsers(): LocalUser[] {
  return getDb().users
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export function issueSession(u: LocalUser, aal: Aal): string {
  return signToken(
    { uid: u.id, sv: u.session_version, aal, exp: Date.now() + SESSION_TTL_MS },
    'local-session',
  )
}

export function readSession(
  token: string | undefined,
): { user: LocalUser; claims: SessionClaims } | null {
  const claims = verifyToken<SessionClaims>(token, 'local-session')
  if (!claims) return null
  const user = findUserById(claims.uid)
  if (!user || user.session_version !== claims.sv) return null
  return { user, claims }
}

export function hasVerifiedFactor(uid: string): boolean {
  return listFactors(uid).some((f) => f.status === 'verified')
}

// A session is only fully authenticated once it satisfies the user's highest
// assurance level: users with 2FA must have completed a TOTP challenge.
export function isFullyAuthenticated(s: {
  user: LocalUser
  claims: SessionClaims
}): boolean {
  return s.claims.aal === 'aal2' || !hasVerifiedFactor(s.user.id)
}

export function revokeAllSessions(u: LocalUser): void {
  u.session_version += 1
  persist()
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export function createUser(
  email: string,
  password: string | null,
  metadata: Record<string, unknown> = {},
): LocalUser | AuthError {
  const e = norm(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    return { message: 'Please enter a valid email address.' }
  if (findUserByEmail(e))
    return { message: 'User already registered', code: 'user_already_exists' }
  if (password !== null && password.length < 8)
    return { message: 'Password should be at least 8 characters.' }
  const now = new Date().toISOString()
  const user: LocalUser = {
    id: crypto.randomUUID(),
    email: e,
    password_hash: password ? hashPassword(password) : null,
    user_metadata: metadata,
    created_at: now,
    updated_at: now,
    // Local mode has no mandatory inbox round-trip: accounts are confirmed on
    // creation, matching Supabase with "Confirm email" turned off.
    email_confirmed_at: now,
    last_sign_in_at: null,
    session_version: 1,
  }
  getDb().users.push(user)
  persist()
  return user
}

export function checkPassword(
  email: string,
  password: string,
): LocalUser | AuthError {
  const u = findUserByEmail(email)
  if (!u?.password_hash || !verifyPassword(password, u.password_hash))
    return { message: 'Invalid login credentials', code: 'invalid_credentials' }
  return u
}

export function markSignedIn(u: LocalUser): void {
  u.last_sign_in_at = new Date().toISOString()
  persist()
}

export function updateUser(
  u: LocalUser,
  attrs: { email?: string; password?: string; data?: Record<string, unknown> },
): AuthError | null {
  if (attrs.password !== undefined) {
    if (attrs.password.length < 8)
      return { message: 'Password should be at least 8 characters.' }
    u.password_hash = hashPassword(attrs.password)
  }
  if (attrs.email && norm(attrs.email) !== u.email) {
    if (findUserByEmail(attrs.email))
      return {
        message: 'A user with this email address has already been registered',
      }
    u.email = norm(attrs.email)
  }
  if (attrs.data) {
    const merged = { ...u.user_metadata }
    for (const [k, v] of Object.entries(attrs.data)) {
      if (v === null || v === undefined) delete merged[k]
      else merged[k] = v
    }
    u.user_metadata = merged
  }
  u.updated_at = new Date().toISOString()
  persist()
  return null
}

export function deleteUser(id: string): void {
  const db = getDb()
  db.users = db.users.filter((u) => u.id !== id)
  db.factors = db.factors.filter((f) => f.user_id !== id)
  const transfers = table('transfers')
  for (let i = transfers.length - 1; i >= 0; i--)
    if (transfers[i].user_id === id) transfers.splice(i, 1)
  persist()
}

// ── One-time codes (email sign-in, signup confirmation, recovery) ────────────

export function issueOtp(email: string, type: string): string {
  const db = getDb()
  const e = norm(email)
  const code = randomDigits(8)
  db.otps = db.otps.filter(
    (o) => !(o.email === e && o.type === type) && o.expires_at > Date.now(),
  )
  db.otps.push({
    email: e,
    type: type as never,
    code_hash: sha256(`${e}:${code}`),
    expires_at: Date.now() + OTP_TTL_MS,
    attempts: 0,
  })
  persist()
  return code
}

export function consumeOtp(
  email: string,
  type: string,
  code: string,
): AuthError | null {
  const db = getDb()
  const e = norm(email)
  // Supabase treats "email", "magiclink" and "signup" codes interchangeably
  // for the verifyOtp(type: 'email') call.
  const types = type === 'email' ? ['email', 'magiclink', 'signup'] : [type]
  const otp = db.otps.find(
    (o) => o.email === e && types.includes(o.type) && o.expires_at > Date.now(),
  )
  if (!otp)
    return { message: 'Token has expired or is invalid', code: 'otp_expired' }
  otp.attempts += 1
  if (otp.code_hash !== sha256(`${e}:${code.trim()}`)) {
    if (otp.attempts >= OTP_MAX_ATTEMPTS)
      db.otps.splice(db.otps.indexOf(otp), 1)
    persist()
    return { message: 'Token has expired or is invalid', code: 'otp_expired' }
  }
  db.otps.splice(db.otps.indexOf(otp), 1)
  persist()
  return null
}

// ── TOTP factors ─────────────────────────────────────────────────────────────

export function listFactors(uid: string) {
  return getDb().factors.filter((f) => f.user_id === uid)
}

export function enrollFactor(uid: string, friendlyName?: string) {
  const db = getDb()
  // Drop abandoned enrollments so they don't pile up.
  db.factors = db.factors.filter(
    (f) => !(f.user_id === uid && f.status === 'unverified'),
  )
  const now = new Date().toISOString()
  const factor = {
    id: crypto.randomUUID(),
    user_id: uid,
    secret: generateTotpSecret(),
    friendly_name: friendlyName ?? null,
    status: 'unverified' as const,
    created_at: now,
    updated_at: now,
  }
  db.factors.push(factor)
  persist()
  return factor
}

export function verifyFactor(
  uid: string,
  factorId: string,
  code: string,
): AuthError | null {
  const f = listFactors(uid).find((x) => x.id === factorId)
  if (!f) return { message: 'Factor not found', code: 'mfa_factor_not_found' }
  if (!verifyTotp(f.secret, code))
    return {
      message: 'Invalid TOTP code entered',
      code: 'mfa_verification_failed',
    }
  if (f.status !== 'verified') {
    f.status = 'verified'
    f.updated_at = new Date().toISOString()
    persist()
  }
  return null
}

export function unenrollFactor(
  uid: string,
  factorId: string,
): AuthError | null {
  const db = getDb()
  const before = db.factors.length
  db.factors = db.factors.filter(
    (f) => !(f.user_id === uid && f.id === factorId),
  )
  if (db.factors.length === before)
    return { message: 'Factor not found', code: 'mfa_factor_not_found' }
  persist()
  return null
}
