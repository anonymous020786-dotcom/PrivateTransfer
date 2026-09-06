import * as React from 'react'
import type { Metadata } from 'next'
import { brand } from '../../brand'
import WorkspacesManager from '../../components/WorkspacesManager'

export const metadata: Metadata = { title: `Workspaces · ${brand.name}` }

export default function WorkspacesPage(): React.ReactElement {
  return <WorkspacesManager />
}
