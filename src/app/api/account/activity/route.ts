import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '../../../../supabase/server'
import {
  ACTIVITY_TYPES,
  CLIENT_REPORTABLE,
  clearActivity,
  listActivity,
  recordActivity,
  requestContext,
  type ActivityType,
} from '../../../../lib/activity'
import { isLocalBackend } from '../../../../local/mode'
import { rateLimit, getClientIp } from '../../../../rateLimit'

export const dynamic = 'force-dynamic'

async function currentUserId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return null
  return (await supabase.auth.getUser()).data.user?.id ?? null
}

export async function GET(): Promise<NextResponse> {
  const uid = await currentUserId()
  if (!uid)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  return NextResponse.json({ activity: await listActivity(uid) })
}

// Client-side auth events (Supabase mode only — the local backend records
// them server-side already, so reports are ignored there to avoid doubles).
const ReportSchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  detail: z.string().max(200).optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const uid = await currentUserId()
  if (!uid)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const body = ReportSchema.safeParse(await req.json().catch(() => null))
  if (!body.success || !CLIENT_REPORTABLE.has(body.data.type as ActivityType))
    return NextResponse.json({ error: 'Invalid event.' }, { status: 400 })
  if (isLocalBackend()) return NextResponse.json({ ok: true, recorded: false })
  const rl = await rateLimit(`activity:${getClientIp(req)}`, {
    limit: 30,
    windowSeconds: 600,
  })
  if (!rl.success)
    return NextResponse.json({ error: 'Slow down.' }, { status: 429 })
  await recordActivity(uid, body.data.type, {
    ...requestContext(req),
    detail: body.data.detail,
  })
  return NextResponse.json({ ok: true, recorded: true })
}

export async function DELETE(): Promise<NextResponse> {
  const uid = await currentUserId()
  if (!uid)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  await clearActivity(uid)
  return NextResponse.json({ ok: true })
}
