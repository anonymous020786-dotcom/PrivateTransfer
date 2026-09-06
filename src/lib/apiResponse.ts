import 'server-only'
import { NextResponse } from 'next/server'
import { rateLimitHeaders, type RateLimitResult } from '../rateLimit'

// ── Standardised API response helpers ────────────────────────────────────────
// All transfer API routes should use these to ensure consistent shape,
// correct status codes, and automatic rate-limit headers.

export function ok<T>(
  data: T,
  { status = 200, rl }: { status?: number; rl?: RateLimitResult } = {},
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: rl ? rateLimitHeaders(rl) : undefined,
  })
}

export function err(
  message: string,
  {
    status = 400,
    rl,
    code,
  }: { status?: number; rl?: RateLimitResult; code?: string } = {},
): NextResponse {
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    {
      status,
      headers: rl ? rateLimitHeaders(rl) : undefined,
    },
  )
}

export function tooManyRequests(rl: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down.' },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(rl),
        'Retry-After': String(rl.resetSeconds),
      },
    },
  )
}

export function unauthorized(
  message = 'Authentication required.',
): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Forbidden.'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message = 'Not found.'): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function gone(message = 'This resource has expired.'): NextResponse {
  return NextResponse.json({ error: message }, { status: 410 })
}
