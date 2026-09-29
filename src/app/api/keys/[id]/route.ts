import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '../../../../supabase/server'
import { deleteApiKey, listApiKeys } from '../../../../lib/apiKeys'
import { recordActivity, requestContext } from '../../../../lib/activity'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
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
  const key = keys.find((k) => k.id === id)
  if (!key) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  await deleteApiKey(user.id, id)
  void recordActivity(user.id, 'apikey.revoked', {
    ...requestContext(req),
    detail: key.name,
  })
  return NextResponse.json({ ok: true })
}
