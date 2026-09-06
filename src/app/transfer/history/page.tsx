import * as React from 'react'
import type { Metadata } from 'next'
import { requireUserOrRedirect } from '../../../supabase/server'
import HistoryList from '../../../components/transfer/HistoryList'
import { brand } from '../../../brand'

export const metadata: Metadata = {
  title: `My transfers · ${brand.name}`,
  description: 'View and manage your active file transfers.',
}

export default async function TransferHistoryPage(): Promise<React.ReactElement> {
  await requireUserOrRedirect('/transfer/history')
  return <HistoryList />
}
