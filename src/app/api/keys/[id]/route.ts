import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '../../../../supabase/server'
import { deleteApiKey, listApiKeys } from '../../../../lib/apiKeys'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  if (!supabase)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const keys = await listApiKeys(user.id)
  if (!keys.find((k) => k.id === id))
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  await deleteApiKey(user.id, id)
  return NextResponse.json({ ok: true })
}
