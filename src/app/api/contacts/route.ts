import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRedisClient } from '../../../redisClient'
import { getSupabaseServerClient } from '../../../supabase/server'

export const dynamic = 'force-dynamic'

const CONTACTS_KEY = (userId: string) => `contacts:${userId}`
const MAX_CONTACTS = 200
const CONTACT_TTL = 365 * 24 * 3600 // 1 year

async function requireUser(): Promise<{ id: string } | null> {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// GET /api/contacts — list saved contacts (sorted by use frequency)
export async function GET(): Promise<NextResponse> {
  const user = await requireUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const redis = getRedisClient()
  const contacts = await redis.zrevrange(
    CONTACTS_KEY(user.id),
    0,
    MAX_CONTACTS - 1,
    'WITHSCORES',
  )

  const result: Array<{ email: string; uses: number }> = []
  for (let i = 0; i < contacts.length; i += 2) {
    result.push({ email: contacts[i], uses: Number(contacts[i + 1]) })
  }
  return NextResponse.json({ contacts: result })
}

// POST /api/contacts — save one or more emails (increments use score)
const PostSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(20),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = PostSchema.safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const redis = getRedisClient()
  const key = CONTACTS_KEY(user.id)

  for (const email of body.data.emails) {
    await redis.zincrby(key, 1, email)
  }

  // Cap at MAX_CONTACTS (remove oldest/least-used beyond limit)
  const total = await redis.zcard(key)
  if (total > MAX_CONTACTS) {
    await redis.zremrangebyrank(key, 0, total - MAX_CONTACTS - 1)
  }
  await redis.expire(key, CONTACT_TTL)

  return NextResponse.json({ ok: true })
}

// DELETE /api/contacts?email=x — remove a contact
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const email = new URL(req.url).searchParams.get('email')
  if (!email)
    return NextResponse.json({ error: 'Missing email.' }, { status: 400 })

  const redis = getRedisClient()
  await redis.zrem(CONTACTS_KEY(user.id), email)
  return NextResponse.json({ ok: true })
}
