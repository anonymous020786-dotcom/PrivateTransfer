'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '../../supabase/client'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import InboxIcon from '@mui/icons-material/Inbox'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import QRCode from 'react-qr-code'

type Stage = 'idle' | 'creating' | 'done' | 'error'

type CollectSummary = {
  slug: string
  title: string
  description: string
  expiresAt: string
  maxFiles: number
  files: {
    name: string
    size: number
    type: string
    uploadedAt: string
    uploaderNote?: string
  }[]
  active: boolean
  createdAt: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function daysLeft(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

// ─── Collect List ────────────────────────────────────────────────────────────
function CollectList({
  onCreateNew,
}: {
  onCreateNew: () => void
}): React.ReactElement {
  const [collects, setCollects] = React.useState<CollectSummary[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [copiedSlug, setCopiedSlug] = React.useState<string | null>(null)
  const [togglingSlug, setTogglingSlug] = React.useState<string | null>(null)
  const [deletingSlug, setDeletingSlug] = React.useState<string | null>(null)
  const [origin, setOrigin] = React.useState('')
  React.useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  React.useEffect(() => {
    fetch('/api/collect/list')
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error)
        else setCollects(j.collects ?? [])
      })
      .catch(() => setError('Failed to load your file requests.'))
  }, [])

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`${origin}/collect/${slug}`)
      setCopiedSlug(slug)
      setTimeout(() => setCopiedSlug(null), 2000)
    } catch (_e) {
      /* clipboard unavailable */
    }
  }

  const handleDelete = async (slug: string) => {
    if (!confirm('Delete this file request? This cannot be undone.')) return
    setDeletingSlug(slug)
    try {
      const res = await fetch(`/api/collect/${slug}`, { method: 'DELETE' })
      if (res.ok) {
        setCollects((prev) => prev?.filter((c) => c.slug !== slug) ?? prev)
      }
    } catch (_e) {
      /* fetch failed */
    }
    setDeletingSlug(null)
  }

  const toggleActive = async (slug: string, current: boolean) => {
    setTogglingSlug(slug)
    try {
      await fetch(`/api/collect/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !current }),
      })
      setCollects((prev) =>
        prev
          ? prev.map((c) => (c.slug === slug ? { ...c, active: !current } : c))
          : prev,
      )
    } catch (_e) {
      /* fetch failed */
    }
    setTogglingSlug(null)
  }

  if (error) return <Alert severity="error">{error}</Alert>
  if (!collects)
    return <CircularProgress sx={{ display: 'block', mx: 'auto' }} />

  if (collects.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2} sx={{ alignItems: 'center', py: 4 }}>
            <InboxIcon sx={{ fontSize: 56, color: 'text.secondary' }} />
            <Typography color="text.secondary">
              No file requests yet.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onCreateNew}
            >
              Create your first request
            </Button>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Stack spacing={2}>
      {collects.map((c) => {
        const left = daysLeft(c.expiresAt)
        const expired = left <= 0
        const collectUrl = `${origin}/collect/${c.slug}`
        return (
          <Card
            key={c.slug}
            variant="outlined"
            sx={{ opacity: expired ? 0.6 : 1 }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  sx={{
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700 }}
                      noWrap
                    >
                      {c.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Created {formatDate(c.createdAt)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                    <Tooltip
                      title={copiedSlug === c.slug ? 'Copied!' : 'Copy link'}
                    >
                      <IconButton size="small" onClick={() => copyLink(c.slug)}>
                        {copiedSlug === c.slug ? (
                          <CheckIcon fontSize="small" color="success" />
                        ) : (
                          <ContentCopyIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open upload page">
                      <IconButton
                        size="small"
                        component="a"
                        href={collectUrl}
                        target="_blank"
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip
                      title={
                        c.active
                          ? 'Pause (stop accepting uploads)'
                          : 'Resume (accept uploads)'
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          disabled={expired || togglingSlug === c.slug}
                          onClick={() => toggleActive(c.slug, c.active)}
                        >
                          {togglingSlug === c.slug ? (
                            <CircularProgress size={16} />
                          ) : c.active ? (
                            <PauseCircleIcon fontSize="small" color="primary" />
                          ) : (
                            <PlayCircleIcon fontSize="small" color="disabled" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete request">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={deletingSlug === c.slug}
                          onClick={() => handleDelete(c.slug)}
                        >
                          {deletingSlug === c.slug ? (
                            <CircularProgress size={16} />
                          ) : (
                            <DeleteIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Chip
                    label={expired ? 'Expired' : `${left}d left`}
                    size="small"
                    color={
                      expired ? 'default' : left <= 3 ? 'warning' : 'default'
                    }
                    variant={expired ? 'outlined' : 'filled'}
                  />
                  <Chip
                    label={`${c.files.length}/${c.maxFiles} files`}
                    size="small"
                    color={c.files.length > 0 ? 'success' : 'default'}
                  />
                  <Chip
                    label={expired ? 'Expired' : c.active ? 'Open' : 'Paused'}
                    size="small"
                    color={!expired && c.active ? 'success' : 'default'}
                    variant="outlined"
                  />
                </Stack>

                {c.description && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block' }}
                  >
                    {c.description.length > 120
                      ? c.description.slice(0, 117) + '…'
                      : c.description}
                  </Typography>
                )}

                <Button
                  variant="outlined"
                  size="small"
                  href={`/collect/${c.slug}/received`}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  View received files ({c.files.length})
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )
      })}
    </Stack>
  )
}

// ─── Create Form ─────────────────────────────────────────────────────────────
function CreateForm({
  onCreated,
}: {
  onCreated: (slug: string) => void
}): React.ReactElement {
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [expiryDays, setExpiryDays] = React.useState(30)
  const [maxFiles, setMaxFiles] = React.useState(20)
  const [targetPerson, setTargetPerson] = React.useState(false)
  const [requestedFromEmail, setRequestedFromEmail] = React.useState('')
  const [requestedFromName, setRequestedFromName] = React.useState('')
  const [stage, setStage] = React.useState<Stage>('idle')
  const [error, setError] = React.useState<string | null>(null)

  const create = async () => {
    if (!title.trim()) return
    setStage('creating')
    setError(null)
    try {
      const res = await fetch('/api/collect/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          expiryDays,
          maxFiles,
          requestedFromEmail:
            targetPerson && requestedFromEmail ? requestedFromEmail : undefined,
          requestedFromName:
            targetPerson && requestedFromName ? requestedFromName : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to create.')
        setStage('error')
        return
      }
      onCreated(json.slug)
    } catch {
      setError('Network error. Please try again.')
      setStage('error')
    }
  }

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Request title *"
        placeholder="e.g. Send me your photos, Project files, Invoice"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        slotProps={{ htmlInput: { maxLength: 200 } }}
        size="small"
        fullWidth
        required
      />
      <TextField
        label="Instructions for uploaders (optional)"
        placeholder="e.g. Please send the high-resolution versions"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        slotProps={{ htmlInput: { maxLength: 1000 } }}
        size="small"
        fullWidth
        multiline
        rows={2}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl size="small" fullWidth>
          <InputLabel>Link expires after</InputLabel>
          <Select
            value={expiryDays}
            label="Link expires after"
            onChange={(e) => setExpiryDays(Number(e.target.value))}
          >
            <MenuItem value={7}>7 days</MenuItem>
            <MenuItem value={14}>14 days</MenuItem>
            <MenuItem value={30}>30 days</MenuItem>
            <MenuItem value={90}>90 days</MenuItem>
            <MenuItem value={180}>180 days</MenuItem>
            <MenuItem value={365}>1 year</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Max files</InputLabel>
          <Select
            value={maxFiles}
            label="Max files"
            onChange={(e) => setMaxFiles(Number(e.target.value))}
          >
            <MenuItem value={1}>1 file</MenuItem>
            <MenuItem value={5}>5 files</MenuItem>
            <MenuItem value={10}>10 files</MenuItem>
            <MenuItem value={20}>20 files</MenuItem>
            <MenuItem value={50}>50 files</MenuItem>
            <MenuItem value={100}>100 files</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      {/* Request from specific person */}
      <Stack spacing={1}>
        <FormControlLabel
          control={
            <Switch
              checked={targetPerson}
              onChange={(e) => setTargetPerson(e.target.checked)}
              size="small"
            />
          }
          label={
            <Stack>
              <Typography variant="body2">
                Request from a specific person
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Send an invitation email to one person asking them to upload
              </Typography>
            </Stack>
          }
        />
        {targetPerson && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Their email *"
              type="email"
              value={requestedFromEmail}
              onChange={(e) => setRequestedFromEmail(e.target.value)}
              size="small"
              fullWidth
              required
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <TextField
              label="Their name (optional)"
              value={requestedFromName}
              onChange={(e) => setRequestedFromName(e.target.value)}
              size="small"
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
          </Stack>
        )}
      </Stack>

      <Button
        variant="contained"
        size="large"
        onClick={create}
        disabled={
          !title.trim() ||
          stage === 'creating' ||
          (targetPerson && !requestedFromEmail.includes('@'))
        }
        startIcon={
          stage === 'creating' ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <InboxIcon />
          )
        }
        fullWidth
      >
        {stage === 'creating'
          ? 'Creating…'
          : targetPerson
            ? 'Create & send invitation'
            : 'Create file request'}
      </Button>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textAlign: 'center' }}
      >
        You must be signed in to create a file request. Uploaders don't need an
        account.
      </Typography>
    </Stack>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CollectPage(): React.ReactElement {
  const router = useRouter()
  const [view, setView] = React.useState<'list' | 'create'>('list')
  const [resultSlug, setResultSlug] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const [origin, setOrigin] = React.useState('')
  const [authChecked, setAuthChecked] = React.useState(false)

  React.useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setAuthChecked(true)
      return
    }
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!data.user) router.replace('/login?next=/collect')
        else setAuthChecked(true)
      })
      .catch(() => {
        setAuthChecked(true)
      })
  }, [router])

  if (!authChecked) return <></>

  const collectUrl = resultSlug ? `${origin}/collect/${resultSlug}` : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(collectUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_e) {
      /* clipboard unavailable */
    }
  }

  const handleCreated = (slug: string) => {
    setResultSlug(slug)
    setView('list')
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <InboxIcon color="primary" />
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                File requests
              </Typography>
            </Stack>
            <Typography color="text.secondary" variant="body2">
              Create a link so others can upload files directly to you — no
              account needed on their end.
            </Typography>
          </Stack>
          {view === 'list' ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setView('create')}
            >
              New request
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<CloseIcon />}
              onClick={() => setView('list')}
            >
              Cancel
            </Button>
          )}
        </Stack>

        {/* Success banner after creation */}
        {resultSlug && view === 'list' && (
          <Card
            variant="outlined"
            sx={{ bgcolor: 'success.50', borderColor: 'success.main' }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={2}>
                <Alert severity="success" icon={<CheckIcon />}>
                  File request created! Share this link to receive files.
                </Alert>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: 'flex-start' }}
                >
                  <Stack
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1,
                      flexShrink: 0,
                      bgcolor: 'white',
                    }}
                  >
                    {origin && <QRCode value={collectUrl} size={96} />}
                  </Stack>
                  <Stack spacing={1} sx={{ flex: 1, width: '100%' }}>
                    <TextField
                      value={collectUrl}
                      size="small"
                      fullWidth
                      slotProps={{ input: { readOnly: true } }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                        onClick={copy}
                        color={copied ? 'success' : 'primary'}
                        sx={{ flex: 1 }}
                      >
                        {copied ? 'Copied!' : 'Copy link'}
                      </Button>
                      <Button
                        variant="outlined"
                        href={`/collect/${resultSlug}/received`}
                      >
                        View received
                      </Button>
                    </Stack>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Main content */}
        {view === 'create' ? (
          <Card variant="outlined">
            <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
              <Stack spacing={1} sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  New file request
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Chip label="No account needed for uploaders" size="small" />
                  <Chip
                    label="Email notification when files arrive"
                    size="small"
                  />
                  <Chip label="Up to 365-day links" size="small" />
                </Stack>
              </Stack>
              <Divider sx={{ mb: 3 }} />
              <CreateForm onCreated={handleCreated} />
            </CardContent>
          </Card>
        ) : (
          <CollectList onCreateNew={() => setView('create')} />
        )}
      </Stack>
    </Container>
  )
}
