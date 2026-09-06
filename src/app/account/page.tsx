import type { Metadata } from 'next'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { getCurrentUser } from '../../supabase/server'
import { isSupabaseConfigured, isAdminEmail } from '../../supabase/config'
import AccountTabs from '../../components/account/AccountTabs'
import PageShell from '../../components/PageShell'
import { PROFILE_FIELDS } from '../../components/account/profileFields'

export const metadata: Metadata = {
  title: 'Your account',
  description: 'Manage your Zync profile and security settings.',
  robots: { index: false, follow: false },
}

export default async function AccountPage(): Promise<React.ReactElement> {
  if (!isSupabaseConfigured()) {
    return (
      <PageShell title="Your account" subtitle="Accounts are part of Zync.">
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary">
              Authentication isn’t configured on this deployment yet. Add your
              Supabase keys to enable accounts.
            </Typography>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  // The proxy already redirects unauthenticated users; this is defense in depth.
  const user = await getCurrentUser()
  if (!user) {
    return (
      <PageShell title="Your account">
        <Typography>Please sign in.</Typography>
      </PageShell>
    )
  }

  const raw = (user.user_metadata || {}) as Record<string, unknown>
  const metadata: Record<string, string> = {}
  for (const f of PROFILE_FIELDS) {
    metadata[f.key] =
      typeof raw[f.key] === 'string' ? (raw[f.key] as string) : ''
  }
  if (typeof raw.backup_email === 'string')
    metadata.backup_email = raw.backup_email
  const name =
    (typeof raw.full_name === 'string' && raw.full_name) ||
    (typeof raw.name === 'string' && raw.name) ||
    user.email ||
    'Zync user'

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <AccountTabs
        email={user.email || ''}
        name={name}
        avatarUrl={typeof raw.avatar_url === 'string' ? raw.avatar_url : null}
        isAdmin={isAdminEmail(user.email)}
        metadata={metadata}
      />
    </Container>
  )
}
