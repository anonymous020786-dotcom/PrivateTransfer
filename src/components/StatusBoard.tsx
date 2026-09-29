'use client'

import * as React from 'react'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

type Status = {
  status: 'ok' | 'degraded' | 'down'
  components: Record<string, 'ok' | 'degraded' | 'down' | 'off'>
  uptimeSec: number
  version: string
  checkedAt: string
}

const LABELS: Record<string, { name: string; about: string }> = {
  web: { name: 'Website & API', about: 'Pages and API endpoints' },
  database: {
    name: 'Transfer database',
    about: 'Transfer records, links and rate limits',
  },
  storage: {
    name: 'Cloud storage',
    about: 'Uploads and downloads of cloud transfers',
  },
  accounts: { name: 'Accounts', about: 'Sign-in, profiles and 2FA' },
  email: {
    name: 'Email notifications',
    about: 'Recipient and download emails',
  },
  maintenance: {
    name: 'Background jobs',
    about: 'Expiry cleanup and scheduled emails',
  },
}

const DOT: Record<string, string> = {
  ok: '#16a34a',
  degraded: '#d97706',
  down: '#dc2626',
  off: '#9ca3af',
}

const TEXT: Record<string, string> = {
  ok: 'Operational',
  degraded: 'Degraded',
  down: 'Outage',
  off: 'Not enabled',
}

const POLL_MS = 30_000

export default function StatusBoard(): React.ReactElement {
  const [s, setS] = React.useState<Status | null>(null)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    const load = () =>
      fetch('/api/status', { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => {
          if (!alive) return
          setS(j)
          setError(false)
        })
        .catch(() => alive && setError(true))
    void load()
    const t = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  const headline =
    error || !s
      ? null
      : s.status === 'ok'
        ? { severity: 'success' as const, text: 'All systems operational' }
        : s.status === 'degraded'
          ? { severity: 'warning' as const, text: 'Some systems are degraded' }
          : {
              severity: 'error' as const,
              text: 'We are experiencing an outage',
            }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 3 }}>
        System status
      </Typography>
      {error && (
        <Alert severity="error">
          Could not reach the status service — it may be down.
        </Alert>
      )}
      {!s && !error && <CircularProgress />}
      {headline && (
        <Alert severity={headline.severity} sx={{ mb: 3, fontWeight: 600 }}>
          {headline.text}
        </Alert>
      )}
      {s && (
        <Card variant="outlined">
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {Object.entries(s.components).map(([k, v], i) => (
              <Stack
                key={k}
                direction="row"
                spacing={2}
                sx={{
                  alignItems: 'center',
                  px: 2.5,
                  py: 1.75,
                  borderTop: i ? 1 : 0,
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: DOT[v],
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {LABELS[k]?.name ?? k}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {LABELS[k]?.about}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ color: DOT[v], fontWeight: 600 }}
                >
                  {TEXT[v]}
                </Typography>
              </Stack>
            ))}
          </CardContent>
        </Card>
      )}
      {s && (
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ mt: 2 }}
        >
          v{s.version} · checked {new Date(s.checkedAt).toLocaleTimeString()} ·
          refreshes every 30 s · machine-readable at <code>/api/status</code>
        </Typography>
      )}
    </Container>
  )
}
