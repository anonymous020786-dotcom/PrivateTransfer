import * as React from 'react'
import type { Metadata } from 'next'
import { requireUserOrRedirect } from '../../supabase/server'
import ContactGroupsManager from '../../components/ContactGroupsManager'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: `Contact groups · ${brand.name}`,
  description: 'Save groups of email addresses for quick selection.',
}

export default async function ContactGroupsPage(): Promise<React.ReactElement> {
  await requireUserOrRedirect('/contact-groups')
  return <ContactGroupsManager />
}
