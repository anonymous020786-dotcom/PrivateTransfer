import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '../../../../../../supabase/server'
import { getWorkspace, removeMember } from '../../../../../../lib/workspace'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, userId } = await params
  const ws = await getWorkspace(id)
  if (!ws) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const isAdmin = ws.members.some(
    (m) => m.userId === user.id && (m.role === 'owner' || m.role === 'admin'),
  )
  const isSelf = user.id === userId

  if (!isAdmin && !isSelf)
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  if (userId === ws.ownerId)
    return NextResponse.json(
      { error: 'Cannot remove the workspace owner.' },
      { status: 400 },
    )

  await removeMember(id, userId)
  return NextResponse.json({ ok: true })
}
