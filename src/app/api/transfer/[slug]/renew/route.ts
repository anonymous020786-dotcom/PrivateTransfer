import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTransfer, renewTransfer } from '../../../../../lib/transfer'
import { getCurrentUser } from '../../../../../supabase/server'
import { ok, err } from '../../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  addDays: z.number().int().min(1).max(365),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized.', { status: 401 })

  const transfer = await getTransfer(slug)
  if (!transfer) return err('Transfer not found.', { status: 404 })
  if (transfer.ownerId !== user.id) return err('Forbidden.', { status: 403 })

  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')

  const newExpiry = await renewTransfer(slug, body.data.addDays)
  if (!newExpiry) return err('Failed to renew transfer.', { status: 500 })

  return ok({ expiresAt: newExpiry })
}
