// Supabase configuration helpers. The whole auth/storage stack is optional:
// when env vars are absent, isSupabaseConfigured() is false and the UI shows a
// friendly "not configured" state instead of crashing.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// Server-only. Required for privileged actions like deleting a user account.
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

// Comma-separated list of super-admin emails, e.g. "you@x.com,ops@x.com".
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.toLowerCase())
}

export const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET || 'avatars'
