import type { Metadata } from 'next'
import AuthHub from '../../components/auth/AuthHub'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: 'Sign in',
  description: `Sign in or create your free ${brand.name} account to send unlimited, private files.`,
  robots: { index: false, follow: false },
}

export default function LoginPage(): React.ReactElement {
  return <AuthHub />
}
