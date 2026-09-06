'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import HistoryIcon from '@mui/icons-material/History'

type Transfer = {
  id: string
  slug: string | null
  title: string | null
  files: string[]
  file_count: number
  total_bytes: number
  created_at: string
}

function formatBytes(n: number): string {
  if (!n) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`
}

export default function TransferHistory(): React.ReactElement {
  const [items, setItems] = React.useState<Transfer[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    try {
      const res = await fetch('/api/transfers', { cache: 'no-store' })
      const data = await res.json()
      if (data.error && !data.transfers?.length) setError(data.error)
      setItems(data.transfers ?? [])
    } catch {
      setError('Could not load history.')
      setItems([])
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const remove = async (id: string) => {
    setItems((prev) => prev?.filter((t) => t.id !== id) ?? null)
    await fetch(`/api/transfers?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {})
  }

  if (items === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error && items.length === 0) {
    return (
      <Alert severity="info">
        Transfer history isn’t set up yet. Ask the admin to run
        <code> supabase/transfers.sql</code> in Supabase. ({error})
      </Alert>
    )
  }

  if (items.length === 0) {
    return (
      <Stack
        spacing={1}
        sx={{
          alignItems: 'center',
          textAlign: 'center',
          py: 6,
          color: 'text.secondary',
        }}
      >
        <HistoryIcon sx={{ fontSize: 44, opacity: 0.5 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          No transfers yet
        </Typography>
        <Typography variant="body2">
          Files you send will appear here for your records.
        </Typography>
      </Stack>
    )
  }

  return (
    <Stack spacing={1.5}>
      {items.map((t) => (
        <Card key={t.id} variant="outlined">
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <InsertDriveFileOutlinedIcon color="action" />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                  {t.title || t.files[0] || 'Transfer'}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: 'wrap', mt: 0.5 }}
                >
                  <Chip
                    size="small"
                    label={`${t.file_count} file${t.file_count === 1 ? '' : 's'}`}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={formatBytes(t.total_bytes)}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ alignSelf: 'center' }}
                  >
                    {new Date(t.created_at).toLocaleString()}
                  </Typography>
                </Stack>
              </Box>
              <Tooltip title="Remove from history">
                <IconButton
                  size="small"
                  onClick={() => remove(t.id)}
                  aria-label="Delete entry"
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
