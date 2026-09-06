import { NextRequest, NextResponse } from 'next/server'
import { getTransfer } from '../../../../../../lib/transfer'
import { getSupabaseServerClient } from '../../../../../../supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const transfer = await getTransfer(slug)
  if (!transfer || !transfer.completed) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  if (!transfer.ownerId || transfer.ownerId !== user?.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const rows: string[] = ['type,timestamp,country,detail']

  for (const ev of transfer.downloadEvents) {
    rows.push(`download,${ev.at},${ev.country},`)
  }

  for (const [, info] of Object.entries(transfer.recipientTokens ?? {})) {
    if (info.downloadedAt) {
      rows.push(`recipient_download,${info.downloadedAt},,${info.email}`)
    }
  }

  for (const r of transfer.reviews ?? []) {
    const safeComment = r.comment.replace(/"/g, '""')
    rows.push(
      `review,${r.at},${r.country},"${r.rating} stars — ${safeComment}"`,
    )
  }

  for (const c of transfer.comments ?? []) {
    const safeText = c.text.replace(/"/g, '""')
    rows.push(`comment,${c.at},${c.country},"${safeText}"`)
  }

  const csv = rows.join('\r\n')
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="analytics-${slug}.csv"`,
    },
  })
}
