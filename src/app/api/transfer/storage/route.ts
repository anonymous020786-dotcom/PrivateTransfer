import { NextResponse } from 'next/server'
import { listUserTransfers } from '../../../../lib/transfer'
import { listUserCollects } from '../../../../lib/collect'
import { getSupabaseServerClient } from '../../../../supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const [transfers, collects] = await Promise.all([
    listUserTransfers(user.id),
    listUserCollects(user.id),
  ])

  const transferBytes = transfers.reduce((s, t) => s + t.totalSize, 0)
  const transferFileCount = transfers.reduce((s, t) => s + t.files.length, 0)
  const collectBytes = collects.reduce(
    (s, c) => s + c.files.reduce((fs, f) => fs + f.size, 0),
    0,
  )
  const collectFileCount = collects.reduce((s, c) => s + c.files.length, 0)

  return NextResponse.json({
    totalBytes: transferBytes + collectBytes,
    fileCount: transferFileCount + collectFileCount,
    transferCount: transfers.length,
    collectCount: collects.length,
  })
}
