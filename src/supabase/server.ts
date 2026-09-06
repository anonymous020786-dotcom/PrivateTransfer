import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './config'

// Server-side Supabase client bound to the request cookie store. Returns null
// when Supabase isn't configured.
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component — safe to ignore; middleware/route
          // handlers refresh the session cookie.
        }
      },
    },
  })
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// Gate a protected tool/page. When Supabase auth is configured, an
// unauthenticated visitor is redirected to /login?next=<path>. When auth is not
// configured the page renders (nothing to enforce against yet).
export async function requireUserOrRedirect(
  next: string,
): Promise<User | null> {
  if (!isSupabaseConfigured()) return null
  const user = await getCurrentUser()
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }
  return user
}
