'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './config'
import { isLocalBackend } from '../local/mode'
import { createLocalBrowserClient } from '../local/browserClient'

// Browser-side Supabase client. Returns null when Supabase isn't configured so
// callers can branch instead of throwing.
let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!browserClient && isLocalBackend()) {
    browserClient = createLocalBrowserClient()
  }
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { flowType: 'implicit' },
    })
  }
  return browserClient
}
