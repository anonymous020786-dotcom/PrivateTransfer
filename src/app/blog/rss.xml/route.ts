import { getAllPostMetaAsync } from '../../../blogDb'
import { brand } from '../../../brand'

// RSS 2.0 feed of the 50 most recent published posts.
export const revalidate = 3600

const esc = (s: string) =>
  s.replace(
    /[<>&'"]/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
      })[c]!,
  )

export async function GET(): Promise<Response> {
  const posts = (await getAllPostMetaAsync()).slice(0, 50)
  const site = brand.url.replace(/\/$/, '')
  const items = posts
    .map((p) => {
      const url = `${site}/blog/${p.slug}`
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <category>${esc(p.category)}</category>
      <description>${esc(p.excerpt)}</description>
    </item>`
    })
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(brand.name)} Blog</title>
    <link>${site}/blog</link>
    <description>${esc(brand.shortDescription)}</description>
    <language>en</language>
    <atom:link href="${site}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date(posts[0]?.date ?? Date.now()).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
