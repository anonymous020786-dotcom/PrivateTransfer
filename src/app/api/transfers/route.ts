import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '../../../supabase/server'

export const dynamic = 'force-dynamic'

// Transfer history. Records (POST) and lists (GET) the signed-in user's
// transfers. Backed by the `transfers` table (see supabase/transfers.sql) with
// Row-Level Security, so the user only ever touches their own rows.

const RecordSchema = z.object({
  slug: z.string().max(120).optional(),
  title: z.string().max(200).optional(),
  files: z.array(z.string().max(400)).max(200).default([]),
  totalBytes: z.number().int().nonnegative().default(0),
})

export async function GET(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ transfers: [] })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { data, error } = await supabase
    .from('transfers')
    .select('id, slug, title, files, file_count, total_bytes, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ transfers: [], error: error.message })
  return NextResponse.json({ transfers: data ?? [] })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ ok: false })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const parsed = RecordSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  const { slug, title, files, totalBytes } = parsed.data

  const { error } = await supabase.from('transfers').insert({
    user_id: user.id,
    slug: slug ?? null,
    title: title ?? null,
    files,
    file_count: files.length,
    total_bytes: totalBytes,
  })

  // History is best-effort: never break the transfer if the table is missing.
  if (error) return NextResponse.json({ ok: false, error: error.message })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ ok: false })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

  const { error } = await supabase.from('transfers').delete().eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message })
  return NextResponse.json({ ok: true })
}
