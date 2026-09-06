import { NextRequest, NextResponse } from 'next/server'
import {
  getCollect,
  updateCollect,
  deleteCollect,
  listUserCollects,
} from '../../../../lib/collect'
import { getSupabaseServerClient } from '../../../../supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/collect/[slug] — public metadata (or owner view with files)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params

  // GET /api/collect/list — special: list user's collects
  if (slug === 'list') {
    const supabase = await getSupabaseServerClient()
    if (!supabase)
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    const collects = await listUserCollects(user.id)
    return NextResponse.json({ collects })
  }

  const collect = await getCollect(slug)
  if (!collect)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (new Date(collect.expiresAt) < new Date())
    return NextResponse.json(
      { error: 'This file request has expired.' },
      { status: 410 },
    )

  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  const isOwner = !!user && user.id === collect.ownerId

  if (isOwner) return NextResponse.json({ ...collect, isOwner: true })

  // Public view — hide owner info, don't show uploaded files list
  return NextResponse.json({
    slug: collect.slug,
    title: collect.title,
    description: collect.description,
    expiresAt: collect.expiresAt,
    maxFiles: collect.maxFiles,
    fileCount: collect.files.length,
    active: collect.active,
    isOwner: false,
  })
}

// PATCH /api/collect/[slug] — owner: toggle active, update title/description
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const collect = await getCollect(slug)
  if (!collect)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  if (!user || user.id !== collect.ownerId)
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const patch: Partial<typeof collect> = {}
  if (typeof body.active === 'boolean') patch.active = body.active
  if (typeof body.title === 'string') patch.title = body.title.slice(0, 200)
  if (typeof body.description === 'string')
    patch.description = body.description.slice(0, 1000)

  await updateCollect(slug, patch)
  return NextResponse.json({ ok: true })
}

// DELETE /api/collect/[slug] — owner: permanently delete a collect request
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const collect = await getCollect(slug)
  if (!collect)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  if (!user || user.id !== collect.ownerId)
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  await deleteCollect(slug, collect.ownerId)
  return NextResponse.json({ ok: true })
}
