'use client'

import * as React from 'react'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import LinearProgress from '@mui/material/LinearProgress'
import LinkIcon from '@mui/icons-material/Link'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckIcon from '@mui/icons-material/Check'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LockIcon from '@mui/icons-material/Lock'
import FolderIcon from '@mui/icons-material/Folder'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import BarChartIcon from '@mui/icons-material/BarChart'
import EditIcon from '@mui/icons-material/Edit'
import PublicIcon from '@mui/icons-material/Public'
import DownloadIcon from '@mui/icons-material/Download'
import Checkbox from '@mui/material/Checkbox'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'

type TransferSummary = {
  slug: string
  title: string
  message: string
  fileCount: number
  totalSize: number
  expiresAt: string
  expiryDays: number
  downloadCount: number
  maxDownloads: number | null
  passwordProtected: boolean
  notifyEmail?: string | null
  notifyEveryDownload?: boolean
  webhookUrl?: string | null
  createdAt: string
  workspaceId?: string | null
  boardIds?: string[]
  passwordHint?: string | null
}

type DownloadEvent = { at: string; ipHash: string; country: string }
type CountryEntry = { country: string; count: number }

type Analytics = {
  downloadCount: number
  downloadEvents: DownloadEvent[]
  countries: CountryEntry[]
}

