import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '../../../supabase/server'
import { createWorkspace, listUserWorkspaces } from '../../../lib/workspace'

export const dynamic = 'force-dynamic'

async function requireUser() {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ?? null
}

export async function GET(): Promise<NextResponse> {
  const user = await requireUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const workspaces = await listUserWorkspaces(user.id)
  return NextResponse.json({ workspaces, userId: user.id })
}

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = CreateSchema.safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const existing = await listUserWorkspaces(user.id)
  if (existing.length >= 10)
    return NextResponse.json(
      { error: 'Maximum 10 workspaces.' },
      { status: 429 },
    )

  const ws = await createWorkspace(
    user.id,
    user.email ?? '',
    body.data.name,
    body.data.color,
  )
  return NextResponse.json({ workspace: ws })
}
