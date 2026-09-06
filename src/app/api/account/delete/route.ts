import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '../../../../supabase/server'
import { getSupabaseAdminClient } from '../../../../supabase/admin'
import { sendMailBg, notifyAdmins } from '../../../../email'
import { tplAccountDeleted, tplCriticalAlert } from '../../../../emailTemplates'

// Permanently deletes the signed-in user's account. Requires the service-role
// key (server-only). The user must be authenticated; they can only delete
// themselves.
export async function POST(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Auth not configured.' }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Account deletion is not enabled (missing service role key).' },
      { status: 503 },
    )
  }

  const email = user.email
  const meta = (user.user_metadata || {}) as {
    full_name?: string
    name?: string
  }
  const name =
    meta.full_name || meta.name || (email ? email.split('@')[0] : 'there')

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Operational notifications (best-effort).
  if (email) sendMailBg({ to: email, ...tplAccountDeleted(name) })
  notifyAdmins(
    tplCriticalAlert({
      event: 'Account deleted',
      detail: `${name} <${email || 'unknown'}> deleted their account.`,
    }),
  ).catch(() => {})

  // Clear the local session.
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
