import { NextRequest } from 'next/server'
import { z } from 'zod'
import { openPaste, pasteMeta } from '../../../../../lib/paste'
import { rateLimit, getClientIp } from '../../../../../rateLimit'
import { ok, err, tooManyRequests } from '../../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({ password: z.string().max(200).optional() })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  // Password guesses are limited per IP and paste.
  const rl = await rateLimit(`paste-open:${slug}:${getClientIp(req)}`, {
    limit: 20,
    windowSeconds: 600,
  })
  if (!rl.success) return tooManyRequests(rl)

  const body = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!body.success) return err('Invalid payload.')
  const r = await openPaste(slug, body.data.password)
  if (!r.ok)
    return r.reason === 'password'
      ? err('Incorrect password.', { status: 403, code: 'password' })
      : err('This paste does not exist, has expired or was already read.', {
          status: 404,
        })
  return ok({
    ...pasteMeta(r.paste),
    content: r.paste.content,
    burned: r.burned,
  })
}
