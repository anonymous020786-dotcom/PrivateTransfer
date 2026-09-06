'use client'

import * as React from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import KeyIcon from '@mui/icons-material/Key'

type KeyMeta = {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ApiKeysPanel(): React.ReactElement {
  const [keys, setKeys] = React.useState<KeyMeta[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [newName, setNewName] = React.useState('')
  const [creating, setCreating] = React.useState(false)
  const [newKey, setNewKey] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    try {
      const res = await fetch('/api/keys')
      const j = await res.json()
      if (j.error) {
        setError(j.error)
        setKeys([])
      } else setKeys(j.keys ?? [])
    } catch {
      setError('Failed to load API keys.')
      setKeys([])
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error ?? 'Failed to create key.')
        return
      }
      setNewKey(j.key)
      setNewName('')
      await load()
    } catch {
      setError('Network error.')
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/keys/${id}`, { method: 'DELETE' })
      setKeys((prev) => prev?.filter((k) => k.id !== id) ?? null)
    } catch {
      setError('Failed to delete key.')
    } finally {
      setDeletingId(null)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_e) {
      /* clipboard unavailable */
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          API Keys
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Use API keys to create transfers programmatically via the REST API.
          Each key authenticates as your account.
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Create */}
      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              label="Key name"
              placeholder="e.g. My script, CI pipeline"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              size="small"
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { maxLength: 100 } }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create()
              }}
            />
            <Button
              variant="contained"
              startIcon={
                creating ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AddIcon />
                )
              }
              onClick={create}
              disabled={!newName.trim() || creating}
              sx={{ flexShrink: 0 }}
            >
              Generate key
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Key list */}
      {keys === null ? (
        <CircularProgress sx={{ display: 'block', mx: 'auto' }} />
      ) : keys.length === 0 ? (
        <Stack
          spacing={1}
          sx={{ alignItems: 'center', py: 4, color: 'text.secondary' }}
        >
          <KeyIcon sx={{ fontSize: 44, opacity: 0.4 }} />
          <Typography variant="body2">No API keys yet.</Typography>
        </Stack>
      ) : (
        <Stack spacing={1.5}>
          {keys.map((k) => (
            <Card key={k.id} variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                  <KeyIcon
                    sx={{
                      color: 'text.secondary',
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  />
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700 }}
                      noWrap
                    >
                      {k.name}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ flexWrap: 'wrap', alignItems: 'center' }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Created {formatDate(k.createdAt)}
                      </Typography>
                      {k.lastUsedAt && (
                        <Typography variant="caption" color="text.secondary">
                          · Last used {formatDate(k.lastUsedAt)}
                        </Typography>
                      )}
                      {!k.lastUsedAt && (
                        <Chip
                          label="Never used"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Stack>
                  <Tooltip title="Revoke key">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => remove(k.id)}
                        disabled={deletingId === k.id}
                      >
                        {deletingId === k.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Usage docs */}
      <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Usage
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            component="div"
            sx={{
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.8,
            }}
          >
            {`POST /api/transfer/create\nAuthorization: Bearer <your-key>\nContent-Type: application/json\n\n{ "files": [...], "title": "...", ... }`}
          </Typography>
        </CardContent>
      </Card>

      {/* New key reveal dialog */}
      <Dialog
        open={!!newKey}
        onClose={() => setNewKey(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Your new API key</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="warning">
              Copy this key now — it will never be shown again.
            </Alert>
            <Stack direction="row" spacing={1}>
              <TextField
                value={newKey ?? ''}
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    readOnly: true,
                    sx: { fontFamily: 'monospace', fontSize: 13 },
                  },
                }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                <IconButton
                  onClick={() => copy(newKey ?? '')}
                  color={copied ? 'success' : 'default'}
                >
                  {copied ? <CheckIcon /> : <ContentCopyIcon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setNewKey(null)}>
            Done, I saved it
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
