import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '../../../../supabase/server'
import {
  getCustomDomain,
  verifyDomainDns,
  markDomainVerified,
} from '../../../../lib/customDomain'

export const dynamic = 'force-dynamic'

export async function POST(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const record = await getCustomDomain(user.id)
  if (!record)
    return NextResponse.json(
      { error: 'No custom domain configured.' },
      { status: 404 },
    )
  if (record.verified)
    return NextResponse.json({ domain: record, alreadyVerified: true })

  const ok = await verifyDomainDns(record)
  if (ok) {
    await markDomainVerified(user.id)
    const updated = await getCustomDomain(user.id)
    return NextResponse.json({ domain: updated, verified: true })
  }
  return NextResponse.json({ domain: record, verified: false })
}
