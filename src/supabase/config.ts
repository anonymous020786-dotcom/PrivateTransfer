import { isLocalBackend, isRealSupabaseConfigured } from '../local/mode'

// Supabase configuration helpers. The whole auth/storage stack is optional:
// when env vars are absent the local backend (src/local) stands in for it in
// development / self-hosted mode; with neither available,
// isSupabaseConfigured() is false and the UI shows a friendly "not configured"
// state instead of crashing.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// Server-only. Required for privileged actions like deleting a user account.
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// True when accounts are available — via real Supabase or the local backend.
export function isSupabaseConfigured(): boolean {
  return isRealSupabaseConfigured() || isLocalBackend()
}

export { isLocalBackend, isRealSupabaseConfigured }

// Comma-separated list of super-admin emails, e.g. "you@x.com,ops@x.com".
export function getAdminEmails(): string[] {
  const configured = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (configured.length) return configured
  // Local backend with no ADMIN_EMAILS: the first registered account is the
  // owner/admin (published by src/local/db.ts on the server only).
  const local = (globalThis as { __zyncLocalOwnerEmail?: string })
    .__zyncLocalOwnerEmail
  return local ? [local] : []
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.toLowerCase())
}

export const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET || 'avatars'
