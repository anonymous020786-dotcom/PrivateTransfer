import { NextRequest } from 'next/server'
import {
  canDelete,
  deletePaste,
  getPaste,
  pasteMeta,
} from '../../../../lib/paste'
import { getSupabaseServerClient } from '../../../../supabase/server'
import { ok, err } from '../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string }> }

// Metadata only — reading content goes through POST /open so that
// burn-after-read notes can't be consumed by link-preview crawlers.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const p = await getPaste((await params).slug)
  if (!p)
    return err('This paste does not exist or has expired.', { status: 404 })
  return ok(pasteMeta(p))
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const p = await getPaste((await params).slug)
  if (!p) return err('Not found.', { status: 404 })
  const supabase = await getSupabaseServerClient()
  const userId = supabase
    ? ((await supabase.auth.getUser()).data.user?.id ?? null)
    : null
  const token =
    req.headers.get('x-delete-token') ?? req.nextUrl.searchParams.get('token')
  if (!canDelete(p, { token, userId }))
    return err('Forbidden.', { status: 403 })
  await deletePaste(p)
  return ok({ ok: true })
}
