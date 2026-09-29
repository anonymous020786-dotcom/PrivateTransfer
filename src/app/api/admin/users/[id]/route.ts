import { NextRequest } from 'next/server'
import { getAdminUser } from '../../../../../lib/adminAuth'
import { getSupabaseAdminClient } from '../../../../../supabase/admin'
import { purgeUserData } from '../../../../../lib/accountPurge'
import { isLocalBackend } from '../../../../../local/mode'
import { findUserById, revokeAllSessions } from '../../../../../local/auth'
import { ok, err } from '../../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// Delete an account together with all of its data and stored files.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const me = await getAdminUser()
  if (!me) return err('Forbidden.', { status: 403 })
  const { id } = await params
  if (id === me.id) return err('You cannot delete your own account here.')
  const admin = getSupabaseAdminClient()
  if (!admin)
    return err('Service-role access is not configured.', { status: 503 })

  const purged = await purgeUserData(id)
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return err(error.message, { status: 500 })
  return ok({ ok: true, purged })
}

// Force sign-out of every session (local backend; Supabase manages its own
// refresh tokens and has no per-user revoke in the admin API).
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!(await getAdminUser())) return err('Forbidden.', { status: 403 })
  if (req.nextUrl.searchParams.get('action') !== 'signout')
    return err('Unknown action.')
  if (!isLocalBackend())
    return err('Force sign-out is only available with the local backend.', {
      status: 501,
    })
  const u = findUserById((await params).id)
  if (!u) return err('Not found.', { status: 404 })
  revokeAllSessions(u)
  return ok({ ok: true })
}
