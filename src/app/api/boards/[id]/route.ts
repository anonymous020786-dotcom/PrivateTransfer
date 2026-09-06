import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '../../../../supabase/server'
import {
  getBoard,
  updateBoard,
  deleteBoard,
  addTransferToBoard,
  removeTransferFromBoard,
} from '../../../../lib/boards'
import { ok, err } from '../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized.', { status: 401 })
  const board = await getBoard(id)
  if (!board || board.ownerId !== user.id)
    return err('Not found.', { status: 404 })
  return ok({ board })
}

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().max(50).nullable().optional(),
  addSlug: z.string().max(120).optional(),
  removeSlug: z.string().max(120).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized.', { status: 401 })
  const body = PatchSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')

  const { addSlug, removeSlug, ...rest } = body.data
  if (
    Object.keys(rest).some((k) => rest[k as keyof typeof rest] !== undefined)
  ) {
    await updateBoard(id, rest)
  }
  if (addSlug) await addTransferToBoard(id, addSlug, user.id)
  if (removeSlug) await removeTransferFromBoard(id, removeSlug, user.id)

  return ok({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized.', { status: 401 })
  await deleteBoard(id, user.id)
  return ok({ ok: true })
}
