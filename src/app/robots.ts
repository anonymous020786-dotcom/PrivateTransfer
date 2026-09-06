import type { MetadataRoute } from 'next'
import { brand } from '../brand'

export default function robots(): MetadataRoute.Robots {
  const base = brand.url.replace(/\/$/, '')
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/account',
          '/profile',
          '/api/',
          '/transfer/history', // auth-gated, no value indexing
          '/download/',
        ],
      },
      {
        // Prevent AI training crawlers
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
      {
        userAgent: 'anthropic-ai',
        disallow: ['/'],
      },
      {
        userAgent: 'Claude-Web',
        disallow: ['/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
