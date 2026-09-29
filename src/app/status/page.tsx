import * as React from 'react'
import type { Metadata } from 'next'
import StatusBoard from '../../components/StatusBoard'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: `Status · ${brand.name}`,
  description: `Live operational status of ${brand.name} services.`,
  alternates: { canonical: '/status' },
}

export default function StatusPage(): React.ReactElement {
  return <StatusBoard />
}
