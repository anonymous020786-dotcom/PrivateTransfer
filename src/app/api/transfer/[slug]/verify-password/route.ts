import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTransfer, hashPassword } from '../../../../../lib/transfer'
import { rateLimit, getClientIp } from '../../../../../rateLimit'
import { tooManyRequests, ok, err } from '../../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({ password: z.string().min(1).max(200) })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params

  // Strict brute-force protection: 5 attempts per 10 min per IP+slug
  const ip = getClientIp(req)
  const rl = await rateLimit(`verify-pw:${ip}:${slug}`, {
    limit: 5,
    windowSeconds: 600,
  })
  if (!rl.success) return tooManyRequests(rl)

  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')

  const transfer = await getTransfer(slug)
  if (!transfer || !transfer.completed || !transfer.passwordHash)
    return err('Not found.', { status: 404 })

  const valid = hashPassword(body.data.password) === transfer.passwordHash

  // On failure: return the same response shape regardless (no oracle for slug existence)
  return ok({ valid }, { rl })
}
