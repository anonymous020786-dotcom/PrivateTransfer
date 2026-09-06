import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '../../../../supabase/server'
import { getSupabaseAdminClient } from '../../../../supabase/admin'
import { isAdminEmail } from '../../../../supabase/config'

export const dynamic = 'force-dynamic'

// Admin-only blog CMS API. Read returns all posts (incl. drafts); writes go
// through the service-role client (bypassing RLS) and are gated by the
// ADMIN_EMAILS allowlist.

async function requireAdmin(): Promise<
  | { ok: true; admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>> }
  | { ok: false; res: NextResponse }
> {
  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  if (!user || !isAdminEmail(user.email)) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  const admin = getSupabaseAdminClient()
  if (!admin) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'Service role key not configured.' },
        { status: 503 },
      ),
    }
  }
  return { ok: true, admin }
}

const PostSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes only'),
  title: z.string().min(1).max(240),
  category: z.string().max(80).default('General'),
  excerpt: z.string().max(600).default(''),
  tags: z.array(z.string().max(40)).max(20).default([]),
  author: z.string().max(120).default('Zync Team'),
  content: z.string().default(''),
  coverImage: z.string().url().max(500).optional().or(z.literal('')),
  published: z.boolean().default(true),
  date: z.string().optional(),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  // ?full=<slug> → return a single post incl. content (for the editor).
  const full = new URL(request.url).searchParams.get('full')
  if (full) {
    const { data, error } = await gate.admin
      .from('posts')
      .select('slug,title,date,category,excerpt,tags,author,content,published')
      .eq('slug', full)
      .maybeSingle()
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ post: null })
    return NextResponse.json({
      post: {
        slug: data.slug,
        title: data.title,
        category: data.category,
        excerpt: data.excerpt,
        author: data.author,
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
        content: data.content,
        published: data.published,
      },
    })
  }

  const { data, error } = await gate.admin
    .from('posts')
    .select(
      'id,slug,title,date,category,excerpt,tags,author,published,updated_at',
    )
    .order('date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data ?? [] })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const parsed = PostSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid post.' },
      { status: 400 },
    )
  }
  const p = parsed.data
  const { error } = await gate.admin.from('posts').upsert(
    {
      slug: p.slug,
      title: p.title,
      category: p.category,
      excerpt: p.excerpt,
      tags: p.tags,
      author: p.author,
      content: p.content,
      cover_image: p.coverImage || null,
      published: p.published,
      date: p.date || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'slug' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const slug = new URL(request.url).searchParams.get('slug')
  if (!slug)
    return NextResponse.json({ error: 'Missing slug.' }, { status: 400 })
  const { error } = await gate.admin.from('posts').delete().eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
