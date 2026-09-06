import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '../../../supabase/server'
import {
  getCustomDomain,
  setCustomDomain,
  deleteCustomDomain,
} from '../../../lib/customDomain'

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
  const record = await getCustomDomain(user.id)
  return NextResponse.json({ domain: record })
}

const PutSchema = z.object({
  domain: z
    .string()
    .min(3)
    .max(253)
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      'Invalid domain format',
    ),
})

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = PutSchema.safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? 'Invalid domain.' },
      { status: 400 },
    )

  const record = await setCustomDomain(user.id, body.data.domain)
  return NextResponse.json({ domain: record })
}

export async function DELETE(): Promise<NextResponse> {
  const user = await requireUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await deleteCustomDomain(user.id)
  return NextResponse.json({ ok: true })
}
