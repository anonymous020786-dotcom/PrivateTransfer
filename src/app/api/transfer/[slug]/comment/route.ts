import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTransfer, recordComment } from '../../../../../lib/transfer'
import { rateLimit, getClientIp } from '../../../../../rateLimit'
import { ok, err, tooManyRequests } from '../../../../../lib/apiResponse'
import { sendMail } from '../../../../../email'
import { tplRecipientComment } from '../../../../../emailTemplates'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  text: z.string().min(1).max(1000),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const ip = getClientIp(req)
  const rl = await rateLimit(`comment:${ip}:${slug}`, {
    limit: 5,
    windowSeconds: 3600,
  })
  if (!rl.success) return tooManyRequests(rl)

  const transfer = await getTransfer(slug)
  if (!transfer) return err('Transfer not found.', { status: 404 })

  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')

  const country = (
    req.headers.get('cf-ipcountry') ??
    req.headers.get('x-vercel-ip-country') ??
    'XX'
  )
    .slice(0, 2)
    .toUpperCase()

  await recordComment(slug, {
    text: body.data.text,
    at: new Date().toISOString(),
    country,
  })

  if (transfer.notifyEmail) {
    const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/transfer/${slug}`
    void sendMail({
      to: transfer.notifyEmail,
      ...tplRecipientComment({
        transferTitle: transfer.title ?? '',
        commentText: body.data.text,
        transferUrl: url,
      }),
    })
  }

  return ok({ ok: true })
}
