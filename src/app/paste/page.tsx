import * as React from 'react'
import type { Metadata } from 'next'
import PasteComposer from '../../components/paste/PasteComposer'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: `Share text & code · ${brand.name}`,
  description:
    'Share notes, logs and code with an end-to-end encrypted link. Optional password, expiry and burn-after-reading.',
  alternates: { canonical: '/paste' },
}

export default function PastePage(): React.ReactElement {
  return <PasteComposer />
}
