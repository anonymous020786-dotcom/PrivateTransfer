import 'server-only'
import fs from 'fs'
import path from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { runAuthAction, currentUser, type CookieJar } from './actions'
import { LocalQuery, SERVICE_ROLE, type Policy } from './query'
import { dataDir, type Row } from './db'
import { deleteUser, findUserById, listUsers, toPublicUser } from './auth'
import { isAdminEmail } from '../supabase/config'

// Supabase-client look-alikes backed by the local backend. They implement the
// slice of the supabase-js surface Zync uses, and are cast to SupabaseClient so
// existing call sites compile and run unchanged.

type AnyArgs = Record<string, unknown>

// Row-level policies mirroring /supabase/*.sql for a signed-in (or anonymous)
// caller. The service-role/admin client bypasses them.
function userPolicy(jar: CookieJar): Policy {
  const who = () => currentUser(jar)
  return {
    canRead(t, row) {
      if (t === 'transfers') return row.user_id === who()?.id
      if (t === 'posts')
        return row.published === true || isAdminEmail(who()?.email)
      return false
    },
    canWrite(t, row) {
      if (t === 'transfers') return !!who() && row.user_id === who()?.id
      return false
    },
  }
}

// ── Public object storage (avatars) ──────────────────────────────────────────

export const PUBLIC_FILES_ROUTE = '/api/local-storage/public'

export function publicFilePath(bucket: string, p: string): string {
  const root = path.join(dataDir(), 'public')
  const full = path.resolve(root, bucket, ...p.split('/').filter(Boolean))
  if (!full.startsWith(root + path.sep)) throw new Error('Invalid path')
  return full
}

function storageApi() {
  return {
    from(bucket: string) {
      return {
        async upload(p: string, body: Blob | Buffer) {
          try {
            const file = publicFilePath(bucket, p)
            await fs.promises.mkdir(path.dirname(file), { recursive: true })
            const buf =
              body instanceof Blob
                ? Buffer.from(await body.arrayBuffer())
                : body
            await fs.promises.writeFile(file, buf)
            return { data: { path: p }, error: null }
          } catch (e) {
            return { data: null, error: { message: (e as Error).message } }
          }
        },
        async remove(paths: string[]) {
          for (const p of paths)
            await fs.promises.rm(publicFilePath(bucket, p), { force: true })
          return { data: paths.map((name) => ({ name })), error: null }
        },
        getPublicUrl(p: string) {
          const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(
            /\/$/,
            '',
          )
          return {
            data: { publicUrl: `${site}${PUBLIC_FILES_ROUTE}/${bucket}/${p}` },
          }
        },
      }
    },
  }
}

// ── Auth facade ──────────────────────────────────────────────────────────────

function authApi(jar: CookieJar) {
  const call = (action: string, body: AnyArgs = {}) =>
    runAuthAction(action, body, jar)
  return {
    getUser: async () => {
      const r = await call('getUser')
      return { data: (r.data as AnyArgs) ?? { user: null }, error: r.error }
    },
    getSession: () => call('getSession'),
    signUp: (a: AnyArgs) => call('signUp', a),
    signInWithPassword: (a: AnyArgs) => call('signInWithPassword', a),
    signInWithOtp: (a: AnyArgs) => call('signInWithOtp', a),
    verifyOtp: (a: AnyArgs) => call('verifyOtp', a),
    resend: (a: AnyArgs) => call('resend', a),
    resetPasswordForEmail: (email: string) =>
      call('resetPasswordForEmail', { email }),
    updateUser: (a: AnyArgs) => call('updateUser', a),
    signOut: (a: AnyArgs = {}) => call('signOut', a),
    exchangeCodeForSession: async () => ({
      data: { user: null, session: null },
      error: { message: 'OAuth is not available with the local backend.' },
    }),
    mfa: {
      listFactors: () => call('mfa.listFactors'),
      enroll: (a: AnyArgs) => call('mfa.enroll', a),
      challenge: (a: AnyArgs) => call('mfa.challenge', a),
      verify: (a: AnyArgs) => call('mfa.verify', a),
      unenroll: (a: AnyArgs) => call('mfa.unenroll', a),
      getAuthenticatorAssuranceLevel: () =>
        call('mfa.getAuthenticatorAssuranceLevel'),
    },
  }
}

export function createLocalServerClient(jar: CookieJar): SupabaseClient {
  const policy = userPolicy(jar)
  return {
    auth: authApi(jar),
    from: (t: string) => new LocalQuery(t, policy),
    storage: storageApi(),
  } as unknown as SupabaseClient
}

// Service-role equivalent: no cookies, no RLS, plus auth.admin.
export function createLocalAdminClient(): SupabaseClient {
  return {
    from: (t: string) => new LocalQuery(t, SERVICE_ROLE),
    storage: storageApi(),
    auth: {
      admin: {
        async deleteUser(id: string) {
          deleteUser(id)
          return { data: {}, error: null }
        },
        async getUserById(id: string) {
          const u = findUserById(id)
          return u
            ? { data: { user: toPublicUser(u) }, error: null }
            : { data: { user: null }, error: { message: 'User not found' } }
        },
        async listUsers(opts: { page?: number; perPage?: number } = {}) {
          const per = opts.perPage ?? 50
          const page = opts.page ?? 1
          const users = listUsers()
            .slice((page - 1) * per, page * per)
            .map(toPublicUser)
          return { data: { users, total: listUsers().length }, error: null }
        },
      },
    },
  } as unknown as SupabaseClient
}

export type { Row }
