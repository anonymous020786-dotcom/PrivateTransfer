import 'server-only'
import {
  checkPassword,
  consumeOtp,
  createUser,
  enrollFactor,
  findUserByEmail,
  hasVerifiedFactor,
  isFullyAuthenticated,
  issueOtp,
  issueSession,
  listFactors,
  markSignedIn,
  readSession,
  revokeAllSessions,
  SESSION_TTL_MS,
  toPublicUser,
  unenrollFactor,
  updateUser,
  verifyFactor,
  type AuthError,
  type PublicUser,
} from './auth'
import { signToken, verifyToken } from './crypto'
import { LOCAL_SESSION_COOKIE } from './mode'
import type { LocalUser } from './db'
import { sendMail } from '../email'
import { tplVerificationCode } from '../emailTemplates'
import { brand } from '../brand'
import { recordActivity, type ActivityType } from '../lib/activity'

// Supabase-auth-shaped operations over the local backend. Used directly by the
// server-side client shim and, through /api/local-auth, by the browser shim.

export type CookieJar = {
  get(name: string): string | undefined
  set(name: string, value: string, maxAgeSeconds: number): void
  delete(name: string): void
}

export type ActionResult = { data: unknown; error: AuthError | null }

const ok = (data: unknown): ActionResult => ({ data, error: null })
const fail = (message: string, code?: string, status = 400): ActionResult => ({
  data: null,
  error: { message, code, status },
})

function sessionPayload(u: LocalUser, token: string, aal: 'aal1' | 'aal2') {
  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: SESSION_TTL_MS / 1000,
    expires_at: Math.floor((Date.now() + SESSION_TTL_MS) / 1000),
    aal,
    user: toPublicUser(u),
  }
}

function startSession(jar: CookieJar, u: LocalUser, aal: 'aal1' | 'aal2') {
  const token = issueSession(u, aal)
  jar.set(LOCAL_SESSION_COOKIE, token, SESSION_TTL_MS / 1000)
  markSignedIn(u)
  return sessionPayload(u, token, aal)
}

async function deliverCode(
  email: string,
  code: string,
  purpose: Parameters<typeof tplVerificationCode>[0]['purpose'],
): Promise<void> {
  const res = await sendMail({
    to: email,
    ...tplVerificationCode({ code, purpose }),
  })
  if (!res.success) {
    // No SMTP configured: surface the code in the server log so local
    // development and single-box installs remain usable.
    console.info(
      `\n[local-auth] ${brand.name} code for ${email} (${purpose}): ${code}\n`,
    )
  }
}

export function currentSession(jar: CookieJar) {
  return readSession(jar.get(LOCAL_SESSION_COOKIE))
}

// The user object the app sees. Sessions stuck at aal1 for a 2FA-enabled
// account are not treated as signed in until the TOTP challenge is passed.
export function currentUser(jar: CookieJar): PublicUser | null {
  const s = currentSession(jar)
  if (!s || !isFullyAuthenticated(s)) return null
  return toPublicUser(s.user)
}

type Body = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : '')

export type RequestCtx = { ip?: string | null; agent?: string | null }

