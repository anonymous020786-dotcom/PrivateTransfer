import type { Metadata } from 'next'
import SendApp from '../../components/SendApp'
import { requireUserOrRedirect } from '../../supabase/server'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: 'Send a file',
  description: `Send files securely with ${brand.name}. Direct, encrypted, peer-to-peer transfers — no uploads to a server, no size caps.`,
  alternates: { canonical: '/send' },
}

export default async function SendPage(): Promise<React.ReactElement> {
  // Protected tool: requires a signed-in account when auth is configured.
  await requireUserOrRedirect('/send')
  return <SendApp />
}
