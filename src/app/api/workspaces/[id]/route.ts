import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '../../../../supabase/server'
import {
  getWorkspace,
  saveWorkspace,
  deleteWorkspace,
} from '../../../../lib/workspace'

export const dynamic = 'force-dynamic'

async function requireUser() {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ?? null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await requireUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const ws = await getWorkspace(id)
  if (!ws) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const isMember = ws.members.some((m) => m.userId === user.id)
  if (!isMember)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  return NextResponse.json({ workspace: ws })
}

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await requireUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const ws = await getWorkspace(id)
  if (!ws) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const isAdmin = ws.members.some(
    (m) => m.userId === user.id && (m.role === 'owner' || m.role === 'admin'),
  )
  if (!isAdmin)
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const body = PatchSchema.safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  if (body.data.name !== undefined) ws.name = body.data.name
  if (body.data.color !== undefined) ws.color = body.data.color
  await saveWorkspace(ws)
  return NextResponse.json({ workspace: ws })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await requireUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const ws = await getWorkspace(id)
  if (!ws) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (ws.ownerId !== user.id)
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  await deleteWorkspace(id)
  return NextResponse.json({ ok: true })
}
