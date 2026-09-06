import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Link as ViewTransitionLink } from 'next-view-transitions'
import PageShell from '../../../components/PageShell'
import ToolHost from '../../../components/tools/ToolHost'
import { TOOLS, getTool } from '../../../tools/meta'
import { brand } from '../../../brand'

export function generateStaticParams(): Array<{ slug: string }> {
  return TOOLS.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tool = getTool(slug)
  if (!tool) return { title: 'Tool not found' }
  return {
    title: tool.name,
    description: `${tool.description} A free, private ${brand.name} tool that runs in your browser.`,
    alternates: { canonical: `/tools/${tool.slug}` },
  }
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<React.ReactElement> {
  const { slug } = await params
  const tool = getTool(slug)
  if (!tool) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: `${tool.name} — ${brand.name}`,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any (web browser)',
        description: tool.description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: brand.url },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Tools',
            item: `${brand.url}/tools`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: tool.name,
            item: `${brand.url}/tools/${tool.slug}`,
          },
        ],
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageShell
        title={`${tool.emoji} ${tool.name}`}
        subtitle={tool.description}
        maxWidth="md"
      >
        <Box sx={{ mb: 3 }}>
          <Button
            component={ViewTransitionLink}
            href="/tools"
            startIcon={<ArrowBackIcon />}
          >
            All tools
          </Button>
        </Box>
        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <ToolHost slug={tool.slug} />
          </CardContent>
        </Card>
      </PageShell>
    </>
  )
}
