import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTransfer } from '../../../../../lib/transfer'
import { rateLimit, getClientIp } from '../../../../../rateLimit'
import { sendMail } from '../../../../../email'
import { ok, err, tooManyRequests } from '../../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  email: z.string().email().max(200),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const ip = getClientIp(req)
  const rl = await rateLimit(`resend-req:${ip}:${slug}`, {
    limit: 3,
    windowSeconds: 3600,
  })
  if (!rl.success) return tooManyRequests(rl)

  const transfer = await getTransfer(slug)
  if (!transfer) return err('Transfer not found.', { status: 404 })

  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')

  if (transfer.notifyEmail) {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
    void sendMail({
      to: transfer.notifyEmail,
      subject: `Someone wants you to re-send your transfer`,
      text: `${body.data.email} tried to access your transfer${transfer.title ? ` "${transfer.title}"` : ''} but it has expired. They would like you to re-send the files.\n\nYou can create a new transfer at: ${base}/transfer`,
      html: `<p>${body.data.email} tried to access your expired transfer${transfer.title ? ` "<strong>${transfer.title}</strong>"` : ''} and would like you to re-send the files.</p><p><a href="${base}/transfer">Create a new transfer</a></p>`,
    })
  }

  return ok({ ok: true })
}
