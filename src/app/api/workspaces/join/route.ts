import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '../../../../supabase/server'
import { acceptInvite } from '../../../../lib/workspace'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({ token: z.string().min(1) })

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const ws = await acceptInvite(body.data.token, user.id, user.email ?? '')
  if (!ws)
    return NextResponse.json(
      { error: 'Invite not found or expired.' },
      { status: 404 },
    )

  return NextResponse.json({ ok: true, workspace: ws })
}
