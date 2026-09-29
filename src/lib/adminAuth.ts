import 'server-only'
import type { User } from '@supabase/supabase-js'
import { getCurrentUser } from '../supabase/server'
import { isAdminEmail, isSupabaseConfigured } from '../supabase/config'

// Resolves the signed-in super admin, or null for everyone else.
export async function getAdminUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null
  const user = await getCurrentUser()
  return user && isAdminEmail(user.email) ? user : null
}
