import { NextRequest } from 'next/server'
import { getAdminUser } from '../../../../lib/adminAuth'
import { getSupabaseAdminClient } from '../../../../supabase/admin'
import { isAdminEmail } from '../../../../supabase/config'
import { listUserTransfers } from '../../../../lib/transfer'
import { ok, err } from '../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

type AdminUser = {
  id: string
  email?: string
  created_at: string
  last_sign_in_at?: string | null
  user_metadata?: Record<string, unknown>
  factors?: Array<{ status: string }>
}

// Paged, searchable user directory for super admins.
export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return err('Forbidden.', { status: 403 })
  const admin = getSupabaseAdminClient()
  if (!admin)
    return err('Service-role access is not configured.', { status: 503 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase()
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1)
  const perPage = 50

  // Supabase has no server-side email search, so search scans up to 1000 users.
  const { data, error } = await admin.auth.admin.listUsers(
    q ? { page: 1, perPage: 1000 } : { page, perPage },
  )
  if (error) return err(error.message, { status: 500 })
  let users = (data.users ?? []) as AdminUser[]
  if (q)
    users = users
      .filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          String(u.user_metadata?.full_name ?? '')
            .toLowerCase()
            .includes(q),
      )
      .slice(0, perPage)

  const rows = await Promise.all(
    users.map(async (u) => {
      const transfers = await listUserTransfers(u.id).catch(
        () => [] as Awaited<ReturnType<typeof listUserTransfers>>,
      )
      return {
        id: u.id,
        email: u.email ?? '',
        name: String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? ''),
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        mfa: (u.factors ?? []).some((f) => f.status === 'verified'),
        admin: isAdminEmail(u.email),
        transfers: transfers.length,
        storageBytes: transfers.reduce((s, t) => s + t.totalSize, 0),
      }
    }),
  )
  const total = (data as { total?: number }).total ?? null
  return ok({ users: rows, page, perPage, total })
}
