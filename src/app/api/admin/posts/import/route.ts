import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '../../../../../supabase/server'
import { getSupabaseAdminClient } from '../../../../../supabase/admin'
import { isAdminEmail } from '../../../../../supabase/config'
import { getAllSlugs, getPostBySlug } from '../../../../../blog'

export const dynamic = 'force-dynamic'

// One-click migration: import all filesystem markdown posts into the DB.
// Admin-only. Upserts by slug, so it's safe to run more than once.
export async function POST(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Service role key not configured.' },
      { status: 503 },
    )
  }

  const slugs = getAllSlugs()
  const rows = slugs
    .map((slug) => getPostBySlug(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      date: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
      category: p.category || 'General',
      excerpt: p.excerpt || '',
      tags: p.tags || [],
      author: p.author || 'Zync Team',
      content: p.content || '',
      published: true,
      updated_at: new Date().toISOString(),
    }))

  if (rows.length === 0) return NextResponse.json({ ok: true, imported: 0 })

  // Upsert in chunks to stay within payload limits.
  let imported = 0
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50)
    const { error } = await admin
      .from('posts')
      .upsert(chunk, { onConflict: 'slug' })
    if (error)
      return NextResponse.json(
        { error: error.message, imported },
        { status: 500 },
      )
    imported += chunk.length
  }
  return NextResponse.json({ ok: true, imported })
}
