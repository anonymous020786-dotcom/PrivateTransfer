import type { Metadata } from 'next'
import Container from '@mui/material/Container'
import PageShell from '../../components/PageShell'
import BlogIndex from '../../components/BlogIndex'
import { getAllPostMetaAsync, getCategoriesAsync } from '../../blogDb'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: 'Blog',
  description: `Guides on private file sharing, security, WebRTC, productivity and web development from the ${brand.name} team.`,
  alternates: { canonical: '/blog' },
}

// DB-backed (editable) — render on demand so new/edited posts appear instantly.
export const dynamic = 'force-dynamic'

export default async function BlogPage(): Promise<React.ReactElement> {
  const posts = await getAllPostMetaAsync()
  const categories = await getCategoriesAsync()
  return (
    <>
      <PageShell
        title={`The ${brand.name} Blog`}
        subtitle="Privacy, file sharing, and the web — explained."
      />
      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 8 } }}>
        <BlogIndex posts={posts} categories={categories} />
      </Container>
    </>
  )
}
