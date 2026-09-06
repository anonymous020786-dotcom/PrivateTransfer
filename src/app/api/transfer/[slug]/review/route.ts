import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTransfer, recordReview } from '../../../../../lib/transfer'
import { rateLimit, getClientIp } from '../../../../../rateLimit'
import { err, ok } from '../../../../../lib/apiResponse'
import { sendMail } from '../../../../../email'
import { tplRecipientReview } from '../../../../../emailTemplates'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).default(''),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const ip = getClientIp(req)
  const rl = await rateLimit(`transfer-review:${ip}:${slug}`, {
    limit: 3,
    windowSeconds: 3600,
  })
  if (!rl.success) return err('Too many reviews from this IP.', { status: 429 })

  const transfer = await getTransfer(slug)
  if (!transfer || !transfer.completed)
    return err('Transfer not found.', { status: 404 })

  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')

  const country = req.headers.get('cf-ipcountry') ?? 'XX'
  await recordReview(slug, {
    rating: body.data.rating,
    comment: body.data.comment,
    at: new Date().toISOString(),
    country,
  })

  if (transfer.notifyEmail) {
    const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/transfer/${slug}`
    void sendMail({
      to: transfer.notifyEmail,
      ...tplRecipientReview({
        transferTitle: transfer.title ?? '',
        rating: body.data.rating,
        comment: body.data.comment,
        transferUrl: url,
      }),
    })
  }

  return ok({ ok: true })
}
