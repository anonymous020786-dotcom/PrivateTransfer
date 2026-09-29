import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '../../../../supabase/server'
import { getTransfer } from '../../../../lib/transfer'
import { getRedisClient } from '../../../../redisClient'

export const dynamic = 'force-dynamic'

// Per-user pinned transfers, shown first in "My transfers".
const KEY = (uid: string) => `pins:${uid}`
const MAX_PINS = 50

async function uid(): Promise<string | null> {
  const supabase = await getSupabaseServerClient()
  return supabase
    ? ((await supabase.auth.getUser()).data.user?.id ?? null)
    : null
}

export async function GET(): Promise<NextResponse> {
  const id = await uid()
  if (!id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  return NextResponse.json({ pins: await getRedisClient().smembers(KEY(id)) })
}

const Body = z.object({ slug: z.string().min(1).max(120), pinned: z.boolean() })

export async function POST(req: NextRequest): Promise<NextResponse> {
  const id = await uid()
  if (!id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const body = Body.safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  const redis = getRedisClient()
  const { slug, pinned } = body.data
  if (pinned) {
    const t = await getTransfer(slug)
    if (!t || t.ownerId !== id)
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    if ((await redis.scard(KEY(id))) >= MAX_PINS)
      return NextResponse.json(
        { error: `You can pin up to ${MAX_PINS} transfers.` },
        { status: 409 },
      )
    await redis.sadd(KEY(id), slug)
  } else {
    await redis.srem(KEY(id), slug)
  }
  return NextResponse.json({ ok: true, pins: await redis.smembers(KEY(id)) })
}
