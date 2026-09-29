'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import KeyIcon from '@mui/icons-material/Key'
import ShieldIcon from '@mui/icons-material/Shield'
import PersonIcon from '@mui/icons-material/Person'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import FileDownloadIcon from '@mui/icons-material/FileDownload'

type Entry = {
  type: string
  at: string
  ip: string | null
  agent: string | null
  detail?: string
}

const LABELS: Record<
  string,
  {
    label: string
    icon: React.ReactElement
    security?: boolean
    warn?: boolean
  }
> = {
  'auth.signup': {
    label: 'Account created',
    icon: <PersonIcon />,
    security: true,
  },
  'auth.signin': { label: 'Signed in', icon: <LoginIcon />, security: true },
  'auth.email_code_signin': {
    label: 'Signed in with an email code',
    icon: <LoginIcon />,
    security: true,
  },
  'auth.signin_failed': {
    label: 'Failed sign-in attempt',
    icon: <ErrorOutlineIcon />,
    security: true,
    warn: true,
  },
  'auth.signout': { label: 'Signed out', icon: <LogoutIcon />, security: true },
  'auth.signout_others': {
    label: 'Signed out of other devices',
    icon: <LogoutIcon />,
    security: true,
  },
  'auth.password_changed': {
    label: 'Password changed',
    icon: <KeyIcon />,
    security: true,
  },
  'auth.password_reset': {
    label: 'Password reset code used',
    icon: <KeyIcon />,
    security: true,
  },
  'auth.mfa_enabled': {
    label: 'Two-factor authentication enabled',
    icon: <ShieldIcon />,
    security: true,
  },
  'auth.mfa_disabled': {
    label: 'Two-factor authentication disabled',
    icon: <ShieldIcon />,
    security: true,
    warn: true,
  },
  'auth.mfa_challenge_passed': {
    label: 'Two-factor challenge passed',
    icon: <ShieldIcon />,
    security: true,
  },
  'profile.updated': { label: 'Profile updated', icon: <PersonIcon /> },
  'transfer.created': { label: 'Transfer created', icon: <CloudUploadIcon /> },
  'transfer.deleted': { label: 'Transfer deleted', icon: <DeleteIcon /> },
  'transfer.downloaded': {
    label: 'Your transfer was downloaded',
    icon: <DownloadIcon />,
  },
  'apikey.created': {
    label: 'API key created',
    icon: <VpnKeyIcon />,
    security: true,
  },
  'apikey.revoked': {
    label: 'API key revoked',
    icon: <VpnKeyIcon />,
    security: true,
  },
  'account.exported': {
    label: 'Data export downloaded',
    icon: <FileDownloadIcon />,
    security: true,
  },
}

function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d < 30 ? `${d} d ago` : new Date(iso).toLocaleDateString()
}

export default function ActivityPanel(): React.ReactElement {
  const [items, setItems] = React.useState<Entry[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState<'all' | 'security'>('all')

  const load = React.useCallback(async () => {
    try {
      const res = await fetch('/api/account/activity')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load activity.')
      setItems(json.activity)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const clear = async () => {
    if (!confirm('Clear your activity log? This cannot be undone.')) return
    await fetch('/api/account/activity', { method: 'DELETE' })
    setItems([])
  }

  const shown = (items ?? []).filter(
    (e) => filter === 'all' || LABELS[e.type]?.security,
  )

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Account activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign-ins, security changes and transfer events. Anything you
            don&apos;t recognise? Change your password and sign out other
            devices.
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filter}
          onChange={(_, v) => v && setFilter(v)}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="security">Security</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {!items && !error && <CircularProgress size={24} />}
      {items && shown.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No activity recorded yet.
        </Typography>
      )}

      {shown.length > 0 && (
        <List dense disablePadding>
          {shown.map((e, i) => {
            const meta = LABELS[e.type] ?? {
              label: e.type,
              icon: <PersonIcon />,
            }
            const where = [e.agent, e.ip].filter(Boolean).join(' · ')
            return (
              <ListItem key={`${e.at}-${i}`} divider disableGutters>
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: meta.warn ? 'warning.main' : 'text.secondary',
                  }}
                >
                  {meta.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <>
                      {meta.label}
                      {e.detail && (
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                        >
                          {' '}
                          — {e.detail}
                        </Typography>
                      )}
                    </>
                  }
                  secondary={
                    <span title={new Date(e.at).toLocaleString()}>
                      {timeAgo(e.at)}
                      {where && ` · ${where}`}
                    </span>
                  }
                />
              </ListItem>
            )
          })}
        </List>
      )}

      {items && items.length > 0 && (
        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
          <Button size="small" href="/api/account/export" variant="outlined">
            Export all my data
          </Button>
          <Button size="small" color="inherit" onClick={clear}>
            Clear log
          </Button>
        </Stack>
      )}
    </Box>
  )
}
