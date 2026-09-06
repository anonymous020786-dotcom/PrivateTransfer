import 'server-only'
import { isFeatureEnabled } from './lib/appSettings'

// Google reCAPTCHA v3 server-side verification. If no secret is configured,
// or if the feature_recaptcha flag is off, the check is skipped (returns ok).
export async function verifyRecaptcha(
  token: string | undefined,
  { minScore = 0.5 }: { minScore?: number } = {},
): Promise<{ ok: boolean; score?: number; reason?: string }> {
  const enabled = await isFeatureEnabled('feature_recaptcha', true)
  if (!enabled) return { ok: true, reason: 'disabled' }

  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) return { ok: true, reason: 'not_configured' }
  if (!token) return { ok: false, reason: 'missing_token' }

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    })
    const data = (await res.json()) as {
      success: boolean
      score?: number
      'error-codes'?: string[]
    }
    if (!data.success) return { ok: false, reason: 'failed', score: data.score }
    if (typeof data.score === 'number' && data.score < minScore) {
      return { ok: false, score: data.score, reason: 'low_score' }
    }
    return { ok: true, score: data.score }
  } catch {
    return { ok: false, reason: 'verify_error' }
  }
}
