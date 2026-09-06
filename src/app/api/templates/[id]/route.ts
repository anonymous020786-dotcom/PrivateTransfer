import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '../../../../supabase/server'
import { deleteTemplate, listTemplates } from '../../../../lib/templates'

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

  // Verify ownership via list (avoids needing a separate get)
  const templates = await listTemplates(user.id)
  if (!templates.find((t) => t.id === id))
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  await deleteTemplate(user.id, id)
  return NextResponse.json({ ok: true })
}