export async function runAuthAction(
  action: string,
  body: Body,
  jar: CookieJar,
  ctx: RequestCtx = {},
): Promise<ActionResult> {
  const audit = (uid: string, type: ActivityType, detail?: string) =>
    void recordActivity(uid, type, { ...ctx, detail })

  switch (action) {
    case 'getUser': {
      const user = currentUser(jar)
      return user
        ? ok({ user })
        : {
            data: { user: null },
            error: { message: 'Auth session missing!', status: 401 },
          }
    }

    case 'getSession': {
      const s = currentSession(jar)
      if (!s || !isFullyAuthenticated(s)) return ok({ session: null })
      return ok({
        session: sessionPayload(
          s.user,
          jar.get(LOCAL_SESSION_COOKIE)!,
          s.claims.aal,
        ),
      })
    }

    case 'signUp': {
      const options = (body.options ?? {}) as { data?: Record<string, unknown> }
      const created = createUser(
        str(body.email),
        str(body.password),
        options.data ?? {},
      )
      if ('message' in created) return fail(created.message, created.code, 422)
      audit(created.id, 'auth.signup')
      return ok({
        user: toPublicUser(created),
        session: startSession(jar, created, 'aal1'),
      })
    }

    case 'signInWithPassword': {
      const u = checkPassword(str(body.email), str(body.password))
      if ('message' in u) {
        const known = findUserByEmail(str(body.email))
        if (known) audit(known.id, 'auth.signin_failed', 'Wrong password')
        return fail(u.message, u.code, 400)
      }
      audit(u.id, 'auth.signin', 'Password')
      return ok({
        user: toPublicUser(u),
        session: startSession(jar, u, 'aal1'),
      })
    }

    case 'signInWithOtp': {
      const email = str(body.email)
      const options = (body.options ?? {}) as {
        shouldCreateUser?: boolean
        data?: Record<string, unknown>
      }
      let u = findUserByEmail(email)
      if (!u) {
        if (options.shouldCreateUser === false)
          return fail('Signups not allowed for otp', 'otp_disabled', 422)
        const created = createUser(email, null, options.data ?? {})
        if ('message' in created)
          return fail(created.message, created.code, 422)
        u = created
      }
      await deliverCode(u.email, issueOtp(u.email, 'email'), 'sign in')
      return ok({ user: null, session: null })
    }

    case 'resend': {
      const email = str(body.email)
      const type = str(body.type) || 'signup'
      if (findUserByEmail(email))
        await deliverCode(
          email,
          issueOtp(email, type),
          type === 'recovery' ? 'reset your password' : 'confirm your account',
        )
      return ok({ user: null, session: null })
    }

    case 'resetPasswordForEmail': {
      const email = str(body.email)
      // Always succeed so the response can't be used to enumerate accounts.
      if (findUserByEmail(email))
        await deliverCode(
          email,
          issueOtp(email, 'recovery'),
          'reset your password',
        )
      return ok({})
    }

    case 'verifyOtp': {
      const email = str(body.email)
      const type = str(body.type) || 'email'
      const e = consumeOtp(email, type, str(body.token))
      if (e) return fail(e.message, e.code, 403)
      const u = findUserByEmail(email)
      if (!u) return fail('User not found', 'user_not_found', 404)
      audit(
        u.id,
        type === 'recovery' ? 'auth.password_reset' : 'auth.email_code_signin',
      )
      return ok({
        user: toPublicUser(u),
        session: startSession(jar, u, 'aal1'),
      })
    }

    case 'signOut': {
      const s = currentSession(jar)
      if (s)
        audit(
          s.user.id,
          body.scope === 'others' ? 'auth.signout_others' : 'auth.signout',
        )
      if (s && (body.scope === 'global' || body.scope === 'others'))
        revokeAllSessions(s.user)
      if (body.scope === 'others' && s) startSession(jar, s.user, s.claims.aal)
      else jar.delete(LOCAL_SESSION_COOKIE)
      return ok({})
    }

    case 'updateUser': {
      const s = currentSession(jar)
      if (!s || !isFullyAuthenticated(s))
        return fail('Auth session missing!', 'session_not_found', 401)
      const e = updateUser(s.user, {
        email: body.email as string | undefined,
        password: body.password as string | undefined,
        data: body.data as Record<string, unknown> | undefined,
      })
      if (e) return fail(e.message, e.code, 422)
      if (body.password !== undefined) {
        audit(s.user.id, 'auth.password_changed')
        // A password change signs out every other session.
        revokeAllSessions(s.user)
        startSession(jar, s.user, s.claims.aal)
      }
      if (body.data !== undefined || body.email !== undefined)
        audit(s.user.id, 'profile.updated')
      return ok({ user: toPublicUser(s.user) })
    }

    // ── MFA ───────────────────────────────────────────────────────────────
    // These accept an aal1 session (so the sign-in challenge can complete).

    case 'mfa.listFactors': {
      const s = currentSession(jar)
      if (!s) return fail('Auth session missing!', 'session_not_found', 401)
      const all = toPublicUser(s.user).factors
      return ok({
        all,
        totp: all.filter((f) => f.status === 'verified'),
        phone: [],
      })
    }

    case 'mfa.getAuthenticatorAssuranceLevel': {
      const s = currentSession(jar)
      if (!s)
        return ok({
          currentLevel: null,
          nextLevel: null,
          currentAuthenticationMethods: [],
        })
      return ok({
        currentLevel: s.claims.aal,
        nextLevel: hasVerifiedFactor(s.user.id) ? 'aal2' : 'aal1',
        currentAuthenticationMethods: [],
      })
    }

    case 'mfa.enroll': {
      const s = currentSession(jar)
      if (!s || !isFullyAuthenticated(s))
        return fail('Auth session missing!', 'session_not_found', 401)
      const f = enrollFactor(s.user.id, str(body.friendlyName) || undefined)
      const issuer = encodeURIComponent(brand.name)
      const uri = `otpauth://totp/${issuer}:${encodeURIComponent(s.user.email)}?secret=${f.secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
      const QR = (await import('qrcode')).default
      const svg = await QR.toString(uri, { type: 'svg', margin: 1 })
      return ok({
        id: f.id,
        type: 'totp',
        friendly_name: f.friendly_name,
        totp: {
          qr_code: `data:image/svg+xml;utf-8,${encodeURIComponent(svg)}`,
          secret: f.secret,
          uri,
        },
      })
    }

    case 'mfa.challenge': {
      const s = currentSession(jar)
      if (!s) return fail('Auth session missing!', 'session_not_found', 401)
      const factorId = str(body.factorId)
      if (!listFactors(s.user.id).some((f) => f.id === factorId))
        return fail('Factor not found', 'mfa_factor_not_found', 404)
      const id = signToken(
        { uid: s.user.id, factorId, exp: Date.now() + 5 * 60_000 },
        'mfa-challenge',
      )
      return ok({
        id,
        type: 'totp',
        expires_at: Math.floor(Date.now() / 1000) + 300,
      })
    }

    case 'mfa.verify': {
      const s = currentSession(jar)
      if (!s) return fail('Auth session missing!', 'session_not_found', 401)
      const ch = verifyToken<{ uid: string; factorId: string; exp: number }>(
        str(body.challengeId),
        'mfa-challenge',
      )
      if (!ch || ch.uid !== s.user.id || ch.factorId !== str(body.factorId))
        return fail(
          'Challenge expired or invalid',
          'mfa_challenge_expired',
          422,
        )
      const wasVerified = listFactors(s.user.id).some(
        (f) => f.id === ch.factorId && f.status === 'verified',
      )
      const e = verifyFactor(s.user.id, ch.factorId, str(body.code))
      if (e) {
        audit(s.user.id, 'auth.signin_failed', 'Wrong 2FA code')
        return fail(e.message, e.code, 422)
      }
      audit(
        s.user.id,
        wasVerified ? 'auth.mfa_challenge_passed' : 'auth.mfa_enabled',
      )
      return ok(startSession(jar, s.user, 'aal2'))
    }

    case 'mfa.unenroll': {
      const s = currentSession(jar)
      if (!s || !isFullyAuthenticated(s))
        return fail('Auth session missing!', 'session_not_found', 401)
      const e = unenrollFactor(s.user.id, str(body.factorId))
      if (e) return fail(e.message, e.code, 404)
      audit(s.user.id, 'auth.mfa_disabled')
      return ok({ id: str(body.factorId) })
    }

    default:
      return fail(`Unsupported auth action: ${action}`, 'not_supported', 400)
  }
}
