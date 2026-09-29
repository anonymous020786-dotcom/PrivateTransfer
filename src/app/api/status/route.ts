import { NextResponse } from 'next/server'
import { getSystemStatus } from '../../../lib/systemStatus'

export const dynamic = 'force-dynamic'

// Public, coarse-grained health (no config details) for the /status page and
// uptime monitors. 503 when the service is down so monitors alert correctly.
export async function GET(): Promise<NextResponse> {
  const s = await getSystemStatus({ detailed: false })
  return NextResponse.json(s, { status: s.status === 'down' ? 503 : 200 })
}
