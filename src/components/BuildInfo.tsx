'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import { brand } from '../brand'

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0'
const COMMIT = process.env.NEXT_PUBLIC_COMMIT_SHA || 'dev'
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || ''

function relativeBuild(iso: string): string {
  if (!iso) return 'local'
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  const h = Math.floor(diff / 3600000)
  if (h > 0) return `${h}h ago`
  const m = Math.floor(diff / 60000)
  return m > 0 ? `${m}m ago` : 'just now'
}

// Dynamic build/status strip for the footer. Shows a live operational pulse,
// app version, commit, build age and runtime, with details on hover.
type Health = {
  status: 'ok' | 'degraded'
  redis: 'ok' | 'down' | 'off'
  serverUptimeSec: number
}

export default function BuildInfo(): React.ReactElement {
  const [mounted, setMounted] = React.useState(false)
  const [uptime, setUptime] = React.useState(0)
  const [health, setHealth] = React.useState<Health | null>(null)
  const [online, setOnline] = React.useState(true)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    const id = setInterval(() => setUptime((u) => u + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Poll the live health endpoint so the status reflects the real server.
  React.useEffect(() => {
    let active = true
    const poll = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!res.ok) {
          // Non-2xx (e.g. 403 from WAF) — treat as unknown, not offline
          if (active) setOnline(true)
          return
        }
        const data = (await res.json()) as Health
        if (active) {
          setHealth(data)
          setOnline(true)
        }
      } catch {
        if (active) setOnline(false)
      }
    }
    poll()
    const id = setInterval(poll, 20000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  const state = !online
    ? {
        color: 'error.main',
        rgba: '239,68,68',
        label: 'Reconnecting…',
        chip: 'error' as const,
      }
    : health?.status === 'degraded'
      ? {
          color: 'warning.main',
          rgba: '245,158,11',
          label: 'Degraded performance',
          chip: 'warning' as const,
        }
      : {
          color: 'success.main',
          rgba: '34,197,94',
          label: 'All systems operational',
          chip: 'success' as const,
        }

  const dot = (
    <Box
      component="span"
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: state.color,
        boxShadow: `0 0 0 0 rgba(${state.rgba},0.6)`,
        animation: 'zync-pulse 2s infinite',
        '@keyframes zync-pulse': {
          '0%': { boxShadow: `0 0 0 0 rgba(${state.rgba},0.5)` },
          '70%': { boxShadow: `0 0 0 8px rgba(${state.rgba},0)` },
          '100%': { boxShadow: `0 0 0 0 rgba(${state.rgba},0)` },
        },
      }}
    />
  )

  return (
    <Tooltip
      arrow
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Version: {VERSION}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Commit: {COMMIT}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Built:{' '}
            {mounted
              ? BUILD_TIME
                ? new Date(BUILD_TIME).toLocaleString()
                : 'local dev'
              : '…'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Session: {uptime}s
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Server:{' '}
            {online ? `up ${health?.serverUptimeSec ?? 0}s` : 'unreachable'} ·
            Redis: {health?.redis ?? '—'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Runtime: Next.js 16 · React 19 · WebRTC
          </Typography>
        </Box>
      }
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
          cursor: 'help',
        }}
      >
        <Chip
          size="small"
          variant="outlined"
          color={state.chip}
          icon={<Box sx={{ ml: 1, display: 'flex' }}>{dot}</Box>}
          label={state.label}
          sx={{ fontWeight: 600 }}
        />
        <Typography variant="caption" color="text.secondary">
          {brand.name} v{VERSION}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ·
        </Typography>
        <Link
          href={`${brand.social.github}`}
          target="_blank"
          rel="noopener noreferrer"
          variant="caption"
          underline="hover"
          color="text.secondary"
        >
          {COMMIT}
        </Link>
        <Typography variant="caption" color="text.secondary">
          ·
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          suppressHydrationWarning
        >
          built {mounted ? relativeBuild(BUILD_TIME) : '…'}
        </Typography>
      </Stack>
    </Tooltip>
  )
}
