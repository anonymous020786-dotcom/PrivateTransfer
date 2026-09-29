import * as React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PasteViewer from '../../../components/paste/PasteViewer'
import { getPaste, pasteMeta } from '../../../lib/paste'
import { brand } from '../../../brand'

export const dynamic = 'force-dynamic'

// Paste titles may be private, so previews show a generic title and search
// engines are told not to index.
export const metadata: Metadata = {
  title: `Shared paste · ${brand.name}`,
  robots: { index: false, follow: false },
}

export default async function PasteSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<React.ReactElement> {
  const paste = await getPaste((await params).slug)
  if (!paste) notFound()
  return <PasteViewer meta={pasteMeta(paste)} />
}
