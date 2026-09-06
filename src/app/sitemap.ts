import type { MetadataRoute } from 'next'
import { getAllPostMetaAsync } from '../blogDb'
import { TOOLS } from '../tools/meta'
import { brand } from '../brand'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = brand.url.replace(/\/$/, '')

  const staticRoutes = [
    '',
    '/send',
    '/transfer',
    '/transfer/history',
    '/welcome',
    '/tools',
    '/blog',
    '/about',
    '/contact',
    '/stats',
    '/privacy',
    '/terms',
    '/cookies',
    '/acceptable-use',
    '/dmca',
    '/login',
  ].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: p === '' ? 1 : 0.7,
  }))

  const posts = (await getAllPostMetaAsync()).map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const tools = TOOLS.map((t) => ({
    url: `${base}/tools/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...posts, ...tools]
}
