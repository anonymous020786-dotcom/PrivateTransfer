// Local backend mode — shared by server and browser code.
//
// When Supabase is not configured, Zync can run on a self-contained local
// backend instead: accounts, sessions, TOTP 2FA and the small tables Zync keeps
// in Postgres live in a JSON file under `.data/`, and uploaded objects live on
// local disk. It is ON by default in development and OFF in production unless
// explicitly enabled with NEXT_PUBLIC_LOCAL_BACKEND=true (single-server
// self-hosting). Setting real Supabase keys always takes precedence.

export function isRealSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

export function isLocalBackend(): boolean {
  if (isRealSupabaseConfigured()) return false
  const flag = process.env.NEXT_PUBLIC_LOCAL_BACKEND
  if (flag === 'false') return false
  return flag === 'true' || process.env.NODE_ENV !== 'production'
}

export const LOCAL_SESSION_COOKIE = 'zync_local_session'