function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${n} B`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Edit Dialog ───────────────────────────────────────────────────────────────
type EditDialogProps = {
  open: boolean
  transfer: TransferSummary
  onClose: () => void
  onSaved: (slug: string, patch: Partial<TransferSummary>) => void
}

function EditDialog({
  open,
  transfer,
  onClose,
  onSaved,
}: EditDialogProps): React.ReactElement {
  const [title, setTitle] = React.useState(transfer.title)
  const [message, setMessage] = React.useState(transfer.message)
  const [maxDownloads, setMaxDownloads] = React.useState<string>(
    transfer.maxDownloads !== null ? String(transfer.maxDownloads) : '',
  )
  const [extendDays, setExtendDays] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [passwordHint, setPasswordHint] = React.useState(
    transfer.passwordHint ?? '',
  )
  const [clearPassword, setClearPassword] = React.useState(false)
  const [notifyEmail, setNotifyEmail] = React.useState(
    transfer.notifyEmail ?? '',
  )
  const [notifyEveryDownload, setNotifyEveryDownload] = React.useState(
    transfer.notifyEveryDownload ?? false,
  )
  const [webhookUrl, setWebhookUrl] = React.useState(transfer.webhookUrl ?? '')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {}
      if (title !== transfer.title) body.title = title
      if (message !== transfer.message) body.message = message
      if (maxDownloads !== '' && Number(maxDownloads) !== transfer.maxDownloads)
        body.maxDownloads = Number(maxDownloads)
      if (maxDownloads === '' && transfer.maxDownloads !== null)
        body.maxDownloads = null
      if (extendDays) body.extendDays = Number(extendDays)
      if (password) body.password = password
      if (passwordHint !== (transfer.passwordHint ?? ''))
        body.passwordHint = passwordHint
      if (clearPassword) body.clearPassword = true
      if (notifyEmail !== (transfer.notifyEmail ?? ''))
        body.notifyEmail = notifyEmail
      if (notifyEveryDownload !== (transfer.notifyEveryDownload ?? false))
        body.notifyEveryDownload = notifyEveryDownload
      if (webhookUrl !== (transfer.webhookUrl ?? ''))
        body.webhookUrl = webhookUrl

      const res = await fetch(`/api/transfer/${transfer.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Save failed.')
        return
      }

      const patchedSummary: Partial<TransferSummary> = {}
      if (title !== transfer.title) patchedSummary.title = title
      if (message !== transfer.message) patchedSummary.message = message
      if (maxDownloads !== '')
        patchedSummary.maxDownloads = Number(maxDownloads)
      else if (transfer.maxDownloads !== null)
        patchedSummary.maxDownloads = null
      if (clearPassword) patchedSummary.passwordProtected = false
      else if (password) patchedSummary.passwordProtected = true
      if (extendDays && json.transfer?.expiresAt)
        patchedSummary.expiresAt = json.transfer.expiresAt

      onSaved(transfer.slug, patchedSummary)
      onClose()
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit transfer</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label="Max downloads (blank = unlimited)"
            value={maxDownloads}
            onChange={(e) => setMaxDownloads(e.target.value.replace(/\D/, ''))}
            size="small"
            fullWidth
            placeholder="Unlimited"
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Extend expiry</InputLabel>
            <Select
              label="Extend expiry"
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value as string)}
            >
              <MenuItem value="">No change</MenuItem>
              <MenuItem value="7">+7 days</MenuItem>
              <MenuItem value="14">+14 days</MenuItem>
              <MenuItem value="30">+30 days</MenuItem>
              <MenuItem value="90">+90 days</MenuItem>
              <MenuItem value="180">+180 days</MenuItem>
              <MenuItem value="365">+365 days</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label={
              transfer.passwordProtected
                ? 'Change password (blank = keep current)'
                : 'Add password (blank = no password)'
            }
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (e.target.value) setClearPassword(false)
            }}
            size="small"
            fullWidth
            type="password"
          />
          {transfer.passwordProtected && (
            <Button
              size="small"
              color={clearPassword ? 'error' : 'inherit'}
              variant={clearPassword ? 'contained' : 'outlined'}
              onClick={() => {
                setClearPassword((p) => !p)
                setPassword('')
              }}
            >
              {clearPassword ? 'Will remove password' : 'Remove password'}
            </Button>
          )}
          {(transfer.passwordProtected || password) && !clearPassword && (
            <TextField
              label="Password hint (blank = none)"
              value={passwordHint}
              onChange={(e) => setPasswordHint(e.target.value.slice(0, 100))}
              size="small"
              fullWidth
              placeholder="e.g. your favourite colour"
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
          )}
          <TextField
            label="Notify email (blank = disabled)"
            type="email"
            value={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.value)}
            size="small"
            fullWidth
            placeholder="your@email.com"
          />
          <FormControlLabel
            control={
              <Switch
                checked={notifyEveryDownload}
                onChange={(e) => setNotifyEveryDownload(e.target.checked)}
                size="small"
                disabled={!notifyEmail}
              />
            }
            label={
              <Typography variant="body2">
                Notify on every download (not just first)
              </Typography>
            }
          />
          <TextField
            label="Webhook URL (blank = disabled)"
            placeholder="https://your-server.com/hook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            size="small"
            fullWidth
            helperText="POST called with JSON on every download event"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────
