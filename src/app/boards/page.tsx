import * as React from 'react'
import type { Metadata } from 'next'
import { requireUserOrRedirect } from '../../supabase/server'
import BoardsManager from '../../components/BoardsManager'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: `Boards · ${brand.name}`,
  description: 'Organise your transfers into named boards.',
}

export default async function BoardsPage(): Promise<React.ReactElement> {
  await requireUserOrRedirect('/boards')
  return <BoardsManager />
}
