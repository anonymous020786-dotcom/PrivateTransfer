import 'server-only'
import type { CookieJar } from './actions'

type CookieStoreLike = {
  get(name: string): { value: string } | undefined
  set(opts: {
    name: string
    value: string
    httpOnly?: boolean
    sameSite?: 'lax' | 'strict' | 'none'
    secure?: boolean
    path?: string
    maxAge?: number
  }): unknown
}

// Adapts a Next.js cookie store (next/headers `cookies()` or
// NextResponse.cookies) to the CookieJar the local auth actions use. Writes
// from Server Components throw in Next.js; those are ignored the same way the
// Supabase SSR client ignores them.
export function jarFromCookieStore(
  read: CookieStoreLike,
  write: CookieStoreLike = read,
): CookieJar {
  const pending = new Map<string, string | null>()
  const set = (name: string, value: string, maxAge: number) => {
    pending.set(name, maxAge > 0 ? value : null)
    try {
      write.set({
        name,
        value,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge,
      })
    } catch {
      // read-only context
    }
  }
  return {
    get(name) {
      if (pending.has(name)) return pending.get(name) ?? undefined
      return read.get(name)?.value
    },
    set,
    delete(name) {
      set(name, '', 0)
    },
  }
}
