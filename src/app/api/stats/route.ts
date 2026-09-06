import { NextResponse } from 'next/server'
import { getStatsStore } from '../../../stats'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const stats = await getStatsStore().getStats()
  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
