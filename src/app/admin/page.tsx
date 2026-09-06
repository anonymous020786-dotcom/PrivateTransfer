import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { getCurrentUser } from '../../supabase/server'
import { isSupabaseConfigured, isAdminEmail } from '../../supabase/config'
import { getStatsStore } from '../../stats'
import AdminTools from '../../components/AdminTools'
import BlogManager from '../../components/admin/BlogManager'
import SettingsManager from '../../components/admin/SettingsManager'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

const numberFmt = new Intl.NumberFormat()

export default async function AdminPage(): Promise<React.ReactElement> {
  // Access control: Supabase must be configured, user signed in, and email in
  // the ADMIN_EMAILS allowlist. Otherwise the route 404s (no info leak).
  if (!isSupabaseConfigured()) notFound()
  const user = await getCurrentUser()
  if (!user || !isAdminEmail(user.email)) notFound()

  const stats = await getStatsStore().getStats()
  const cards = [
    { label: 'Active channels', value: stats.activeChannels },
    { label: 'Channels created', value: stats.channelsCreated },
    { label: 'Downloads started', value: stats.downloadsStarted },
    { label: 'Channels destroyed', value: stats.channelsDestroyed },
    { label: 'Reported', value: stats.channelsReported },
  ]

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Admin dashboard
        </Typography>
        <Chip label="Super Admin" color="primary" size="small" />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Signed in as {user.email}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {cards.map((c) => (
          <Grid size={{ xs: 6, md: 2.4 }} key={c.label}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {numberFmt.format(c.value)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {c.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ maxWidth: 640, mb: 5 }}>
        <AdminTools />
      </Box>

      <Box sx={{ mt: 2 }}>
        <BlogManager />
      </Box>

      <Box sx={{ mt: 6 }}>
        <SettingsManager />
      </Box>
    </Container>
  )
}
