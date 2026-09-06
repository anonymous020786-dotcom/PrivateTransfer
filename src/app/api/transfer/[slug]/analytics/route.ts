import { NextRequest, NextResponse } from 'next/server'
import { getTransfer } from '../../../../../lib/transfer'
import { getSupabaseServerClient } from '../../../../../supabase/server'

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

  // Country breakdown
  const countryMap: Record<string, number> = {}
  for (const ev of transfer.downloadEvents) {
    const c = ev.country === 'XX' ? 'Unknown' : ev.country
    countryMap[c] = (countryMap[c] ?? 0) + 1
  }
  const countries = Object.entries(countryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([country, count]) => ({ country, count }))

  // Timeline: group download events by calendar day (UTC)
  const dayMap: Record<string, number> = {}
  for (const ev of transfer.downloadEvents) {
    const day = ev.at.slice(0, 10)
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  const timeline = Object.entries(dayMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))

  // Per-recipient status
  const recipients = Object.entries(transfer.recipientTokens ?? {}).map(
    ([token, info]) => ({
      email: info.email,
      downloadedAt: info.downloadedAt ?? null,
      token,
    }),
  )

  // Average review rating
  const reviews = transfer.reviews ?? []
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null

  return NextResponse.json({
    downloadCount: transfer.downloadCount,
    downloadEvents: transfer.downloadEvents,
    countries,
    timeline,
    recipients,
    reviews,
    avgRating,
    comments: transfer.comments ?? [],
    scheduledAt: transfer.scheduledAt ?? null,
    notificationSent: transfer.notificationSent ?? true,
    boardIds: transfer.boardIds ?? [],
  })
}