function AnalyticsPanel({ slug }: { slug: string }): React.ReactElement {
  const [analytics, setAnalytics] = React.useState<Analytics | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetch(`/api/transfer/${slug}/analytics`)
      .then((r) =>
        r.ok
          ? r.json()
          : r.json().then((j) => Promise.reject(j.error ?? 'Failed')),
      )
      .then(setAnalytics)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <LinearProgress sx={{ my: 1 }} />
  if (error)
    return (
      <Alert severity="error" sx={{ mt: 1 }}>
        {error}
      </Alert>
    )
  if (!analytics) return <></>

  const maxCount = analytics.countries[0]?.count ?? 1

  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <DownloadIcon fontSize="small" color="action" />
        <Typography variant="caption" color="text.secondary">
          {analytics.downloadCount} total download
          {analytics.downloadCount !== 1 ? 's' : ''}
        </Typography>
      </Stack>

      {analytics.countries.length > 0 && (
        <Box>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', mb: 0.75 }}
          >
            <PublicIcon fontSize="small" color="action" />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Country breakdown
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            {analytics.countries.slice(0, 10).map(({ country, count }) => (
              <Stack
                key={country}
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center' }}
              >
                <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>
                  {country}
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 0.5,
                    height: 8,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      bgcolor: 'primary.main',
                      borderRadius: 0.5,
                      width: `${(count / maxCount) * 100}%`,
                    }}
                  />
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: 24, textAlign: 'right', flexShrink: 0 }}
                >
                  {count}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {analytics.downloadEvents.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Recent downloads
          </Typography>
          <Stack
            spacing={0.25}
            sx={{ mt: 0.5, maxHeight: 160, overflowY: 'auto' }}
          >
            {analytics.downloadEvents
              .slice()
              .reverse()
              .slice(0, 20)
              .map((ev, i) => (
                <Stack
                  key={i}
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: 'center',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: 'monospace', flexShrink: 0, width: 28 }}
                  >
                    {ev.country !== 'XX' ? ev.country : '??'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(ev.at)}
                  </Typography>
                </Stack>
              ))}
          </Stack>
        </Box>
      )}

      {analytics.downloadEvents.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          No downloads yet.
        </Typography>
      )}
    </Stack>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function HistoryList(): React.ReactElement {
  const [transfers, setTransfers] = React.useState<TransferSummary[] | null>(
    null,
  )
  const [error, setError] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState<Set<string>>(new Set())
  const [copied, setCopied] = React.useState<string | null>(null)
  const [snackbar, setSnackbar] = React.useState('')
  const [analyticsOpen, setAnalyticsOpen] = React.useState<Set<string>>(
    new Set(),
  )
  const [editSlug, setEditSlug] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<
    'all' | 'active' | 'expiring'
  >('all')
  const [workspaceFilter, setWorkspaceFilter] = React.useState<string>('all')
  const [workspaces, setWorkspaces] = React.useState<
    Array<{ id: string; name: string }>
  >([])
  const [storage, setStorage] = React.useState<{
    totalBytes: number
    fileCount: number
    transferCount: number
  } | null>(null)

  React.useEffect(() => {
    fetch('/api/transfer/history')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load transfers.')
        return r.json()
      })
      .then(setTransfers)
      .catch((e) => setError(e.message))
    fetch('/api/transfer/storage')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && !j.error) setStorage(j)
      })
      .catch(() => {})
    fetch('/api/workspaces')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.workspaces) setWorkspaces(j.workspaces)
      })
      .catch(() => {})
  }, [])

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/transfer/${slug}`,
      )
      setCopied(slug)
      setTimeout(() => setCopied(null), 2000)
    } catch (_e) {
      /* clipboard unavailable */
    }
  }

  const handleDelete = async (slug: string) => {
    setDeleting((prev) => new Set(prev).add(slug))
    try {
      const res = await fetch(`/api/transfer/${slug}`, { method: 'DELETE' })
      if (res.ok) {
        setTransfers((prev) => prev?.filter((t) => t.slug !== slug) ?? null)
        setSnackbar('Transfer deleted and files removed.')
      } else {
        const json = await res.json().catch(() => ({}))
        setSnackbar(json.error ?? 'Failed to delete.')
      }
    } catch {
      setSnackbar('Network error.')
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev)
        next.delete(slug)
        return next
      })
    }
  }

  const toggleAnalytics = (slug: string) => {
    setAnalyticsOpen((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const toggleSelect = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!filteredTransfers) return
    if (selected.size === filteredTransfers.length) setSelected(new Set())
    else setSelected(new Set(filteredTransfers.map((t) => t.slug)))
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    setBulkDeleting(true)
    const slugs = [...selected]
    await Promise.all(
      slugs.map((slug) =>
        fetch(`/api/transfer/${slug}`, { method: 'DELETE' }).catch(() => {}),
      ),
    )
    setTransfers((prev) => prev?.filter((t) => !selected.has(t.slug)) ?? null)
    setSelected(new Set())
    setSnackbar(
      `${slugs.length} transfer${slugs.length !== 1 ? 's' : ''} deleted.`,
    )
    setBulkDeleting(false)
  }

  const handleSaved = (slug: string, patch: Partial<TransferSummary>) => {
    setTransfers(
      (prev) =>
        prev?.map((t) => (t.slug === slug ? { ...t, ...patch } : t)) ?? null,
    )
    setSnackbar('Transfer updated.')
  }

  const editTransfer = transfers?.find((t) => t.slug === editSlug)

  const filteredTransfers = React.useMemo(() => {
    if (!transfers) return null
    let list = transfers
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.message.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q),
      )
    }
    if (statusFilter === 'active') {
      list = list.filter(
        (t) =>
          Math.ceil((new Date(t.expiresAt).getTime() - Date.now()) / 86400000) >
          2,
      )
    } else if (statusFilter === 'expiring') {
      list = list.filter(
        (t) =>
          Math.ceil(
            (new Date(t.expiresAt).getTime() - Date.now()) / 86400000,
          ) <= 2,
      )
    }
    if (workspaceFilter !== 'all') {
      list = list.filter((t) => t.workspaceId === workspaceFilter)
    }
    return list
  }, [transfers, search, statusFilter, workspaceFilter])

  const MAX_STORAGE_BYTES = 200 * 1024 * 1024 * 1024 // 200 GB display cap

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            My transfers
          </Typography>
          <Typography color="text.secondary">
            Active transfers you've sent — files are deleted automatically when
            they expire.
          </Typography>
        </Stack>
        <Button variant="contained" href="/transfer">
          New transfer
        </Button>
      </Stack>

      {/* Storage usage bar */}
      {storage && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack spacing={0.75}>
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Storage used
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(storage.totalBytes)} across{' '}
                  {storage.transferCount} transfer
                  {storage.transferCount !== 1 ? 's' : ''} · {storage.fileCount}{' '}
                  file{storage.fileCount !== 1 ? 's' : ''}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(
                  100,
                  (storage.totalBytes / MAX_STORAGE_BYTES) * 100,
                )}
                sx={{ borderRadius: 1, height: 6 }}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Search + filter bar */}
      {transfers !== null && transfers.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search by title, message or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 180 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active (&gt;2d)</MenuItem>
              <MenuItem value="expiring">Expiring soon</MenuItem>
            </Select>
          </FormControl>
          {workspaces.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Workspace</InputLabel>
              <Select
                label="Workspace"
                value={workspaceFilter}
                onChange={(e) => setWorkspaceFilter(e.target.value)}
              >
                <MenuItem value="all">All workspaces</MenuItem>
                {workspaces.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      )}

      {/* Bulk action bar */}
      {filteredTransfers !== null && filteredTransfers.length > 0 && (
        <Stack direction="row" sx={{ alignItems: 'center', mb: 1.5, gap: 1 }}>
          <Checkbox
            size="small"
            checked={
              selected.size > 0 && selected.size === filteredTransfers.length
            }
            indeterminate={
              selected.size > 0 && selected.size < filteredTransfers.length
            }
            onChange={toggleSelectAll}
          />
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
          </Typography>
          {selected.size > 0 && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={
                bulkDeleting ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <DeleteIcon />
                )
              }
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              Delete {selected.size}
            </Button>
          )}
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {transfers === null && !error && (
        <Stack sx={{ alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Stack>
      )}

      {transfers !== null && transfers.length === 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2} sx={{ alignItems: 'center', py: 4 }}>
              <FolderIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
              <Typography color="text.secondary">
                No active transfers yet.
              </Typography>
              <Button variant="contained" href="/transfer">
                Send your first transfer
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {filteredTransfers !== null &&
        transfers !== null &&
        transfers.length > 0 &&
        filteredTransfers.length === 0 && (
          <Alert severity="info">
            No transfers match your search. Try different keywords.
          </Alert>
        )}

      {filteredTransfers !== null && filteredTransfers.length > 0 && (
        <Stack spacing={2}>
          {filteredTransfers.map((t) => {
            const daysLeft = Math.ceil(
              (new Date(t.expiresAt).getTime() - Date.now()) / 86400000,
            )
            const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/transfer/${t.slug}`
            const analyticsShown = analyticsOpen.has(t.slug)
            return (
              <Card
                key={t.slug}
                variant="outlined"
                sx={{
                  outline: selected.has(t.slug) ? '2px solid' : 'none',
                  outlineColor: 'primary.main',
                }}
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
                      <Checkbox
                        size="small"
                        checked={selected.has(t.slug)}
                        onChange={() => toggleSelect(t.slug)}
                        sx={{ mt: -0.5, ml: -1 }}
                      />
                      <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 700 }}
                          noWrap
                        >
                          {t.title || `Transfer ${t.slug}`}
                        </Typography>
                        {t.message && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {t.message}
                          </Typography>
                        )}
                      </Stack>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ flexShrink: 0 }}
                      >
                        <Tooltip title="Open download page">
                          <IconButton
                            size="small"
                            component="a"
                            href={url}
                            target="_blank"
                            rel="noopener"
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={copied === t.slug ? 'Copied!' : 'Copy link'}
                        >
                          <IconButton
                            size="small"
                            onClick={() => copyLink(t.slug)}
                            color={copied === t.slug ? 'success' : 'default'}
                          >
                            {copied === t.slug ? (
                              <CheckIcon fontSize="small" />
                            ) : (
                              <LinkIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Analytics">
                          <IconButton
                            size="small"
                            onClick={() => toggleAnalytics(t.slug)}
                            color={analyticsShown ? 'primary' : 'default'}
                          >
                            <BarChartIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit transfer">
                          <IconButton
                            size="small"
                            onClick={() => setEditSlug(t.slug)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete transfer and files">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(t.slug)}
                            disabled={deleting.has(t.slug)}
                          >
                            {deleting.has(t.slug) ? (
                              <CircularProgress size={16} />
                            ) : (
                              <DeleteIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{ flexWrap: 'wrap' }}
                    >
                      <Chip
                        icon={<AccessTimeIcon />}
                        label={
                          daysLeft > 0 ? `${daysLeft}d left` : 'Expiring soon'
                        }
                        size="small"
                        color={daysLeft <= 2 ? 'warning' : 'default'}
                      />
                      <Chip
                        label={`${t.fileCount} file${t.fileCount !== 1 ? 's' : ''} · ${formatBytes(t.totalSize)}`}
                        size="small"
                      />
                      <Chip
                        label={`${t.downloadCount}${t.maxDownloads ? `/${t.maxDownloads}` : ''} download${t.downloadCount !== 1 ? 's' : ''}`}
                        size="small"
                        color={
                          t.maxDownloads !== null &&
                          t.downloadCount >= t.maxDownloads
                            ? 'error'
                            : 'default'
                        }
                      />
                      {t.passwordProtected && (
                        <Chip
                          icon={<LockIcon />}
                          label="Password"
                          size="small"
                          color="info"
                        />
                      )}
                    </Stack>

                    <Divider />

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ flex: 1 }}
                      >
                        {url}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                          copied === t.slug ? <CheckIcon /> : <LinkIcon />
                        }
                        onClick={() => copyLink(t.slug)}
                        color={copied === t.slug ? 'success' : 'inherit'}
                        sx={{ flexShrink: 0 }}
                      >
                        {copied === t.slug ? 'Copied!' : 'Copy'}
                      </Button>
                    </Box>

                    {/* Analytics panel */}
                    <Collapse in={analyticsShown} unmountOnExit>
                      <Divider />
                      <AnalyticsPanel slug={t.slug} />
                    </Collapse>
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      )}

      {editTransfer && (
        <EditDialog
          open={!!editSlug}
          transfer={editTransfer}
          onClose={() => setEditSlug(null)}
          onSaved={handleSaved}
        />
      )}

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </Container>
  )
}
