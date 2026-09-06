import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '../../../supabase/server'
import { createBoard, listUserBoards } from '../../../lib/boards'
import { ok, err } from '../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized.', { status: 401 })
  const boards = await listUserBoards(user.id)
  return ok({ boards })
}

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  color: z.string().max(50).nullable().default(null),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized.', { status: 401 })
  const body = CreateSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')
  const board = await createBoard(
    user.id,
    body.data.name,
    body.data.description,
    body.data.color,
  )
  return ok({ board }, { status: 201 })
}
