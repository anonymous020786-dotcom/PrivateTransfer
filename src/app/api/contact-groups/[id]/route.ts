import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '../../../../supabase/server'
import {
  getContactGroup,
  updateContactGroup,
  deleteContactGroup,
} from '../../../../lib/contactGroups'
import { ok, err } from '../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized.', { status: 401 })
  const group = await getContactGroup(id)
  if (!group || group.ownerId !== user.id)
    return err('Not found.', { status: 404 })
  return ok({ group })
}

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  emails: z.array(z.string().email()).min(1).max(50).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized.', { status: 401 })
  const group = await getContactGroup(id)
  if (!group || group.ownerId !== user.id)
    return err('Not found.', { status: 404 })
  const body = PatchSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')
  const patch = { ...body.data }
  if (patch.emails) patch.emails = [...new Set(patch.emails)]
  await updateContactGroup(id, patch)
  return ok({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized.', { status: 401 })
  await deleteContactGroup(id, user.id)
  return ok({ ok: true })
}
