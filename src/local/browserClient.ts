'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

// Browser-side stand-in for the Supabase client when the local backend is
// active. Every auth call is forwarded to /api/local-auth/<action>, which owns
// the httpOnly session cookie; listeners registered via onAuthStateChange are
// notified after calls that change the session.

type Result = {
  data: unknown
  error: { message: string; code?: string } | null
}
type Listener = (event: string, session: unknown) => void

const listeners = new Set<Listener>()

const SESSION_EVENTS: Record<string, string> = {
  signUp: 'SIGNED_IN',
  signInWithPassword: 'SIGNED_IN',
  verifyOtp: 'SIGNED_IN',
  'mfa.verify': 'MFA_CHALLENGE_VERIFIED',
  updateUser: 'USER_UPDATED',
  signOut: 'SIGNED_OUT',
}

async function call(action: string, body: object = {}): Promise<Result> {
  try {
    const res = await fetch(`/api/local-auth/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as Result
    const event = SESSION_EVENTS[action]
    if (event && !json.error) {
      const session =
        (json.data as { session?: unknown } | null)?.session ?? json.data
      for (const l of listeners)
        l(event, event === 'SIGNED_OUT' ? null : session)
    }
    return json
  } catch {
    return {
      data: null,
      error: { message: 'Network error — please try again.' },
    }
  }
}

export function createLocalBrowserClient(): SupabaseClient {
  const auth = {
    getUser: async () => {
      const r = await call('getUser')
      return { data: (r.data as object) ?? { user: null }, error: r.error }
    },
    getSession: () => call('getSession'),
    signUp: (a: object) => call('signUp', a),
    signInWithPassword: (a: object) => call('signInWithPassword', a),
    signInWithOtp: (a: object) => call('signInWithOtp', a),
    verifyOtp: (a: object) => call('verifyOtp', a),
    resend: (a: object) => call('resend', a),
    resetPasswordForEmail: (email: string) =>
      call('resetPasswordForEmail', { email }),
    updateUser: (a: object) => call('updateUser', a),
    signOut: (a: object = {}) => call('signOut', a),
    signInWithOAuth: async () => ({
      data: { provider: null, url: null },
      error: {
        message:
          'Social sign-in needs Supabase. Use email and password with the local backend.',
      },
    }),
    onAuthStateChange(cb: Listener) {
      listeners.add(cb)
      // Match supabase-js: emit INITIAL_SESSION asynchronously.
      void call('getSession').then((r) =>
        cb(
          'INITIAL_SESSION',
          (r.data as { session?: unknown })?.session ?? null,
        ),
      )
      return {
        data: {
          subscription: {
            id: 'local',
            unsubscribe: () => listeners.delete(cb),
          },
        },
      }
    },
    mfa: {
      listFactors: () => call('mfa.listFactors'),
      enroll: (a: object) => call('mfa.enroll', a),
      challenge: (a: object) => call('mfa.challenge', a),
      verify: (a: object) => call('mfa.verify', a),
      unenroll: (a: object) => call('mfa.unenroll', a),
      getAuthenticatorAssuranceLevel: () =>
        call('mfa.getAuthenticatorAssuranceLevel'),
    },
  }
  return { auth } as unknown as SupabaseClient
}
