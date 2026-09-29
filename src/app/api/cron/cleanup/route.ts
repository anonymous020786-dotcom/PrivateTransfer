import { NextRequest, NextResponse } from 'next/server'
import { runMaintenance } from '../../../../lib/maintenance'
import { isCronAuthorized } from '../../../../lib/cronAuth'

export const dynamic = 'force-dynamic'

// Called by an external cron every 5 minutes (self-hosted installs can rely on
// the built-in scheduler instead — see src/instrumentation.ts).
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = isCronAuthorized(req)
  if (auth !== true) return auth
  return NextResponse.json({ ok: true, ...(await runMaintenance()) })
}
