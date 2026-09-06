import 'server-only'
import readingTime from 'reading-time'
import { getSupabaseAdminClient } from './supabase/admin'
import {
  getAllPostMeta as fsAllMeta,
  getPostBySlug as fsBySlug,
  getAllSlugs as fsSlugs,
  getCategories as fsCategories,
  type Post,
  type PostMeta,
} from './blog'

export type { Post, PostMeta } from './blog'

type Row = {
  slug: string
  title: string
  date: string
  category: string
  excerpt: string
  tags: string[] | null
  author: string
  content: string
}

function rowToPost(r: Row): Post {
  return {
    slug: r.slug,
    title: r.title,
    date: r.date,
    category: r.category,
    excerpt: r.excerpt,
    tags: r.tags ?? [],
    author: r.author,
    readingMinutes: Math.max(
      1,
      Math.round(readingTime(r.content || '').minutes),
    ),
    content: r.content || '',
  }
}

// Returns published posts from the DB, or null when the DB isn't configured,
// the table is missing, or there are no rows (→ caller falls back to the
// filesystem posts so the blog always works).
async function dbPosts(): Promise<Post[] | null> {
  const admin = getSupabaseAdminClient()
  if (!admin) return null
  try {
    const { data, error } = await admin
      .from('posts')
      .select('slug,title,date,category,excerpt,tags,author,content')
      .eq('published', true)
      .order('date', { ascending: false })
    if (error || !data || data.length === 0) return null
    return (data as Row[]).map(rowToPost)
  } catch {
    return null
  }
}

export async function getAllPostMetaAsync(): Promise<PostMeta[]> {
  const db = await dbPosts()
  if (!db) return fsAllMeta()
  return db.map(({ content: _c, ...meta }) => meta)
}

export async function getPostBySlugAsync(slug: string): Promise<Post | null> {
  const db = await dbPosts()
  if (!db) return fsBySlug(slug)
  return db.find((p) => p.slug === slug) ?? null
}

export async function getAllSlugsAsync(): Promise<string[]> {
  const db = await dbPosts()
  if (!db) return fsSlugs()
  return db.map((p) => p.slug)
}

export async function getCategoriesAsync(): Promise<
  Array<{ name: string; count: number }>
> {
  const db = await dbPosts()
  if (!db) return fsCategories()
  const counts = new Map<string, number>()
  for (const p of db) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}
