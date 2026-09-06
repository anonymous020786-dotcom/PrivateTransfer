'use client'

import * as React from 'react'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Logo from '../../components/Logo'
import ReturnHome from '../../components/ReturnHome'
import type { Stats, ActivityEvent } from '../../stats'

const numberFmt = new Intl.NumberFormat()

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: string
}): React.ReactElement {
  return (
    <Card variant="outlined" sx={{ flex: '1 1 160px', minWidth: 150 }}>
      <CardContent>
        <Typography variant="h3" sx={{ fontWeight: 800, color }}>
          {numberFmt.format(value)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  )
}

const EVENT_LABEL: Record<ActivityEvent['type'], string> = {
  created: '🍕 New pizza prepared',
  downloaded: '⬇️ Download started',
  destroyed: '🧹 Channel cleaned up',
  reported: '🚨 Channel reported',
}

function timeAgo(at: number): string {
  const s = Math.floor((Date.now() - at) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export default function StatsPage(): React.ReactElement {
  const [stats, setStats] = React.useState<Stats | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load stats')
        const data: Stats = await res.json()
        if (active) {
          setStats(data)
          setError(null)
        }
      } catch (e) {
        if (active) setError((e as Error).message)
      }
    }
    load()
    const interval = setInterval(load, 3000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return (
    <Stack
      spacing={3}
      sx={{
        alignItems: 'center',
        py: 5,
        px: 2,
        maxWidth: 720,
        mx: 'auto',
        width: '100%',
      }}
    >
      <Logo size={40} />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Live Kitchen Stats
        </Typography>
        <Chip
          size="small"
          color="success"
          variant="outlined"
          label="live"
          icon={
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'success.main',
                ml: 1,
              }}
            />
          }
        />
      </Stack>

      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}

      {!stats ? (
        <CircularProgress />
      ) : (
        <>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <StatCard
              label="Active channels"
              value={stats.activeChannels}
              color="success.main"
            />
            <StatCard label="Pizzas prepared" value={stats.channelsCreated} />
            <StatCard
              label="Downloads started"
              value={stats.downloadsStarted}
            />
            <StatCard
              label="Reported"
              value={stats.channelsReported}
              color="error.main"
            />
          </Box>

          <Card variant="outlined" sx={{ width: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Recent activity
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {stats.recent.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No activity yet. Be the first to share a slice!
                </Typography>
              ) : (
                <List dense disablePadding>
                  {stats.recent.map((ev, i) => (
                    <ListItem key={`${ev.at}-${i}`} disableGutters>
                      <ListItemText
                        primary={EVENT_LABEL[ev.type]}
                        secondary={timeAgo(ev.at)}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ReturnHome />
    </Stack>
  )
}
