import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Link as ViewTransitionLink } from 'next-view-transitions'
import { getPostBySlugAsync } from '../../../blogDb'
import Markdown from '../../../components/Markdown'
import { brand } from '../../../brand'

// DB-backed (editable) — render on demand so edits/new posts appear instantly.
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlugAsync(slug)
  if (!post) return { title: 'Article not found' }
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      authors: [post.author],
    },
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<React.ReactElement> {
  const { slug } = await params
  const post = await getPostBySlugAsync(slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        datePublished: post.date,
        dateModified: post.date,
        author: { '@type': 'Person', name: post.author },
        publisher: {
          '@type': 'Organization',
          name: brand.org.legalName,
          logo: { '@type': 'ImageObject', url: `${brand.url}/icon.svg` },
        },
        mainEntityOfPage: `${brand.url}/blog/${post.slug}`,
        keywords: post.tags.join(', '),
        articleSection: post.category,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: brand.url },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: `${brand.url}/blog`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: `${brand.url}/blog/${post.slug}`,
          },
        ],
      },
    ],
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 7 } }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Button
        component={ViewTransitionLink}
        href="/blog"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 3 }}
      >
        All articles
      </Button>

      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Chip
          label={post.category}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ alignSelf: 'flex-start' }}
        />
        <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
          {post.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          By {post.author} ·{' '}
          {new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          })}{' '}
          · {post.readingMinutes} min read
        </Typography>
      </Stack>
      <Divider sx={{ mb: 4 }} />

      <Markdown>{post.content}</Markdown>

      <Divider sx={{ my: 5 }} />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {post.tags.map((t) => (
          <Chip key={t} label={t} size="small" variant="outlined" />
        ))}
      </Box>
    </Container>
  )
}
