'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

type System = {
  status: string
  components: Record<string, string>
  uptimeSec: number
  version: string
  users: number | null
  config: {
    backend: string
    auth: string
    storageProvider: string | null
    redisMode: string
    redisLatencyMs: number | null
    emailConfigured: boolean
    dataDir: string | null
    internalScheduler: boolean
  }
  usage: {
    activeTransfers: number
    disk: { bytes: number; files: number } | null
  }
  maintenance: {
    ts: string
    deleted: number
    dispatched: number
    warned: number
    prunedUploads: number
  } | null
  runtime: {
    node: string
    platform: string
    rssBytes: number
    heapUsedBytes: number
  }
}

const COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ok: 'success',
  degraded: 'warning',
  down: 'error',
  off: 'default',
}

function bytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${n} B`
}

function duration(sec: number): string {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`
}

export default function SystemOverview(): React.ReactElement {
  const [sys, setSys] = React.useState<System | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/admin/system')
      const json = await res.json()
      if (!res.ok)
        throw new Error(json.error || 'Could not load system status.')
      setSys(json)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  if (error) return <Alert severity="error">{error}</Alert>
  if (!sys) return <CircularProgress size={24} />

  const tiles = [
    {
      label: 'Active cloud transfers',
      value: String(sys.usage.activeTransfers),
    },
    { label: 'Accounts', value: sys.users === null ? '—' : String(sys.users) },
    {
      label: 'Local data on disk',
      value: sys.usage.disk
        ? `${bytes(sys.usage.disk.bytes)} · ${sys.usage.disk.files} files`
        : '—',
    },
    { label: 'Uptime', value: duration(sys.uptimeSec) },
  ]

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          System
        </Typography>
        <Chip size="small" color={COLORS[sys.status]} label={sys.status} />
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={load}>
          Refresh
        </Button>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {tiles.map((t) => (
          <Grid key={t.label} size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {t.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: 'wrap', rowGap: 1 }}
            >
              {Object.entries(sys.components).map(([k, v]) => (
                <Chip
                  key={k}
                  size="small"
                  variant="outlined"
                  color={COLORS[v]}
                  label={`${k}: ${v}`}
                />
              ))}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Backend <strong>{sys.config.backend}</strong> · accounts{' '}
              <strong>{sys.config.auth}</strong> · storage{' '}
              <strong>{sys.config.storageProvider ?? 'none'}</strong> · data
              store <strong>{sys.config.redisMode}</strong>
              {sys.config.redisLatencyMs !== null &&
                ` (${sys.config.redisLatencyMs} ms)`}{' '}
              · email{' '}
              <strong>
                {sys.config.emailConfigured
                  ? 'SMTP configured'
                  : 'not configured'}
              </strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Scheduler{' '}
              <strong>
                {sys.config.internalScheduler
                  ? 'built-in (every 5 min)'
                  : 'external cron'}
              </strong>
              {' · '}last maintenance{' '}
              {sys.maintenance ? (
                <>
                  <strong>
                    {new Date(sys.maintenance.ts).toLocaleString()}
                  </strong>{' '}
                  — swept {sys.maintenance.deleted}, sent{' '}
                  {sys.maintenance.dispatched} scheduled, warned{' '}
                  {sys.maintenance.warned}, pruned{' '}
                  {sys.maintenance.prunedUploads} uploads
                </>
              ) : (
                <strong>never</strong>
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              v{sys.version} · Node {sys.runtime.node} on {sys.runtime.platform}{' '}
              · RSS {bytes(sys.runtime.rssBytes)} · heap{' '}
              {bytes(sys.runtime.heapUsedBytes)}
              {sys.config.dataDir && ` · data ${sys.config.dataDir}`}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
