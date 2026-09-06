import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '../../../supabase/server'
import {
  listApiKeys,
  saveApiKey,
  generateApiKey,
  hashApiKey,
} from '../../../lib/apiKeys'

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

  const keys = await listApiKeys(user.id)
  // Never return the hash, just metadata
  return NextResponse.json({
    keys: keys.map(({ keyHash: _, ...k }) => k),
  })
}

const CreateSchema = z.object({ name: z.string().min(1).max(100) })

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = CreateSchema.safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const existing = await listApiKeys(user.id)
  if (existing.length >= 10)
    return NextResponse.json(
      { error: 'Max 10 API keys per account.' },
      { status: 400 },
    )

  const rawKey = generateApiKey()
  const record = {
    id: crypto.randomUUID(),
    userId: user.id,
    name: body.data.name,
    keyHash: hashApiKey(rawKey),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  }
  await saveApiKey(record)

  // Return the raw key ONCE — never retrievable again
  return NextResponse.json(
    {
      key: rawKey,
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
    },
    { status: 201 },
  )
}
