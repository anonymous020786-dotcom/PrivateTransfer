'use client'

import * as React from 'react'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Collapse from '@mui/material/Collapse'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Tooltip from '@mui/material/Tooltip'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import LockIcon from '@mui/icons-material/Lock'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import { useRecaptcha } from '../../hooks/useRecaptcha'
import UploadZone from '../../components/transfer/UploadZone'
import UploadProgress, {
  FileProgress,
} from '../../components/transfer/UploadProgress'
import ShareCard from '../../components/transfer/ShareCard'

// 200 GB total per transfer (individual files ≤ 5 GB via single presigned PUT)
const MAX_BYTES = Number(
  process.env.NEXT_PUBLIC_TRANSFER_MAX_BYTES ?? 200 * 1024 * 1024 * 1024,
)

function formatBytes(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(0)} TB`
  if (n >= 1e9) return `${(n / 1e9).toFixed(0)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} MB`
  return `${n} B`
}

const BACKGROUND_PRESETS: { label: string; value: string }[] = [
  { label: 'Default', value: '' },
  {
    label: 'Midnight',
    value: 'linear-gradient(135deg,#0c0c1d 0%,#1a1a4e 100%)',
  },
  { label: 'Sunset', value: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)' },
  { label: 'Ocean', value: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)' },
  { label: 'Forest', value: 'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)' },
  { label: 'Dusk', value: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' },
  { label: 'Amber', value: 'linear-gradient(135deg,#f7971e 0%,#ffd200 100%)' },
  { label: 'Rose', value: 'linear-gradient(135deg,#f953c6 0%,#b91d73 100%)' },
  { label: 'Slate', value: '#1e293b' },
  { label: 'Carbon', value: '#111111' },
]

type Stage = 'idle' | 'uploading' | 'done' | 'error'

export default function TransferPage(): React.ReactElement {
  const [files, setFiles] = React.useState<File[]>([])
  const [filePaths, setFilePaths] = React.useState<string[]>([])
  const [title, setTitle] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [passwordHint, setPasswordHint] = React.useState('')
  const [expiryDays, setExpiryDays] = React.useState(7)
  const [limitDownloads, setLimitDownloads] = React.useState(false)
  const [maxDownloads, setMaxDownloads] = React.useState(5)
  const [recipientInput, setRecipientInput] = React.useState('')
  const [recipientEmails, setRecipientEmails] = React.useState<string[]>([])
  const [savedContacts, setSavedContacts] = React.useState<string[]>([])
  const [notifyMe, setNotifyMe] = React.useState(false)
  const [notifyEmail, setNotifyEmail] = React.useState('')
  const [notifyEveryDownload, setNotifyEveryDownload] = React.useState(false)
  const [webhookUrl, setWebhookUrl] = React.useState('')
  const [burnAfterRead, setBurnAfterRead] = React.useState(false)
  const [background, setBackground] = React.useState('')
  const [logoUrl, setLogoUrl] = React.useState('')
  const [backgroundImageUrl, setBackgroundImageUrl] = React.useState('')
  const [encryptFiles, setEncryptFiles] = React.useState(false)
  const [encryptionKey, setEncryptionKey] = React.useState<string | null>(null)
  const [templates, setTemplates] = React.useState<
    Array<{ id: string; name: string; settings: Record<string, unknown> }>
  >([])
  const [saveTemplateName, setSaveTemplateName] = React.useState('')
  const [savingTemplate, setSavingTemplate] = React.useState(false)
  const [stage, setStage] = React.useState<Stage>('idle')
  const [fileProgress, setFileProgress] = React.useState<FileProgress[]>([])
  const [speedBps, setSpeedBps] = React.useState(0)
  const [etaSeconds, setEtaSeconds] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [resultSlug, setResultSlug] = React.useState('')
  const [resultExpiry, setResultExpiry] = React.useState('')
  const [resultTitle, setResultTitle] = React.useState('')
  const [resultBurn, setResultBurn] = React.useState(false)
  const [resultPasswordProtected, setResultPasswordProtected] =
    React.useState(false)
  const [cloudTransfersEnabled, setCloudTransfersEnabled] = React.useState<
    boolean | null
  >(null)
  const [customSlug, setCustomSlug] = React.useState('')
  const [senderName, setSenderName] = React.useState('')
  const [scheduledAt, setScheduledAt] = React.useState('')
  const [slackWebhookUrl, setSlackWebhookUrl] = React.useState('')
  const [emailAccentColor, setEmailAccentColor] = React.useState('')
  const [replyTo, setReplyTo] = React.useState('')
  const [workspaceId, setWorkspaceId] = React.useState('')
  const [workspaces, setWorkspaces] = React.useState<
    Array<{ id: string; name: string }>
  >([])

  const { getToken } = useRecaptcha()

  // Load workspaces for workspace selector (signed-in only — silently empty for guests)
  React.useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.workspaces) setWorkspaces(j.workspaces)
      })
      .catch(() => {})
  }, [])

  // Check feature flags
  React.useEffect(() => {
    fetch('/api/flags')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j != null) setCloudTransfersEnabled(j.cloudTransfers !== false)
      })
      .catch(() => setCloudTransfersEnabled(true))
  }, [])

  // Pre-fill from duplicate
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const dupSlug = params.get('duplicate')
    if (!dupSlug) return
    fetch(`/api/transfer/${dupSlug}/duplicate`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const s = j?.settings
        if (!s) return
        if (s.title) setTitle(s.title)
        if (s.message) setMessage(s.message)
        if (typeof s.expiryDays === 'number') setExpiryDays(s.expiryDays)
        if (s.maxDownloads != null) {
          setLimitDownloads(true)
          setMaxDownloads(s.maxDownloads)
        }
        if (s.notifyEmail) {
          setNotifyMe(true)
          setNotifyEmail(s.notifyEmail)
        }
        if (typeof s.notifyEveryDownload === 'boolean')
          setNotifyEveryDownload(s.notifyEveryDownload)
        if (s.webhookUrl) setWebhookUrl(s.webhookUrl)
        if (typeof s.burnAfterRead === 'boolean')
          setBurnAfterRead(s.burnAfterRead)
        if (s.background) setBackground(s.background)
        if (s.logoUrl) setLogoUrl(s.logoUrl)
        if (s.backgroundImageUrl) setBackgroundImageUrl(s.backgroundImageUrl)
        if (s.senderName) setSenderName(s.senderName)
        if (Array.isArray(s.recipientEmails))
          setRecipientEmails(s.recipientEmails)
      })
      .catch(() => {})
  }, [])

  // Load saved contacts + templates
  React.useEffect(() => {
    fetch('/api/contacts')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.contacts)
          setSavedContacts(j.contacts.map((c: { email: string }) => c.email))
      })
      .catch(() => {})
    fetch('/api/templates')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.templates) setTemplates(j.templates)
      })
      .catch(() => {})
  }, [])

  const applyTemplate = (tpl: { settings: Record<string, unknown> }) => {
    const s = tpl.settings
    if (typeof s.title === 'string') setTitle(s.title)
    if (typeof s.message === 'string') setMessage(s.message)
    if (typeof s.expiryDays === 'number') setExpiryDays(s.expiryDays)
    if (s.maxDownloads !== undefined) {
      if (s.maxDownloads === null) {
        setLimitDownloads(false)
        setMaxDownloads(5)
      } else {
        setLimitDownloads(true)
        setMaxDownloads(s.maxDownloads as number)
      }
    }
    if (typeof s.notifyEmail === 'string') {
      setNotifyMe(!!s.notifyEmail)
      setNotifyEmail(s.notifyEmail)
    }
    if (typeof s.notifyEveryDownload === 'boolean')
      setNotifyEveryDownload(s.notifyEveryDownload)
    if (typeof s.webhookUrl === 'string') setWebhookUrl(s.webhookUrl)
    if (typeof s.burnAfterRead === 'boolean') setBurnAfterRead(s.burnAfterRead)
    if (typeof s.background === 'string') setBackground(s.background)
  }

  const saveAsTemplate = async () => {
    if (!saveTemplateName.trim()) return
    setSavingTemplate(true)
    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveTemplateName.trim(),
          settings: {
            title,
            message,
            expiryDays,
            maxDownloads: limitDownloads ? maxDownloads : null,
            notifyEmail: notifyMe ? notifyEmail : '',
            notifyEveryDownload,
            webhookUrl,
            burnAfterRead,
            background,
          },
        }),
      })
      const res = await fetch('/api/templates')
      const j = await res.json()
      if (j?.templates) setTemplates(j.templates)
      setSaveTemplateName('')
    } catch (_e) {
      /* save failed */
    }
    setSavingTemplate(false)
  }

  const totalSize = files.reduce((s, f) => s + f.size, 0)
  const overLimit = totalSize > MAX_BYTES

  const addRecipient = () => {
    const emails = recipientInput
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    const unique = [...new Set([...recipientEmails, ...emails])]
    setRecipientEmails(unique.slice(0, 20))
    setRecipientInput('')
  }

  const removeRecipient = (email: string) => {
    setRecipientEmails((prev) => prev.filter((e) => e !== email))
  }

  const upload = async () => {
    if (files.length === 0 || overLimit) return
    setStage('uploading')
    setError(null)
    setSpeedBps(0)
    setEtaSeconds(null)
    setFileProgress(
      files.map((f) => ({
        name: f.name,
        size: f.size,
        loaded: 0,
        progress: 0,
        done: false,
        error: false,
      })),
    )

    const startTime = Date.now()
    const loadedPerFile = new Array<number>(files.length).fill(0)
    const samples: Array<{ t: number; bytes: number }> = [
      { t: startTime, bytes: 0 },
    ]

    const onProgress = (i: number, loaded: number) => {
      loadedPerFile[i] = loaded
      const totalLoaded = loadedPerFile.reduce((a, b) => a + b, 0)
      const now = Date.now()
      samples.push({ t: now, bytes: totalLoaded })
      const cutoff = now - 3000
      while (samples.length > 1 && samples[0].t < cutoff) samples.shift()
      const dt = (now - samples[0].t) / 1000
      const db = totalLoaded - samples[0].bytes
      const bps = dt > 0 ? db / dt : 0
      const remaining = totalSize - totalLoaded
      setSpeedBps(Math.round(bps))
      setEtaSeconds(bps > 0 ? remaining / bps : null)
      const pct = (loaded / files[i].size) * 100
      setFileProgress((prev) => {
        const next = [...prev]
        next[i] = { ...next[i], loaded, progress: pct }
        return next
      })
    }

    try {
      // Generate encryption key if E2E encryption is enabled
      let cryptoKey: CryptoKey | null = null
      let exportedKeyHex: string | null = null
      if (encryptFiles) {
        cryptoKey = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt'],
        )
        const raw = await crypto.subtle.exportKey('raw', cryptoKey)
        exportedKeyHex = Array.from(new Uint8Array(raw))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      }

      // Encrypt a File in-browser: 12-byte IV prepended to AES-GCM ciphertext
      const encryptFile = async (file: File): Promise<Blob> => {
        if (!cryptoKey) return file
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const buf = await file.arrayBuffer()
        const cipher = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          cryptoKey,
          buf,
        )
        const out = new Uint8Array(12 + cipher.byteLength)
        out.set(iv, 0)
        out.set(new Uint8Array(cipher), 12)
        return new Blob([out], { type: 'application/octet-stream' })
      }

      const recaptchaToken = await getToken('transfer_create')
      // When encrypting, report encrypted size (IV + ciphertext tag overhead ~28 bytes per file)
      const encryptedSizes = encryptFiles
        ? files.map((f) => f.size + 12 + 16)
        : files.map((f) => f.size)

      const createRes = await fetch('/api/transfer/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map((f, i) => ({
            name: f.name,
            size: encryptedSizes[i],
            type: encryptFiles ? 'application/octet-stream' : f.type,
            path: filePaths[i] || f.name,
          })),
          title,
          message,
          password: password || undefined,
          passwordHint: password && passwordHint ? passwordHint : undefined,
          expiryDays,
          maxDownloads: limitDownloads ? maxDownloads : null,
          notifyEmail: notifyMe && notifyEmail ? notifyEmail : undefined,
          notifyEveryDownload: notifyMe ? notifyEveryDownload : false,
          webhookUrl: webhookUrl || undefined,
          recipientEmails,
          burnAfterRead,
          background: background || undefined,
          encrypted: encryptFiles,
          logoUrl: logoUrl || undefined,
          backgroundImageUrl: backgroundImageUrl || undefined,
          recaptchaToken,
          customSlug: customSlug.trim() || undefined,
          senderName: senderName.trim() || undefined,
          scheduledAt: scheduledAt || undefined,
          slackWebhookUrl: slackWebhookUrl.trim() || undefined,
          emailAccentColor: emailAccentColor || undefined,
          replyTo: replyTo.trim() || undefined,
          workspaceId: workspaceId || undefined,
        }),
      })
      if (!createRes.ok) {
        const json = await createRes.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to create transfer.')
      }
      const { slug, uploadUrls, expiresAt } = await createRes.json()

      await Promise.all(
        files.map(
          (file, i) =>
            new Promise<void>((resolve, reject) => {
              encryptFile(file).then((blob) => {
                const xhr = new XMLHttpRequest()
                xhr.open('PUT', uploadUrls[i])
                xhr.setRequestHeader(
                  'Content-Type',
                  encryptFiles
                    ? 'application/octet-stream'
                    : file.type || 'application/octet-stream',
                )
                xhr.upload.addEventListener('progress', (e) => {
                  if (e.lengthComputable) onProgress(i, e.loaded)
                })
                xhr.addEventListener('load', () => {
                  if (xhr.status >= 200 && xhr.status < 300) {
                    onProgress(i, blob.size)
                    setFileProgress((prev) => {
                      const next = [...prev]
                      next[i] = { ...next[i], progress: 100, done: true }
                      return next
                    })
                    resolve()
                  } else {
                    setFileProgress((prev) => {
                      const next = [...prev]
                      next[i] = { ...next[i], error: true }
                      return next
                    })
                    reject(new Error(`Upload failed for ${file.name}`))
                  }
                })
                xhr.addEventListener('error', () => {
                  setFileProgress((prev) => {
                    const next = [...prev]
                    next[i] = { ...next[i], error: true }
                    return next
                  })
                  reject(new Error(`Network error uploading ${file.name}`))
                })
                xhr.send(blob)
              })
            }),
        ),
      )

      await fetch('/api/transfer/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })

      setResultSlug(slug)
      setResultExpiry(expiresAt)
      setResultTitle(title)
      setResultBurn(burnAfterRead)
      setResultPasswordProtected(!!password)
      setEncryptionKey(exportedKeyHex)
      setStage('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setStage('error')
    }
  }

  const overallProgress =
    fileProgress.length === 0
      ? 0
      : (fileProgress.reduce((s, f) => s + f.loaded, 0) /
          Math.max(
            1,
            fileProgress.reduce((s, f) => s + f.size, 0),
          )) *
        100

  const reset = () => {
    setFiles([])
    setFilePaths([])
    setTitle('')
    setMessage('')
    setPassword('')
    setPasswordHint('')
    setExpiryDays(7)
    setLimitDownloads(false)
    setMaxDownloads(5)
    setRecipientEmails([])
    setRecipientInput('')
    setNotifyMe(false)
    setNotifyEmail('')
    setNotifyEveryDownload(false)
    setWebhookUrl('')
    setBurnAfterRead(false)
    setBackground('')
    setLogoUrl('')
    setBackgroundImageUrl('')
    setEncryptFiles(false)
    setEncryptionKey(null)
    setCustomSlug('')
    setSenderName('')
    setScheduledAt('')
    setSlackWebhookUrl('')
    setEmailAccentColor('')
    setReplyTo('')
    setWorkspaceId('')
    setStage('idle')
    setFileProgress([])
    setSpeedBps(0)
    setEtaSeconds(null)
    setError(null)
    setResultSlug('')
    setResultExpiry('')
    setResultTitle('')
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          Send files
        </Typography>
        <Typography color="text.secondary">
          Upload files and share a link — no account needed, always free.
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <Chip label={`Up to ${formatBytes(MAX_BYTES)}`} size="small" />
          <Chip label="20 files per transfer" size="small" />
          <Chip label="Zero egress fees" size="small" />
          <Chip
            label="1-year links when signed in"
            size="small"
            variant="outlined"
          />
        </Stack>
      </Stack>

      {cloudTransfersEnabled === false && (
        <Alert
          severity="warning"
          sx={{ mb: 3, borderRadius: 2 }}
          icon={<CloudUploadIcon />}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Cloud uploads are temporarily unavailable
          </Typography>
          <Typography variant="body2">
            The administrator has paused cloud file uploads for maintenance. You
            can still use <strong>P2P (browser-to-browser)</strong> transfers
            from the{' '}
            <Box component="a" href="/send" sx={{ color: 'inherit' }}>
              Send page
            </Box>
            . Cloud uploads will return shortly.
          </Typography>
        </Alert>
      )}

      <Card
        variant="outlined"
        sx={
          cloudTransfersEnabled === false
            ? { opacity: 0.5, pointerEvents: 'none' }
            : {}
        }
      >
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          {stage === 'done' ? (
            <Stack spacing={3}>
              <ShareCard
                slug={resultSlug}
                expiresAt={resultExpiry}
                title={resultTitle}
                burnAfterRead={resultBurn}
                passwordProtected={resultPasswordProtected}
                encryptionKey={encryptionKey ?? undefined}
              />
              <Button variant="outlined" onClick={reset}>
                Send another transfer
              </Button>
            </Stack>
          ) : (
            <Stack spacing={3}>
              <UploadZone
                files={files}
                onChange={setFiles}
                onPaths={setFilePaths}
                paths={filePaths}
                disabled={stage === 'uploading'}
              />

              {stage === 'uploading' && (
                <UploadProgress
                  files={fileProgress}
                  overallProgress={overallProgress}
                  speedBps={speedBps}
                  etaSeconds={etaSeconds}
                />
              )}

              {stage !== 'uploading' &&
                files.length === 0 &&
                templates.length > 0 && (
                  <Stack spacing={1}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Load a preset
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ flexWrap: 'wrap' }}
                    >
                      {templates.map((t) => (
                        <Chip
                          key={t.id}
                          label={t.name}
                          onClick={() => applyTemplate(t)}
                          variant="outlined"
                          size="small"
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Stack>
                  </Stack>
                )}

              {stage !== 'uploading' && files.length > 0 && (
                <>
                  <Divider />

                  <TextField
                    label="Transfer name (optional)"
                    placeholder="e.g. Project files, Holiday photos…"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                    size="small"
                    fullWidth
                  />

                  <TextField
                    label="Message to recipient (optional)"
                    multiline
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    slotProps={{ htmlInput: { maxLength: 1000 } }}
                    helperText={`${message.length}/1000`}
                    size="small"
                    fullWidth
                  />

                  {/* Options */}
                  <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Options
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2.5}>
                        {/* Expiry */}
                        <FormControl size="small" fullWidth>
                          <InputLabel>Link expires after</InputLabel>
                          <Select
                            value={expiryDays}
                            label="Link expires after"
                            onChange={(e) =>
                              setExpiryDays(Number(e.target.value))
                            }
                          >
                            <MenuItem value={1}>1 day</MenuItem>
                            <MenuItem value={3}>3 days</MenuItem>
                            <MenuItem value={7}>7 days</MenuItem>
                            <MenuItem value={30}>
                              30 days (sign in required)
                            </MenuItem>
                            <MenuItem value={90}>
                              90 days (sign in required)
                            </MenuItem>
                            <MenuItem value={180}>
                              180 days (sign in required)
                            </MenuItem>
                            <MenuItem value={365}>
                              1 year (sign in required)
                            </MenuItem>
                          </Select>
                        </FormControl>

                        {/* Password */}
                        <TextField
                          label="Password protect (optional)"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          size="small"
                          fullWidth
                          slotProps={{
                            htmlInput: { maxLength: 200 },
                            input: {
                              endAdornment: (
                                <IconButton
                                  size="small"
                                  onClick={() => setShowPassword((p) => !p)}
                                  edge="end"
                                >
                                  {showPassword ? (
                                    <VisibilityOffIcon fontSize="small" />
                                  ) : (
                                    <VisibilityIcon fontSize="small" />
                                  )}
                                </IconButton>
                              ),
                            },
                          }}
                          helperText="Recipients must enter this password to download"
                        />
                        {password && (
                          <TextField
                            label="Password hint (optional)"
                            value={passwordHint}
                            onChange={(e) =>
                              setPasswordHint(e.target.value.slice(0, 100))
                            }
                            size="small"
                            fullWidth
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                            helperText="Shown to recipients on the password screen"
                          />
                        )}

                        {/* Download limit */}
                        <Stack spacing={1}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={limitDownloads}
                                onChange={(e) =>
                                  setLimitDownloads(e.target.checked)
                                }
                                size="small"
                              />
                            }
                            label={
                              <Typography variant="body2">
                                Limit number of downloads
                              </Typography>
                            }
                          />
                          <Collapse in={limitDownloads}>
                            <TextField
                              type="number"
                              label="Max downloads"
                              value={maxDownloads}
                              onChange={(e) =>
                                setMaxDownloads(
                                  Math.max(1, Number(e.target.value)),
                                )
                              }
                              size="small"
                              slotProps={{ htmlInput: { min: 1, max: 1000 } }}
                              sx={{ width: 160 }}
                            />
                          </Collapse>
                        </Stack>

                        {/* Send to recipients */}
                        <Stack spacing={1}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Send link via email (optional)
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <TextField
                              label="Recipient email"
                              value={recipientInput}
                              onChange={(e) =>
                                setRecipientInput(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                  e.preventDefault()
                                  addRecipient()
                                }
                              }}
                              size="small"
                              fullWidth
                              helperText="Press Enter or comma to add multiple"
                            />
                            <Button
                              variant="outlined"
                              onClick={addRecipient}
                              sx={{ minWidth: 0, px: 2 }}
                            >
                              <AddIcon fontSize="small" />
                            </Button>
                          </Stack>
                          {/* Contact suggestions */}
                          {savedContacts.length > 0 &&
                            (() => {
                              const q = recipientInput.toLowerCase()
                              const suggestions = savedContacts
                                .filter(
                                  (c) =>
                                    !recipientEmails.includes(c) &&
                                    (q.length < 2 ||
                                      c.toLowerCase().includes(q)),
                                )
                                .slice(0, 8)
                              if (suggestions.length === 0) return null
                              return (
                                <Stack spacing={0.5}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {q.length >= 2
                                      ? 'Matching contacts'
                                      : 'Recent contacts'}
                                  </Typography>
                                  <Stack
                                    direction="row"
                                    sx={{ flexWrap: 'wrap', gap: 0.5 }}
                                  >
                                    {suggestions.map((email) => (
                                      <Chip
                                        key={email}
                                        label={email}
                                        size="small"
                                        variant="outlined"
                                        onClick={() => {
                                          setRecipientEmails((prev) =>
                                            [
                                              ...new Set([...prev, email]),
                                            ].slice(0, 20),
                                          )
                                          setRecipientInput('')
                                        }}
                                        icon={<AddIcon />}
                                      />
                                    ))}
                                  </Stack>
                                </Stack>
                              )
                            })()}
                          {recipientEmails.length > 0 && (
                            <Stack
                              direction="row"
                              sx={{ flexWrap: 'wrap', gap: 0.5 }}
                            >
                              {recipientEmails.map((email) => (
                                <Chip
                                  key={email}
                                  label={email}
                                  size="small"
                                  onDelete={() => removeRecipient(email)}
                                  deleteIcon={<CloseIcon />}
                                />
                              ))}
                            </Stack>
                          )}
                        </Stack>

                        {/* E2E + recipient email incompatibility warning */}
                        {encryptFiles && recipientEmails.length > 0 && (
                          <Alert severity="warning" sx={{ py: 0.5 }}>
                            E2E encrypted transfers can&apos;t be sent via
                            recipient email — email clients strip the key from
                            the link. Share the link manually after uploading.
                          </Alert>
                        )}

                        {/* End-to-end encryption */}
                        <FormControlLabel
                          control={
                            <Switch
                              checked={encryptFiles}
                              onChange={(e) =>
                                setEncryptFiles(e.target.checked)
                              }
                              size="small"
                              color="success"
                            />
                          }
                          label={
                            <Stack>
                              <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{ alignItems: 'center' }}
                              >
                                <LockIcon
                                  fontSize="small"
                                  color={encryptFiles ? 'success' : 'disabled'}
                                />
                                <Typography variant="body2">
                                  End-to-end encrypt
                                </Typography>
                              </Stack>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                AES-256-GCM in-browser — the server never sees
                                your file contents. Key travels in the share
                                link only.
                              </Typography>
                            </Stack>
                          }
                        />

                        {/* Burn after read */}
                        <FormControlLabel
                          control={
                            <Switch
                              checked={burnAfterRead}
                              onChange={(e) =>
                                setBurnAfterRead(e.target.checked)
                              }
                              size="small"
                              color="error"
                            />
                          }
                          label={
                            <Stack>
                              <Typography variant="body2">
                                Delete files after first download
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Files are permanently removed 30 s after the
                                first download starts
                              </Typography>
                            </Stack>
                          }
                        />

                        {/* Notify me on download */}
                        <Stack spacing={1}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={notifyMe}
                                onChange={(e) => setNotifyMe(e.target.checked)}
                                size="small"
                              />
                            }
                            label={
                              <Typography variant="body2">
                                Notify me when downloaded
                              </Typography>
                            }
                          />
                          <Collapse in={notifyMe}>
                            <Stack spacing={1}>
                              <TextField
                                label="Your email"
                                type="email"
                                value={notifyEmail}
                                onChange={(e) => setNotifyEmail(e.target.value)}
                                size="small"
                                fullWidth
                              />
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={notifyEveryDownload}
                                    onChange={(e) =>
                                      setNotifyEveryDownload(e.target.checked)
                                    }
                                    size="small"
                                  />
                                }
                                label={
                                  <Typography variant="body2">
                                    Notify on every download (not just first)
                                  </Typography>
                                }
                              />
                            </Stack>
                          </Collapse>
                        </Stack>

                        {/* Webhook URL */}
                        <TextField
                          label="Webhook URL (optional)"
                          placeholder="https://your-server.com/hook"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          size="small"
                          fullWidth
                          helperText="We'll POST a JSON payload to this URL on every download"
                        />
                      </Stack>
                    </AccordionDetails>
                  </Accordion>

                  {/* Branding / Customize */}
                  <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center' }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Branding &amp; background
                        </Typography>
                        {background && (
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              background,
                              border: '1px solid',
                              borderColor: 'divider',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1.5}>
                        {/* Logo URL */}
                        <TextField
                          label="Logo image URL (optional)"
                          placeholder="https://example.com/logo.png"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          size="small"
                          fullWidth
                          helperText="Shown above the download card — use a transparent PNG or SVG"
                        />
                        {/* Background image URL */}
                        <TextField
                          label="Background image URL (optional)"
                          placeholder="https://example.com/bg.jpg"
                          value={backgroundImageUrl}
                          onChange={(e) =>
                            setBackgroundImageUrl(e.target.value)
                          }
                          size="small"
                          fullWidth
                          helperText="Full-page background image — overrides the colour preset below"
                        />
                        <Typography variant="caption" color="text.secondary">
                          Or choose a background colour preset
                        </Typography>
                        <Stack
                          direction="row"
                          sx={{ flexWrap: 'wrap', gap: 1 }}
                        >
                          {BACKGROUND_PRESETS.map((preset) => (
                            <Tooltip
                              key={preset.label}
                              title={preset.label}
                              arrow
                            >
                              <Box
                                onClick={() => setBackground(preset.value)}
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '50%',
                                  cursor: 'pointer',
                                  background: preset.value || 'transparent',
                                  border: '2px solid',
                                  borderColor:
                                    background === preset.value
                                      ? 'primary.main'
                                      : 'divider',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'border-color 0.15s',
                                  '&:hover': { borderColor: 'primary.light' },
                                  ...(preset.value === '' && {
                                    background:
                                      'repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 0 0 / 12px 12px',
                                  }),
                                }}
                              >
                                {background === preset.value && (
                                  <CheckIcon
                                    sx={{
                                      fontSize: 16,
                                      color:
                                        preset.value &&
                                        !preset.value.includes('ffd200') &&
                                        !preset.value.includes('43e97b') &&
                                        !preset.value.includes('4facfe')
                                          ? '#fff'
                                          : 'text.primary',
                                    }}
                                  />
                                )}
                              </Box>
                            </Tooltip>
                          ))}
                        </Stack>
                        {/* Custom color input */}
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'center' }}
                        >
                          <Box
                            component="input"
                            type="color"
                            value={
                              background.startsWith('#') &&
                              !BACKGROUND_PRESETS.find(
                                (p) => p.value === background,
                              )
                                ? background
                                : '#667eea'
                            }
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) => setBackground(e.target.value)}
                            sx={{
                              width: 36,
                              height: 36,
                              border: 'none',
                              borderRadius: 1,
                              cursor: 'pointer',
                              p: 0,
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Or pick a custom solid colour
                          </Typography>
                        </Stack>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>

                  {/* Advanced delivery options */}
                  <Accordion variant="outlined" sx={{ borderRadius: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Advanced delivery options
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <TextField
                          label="Custom link name (signed-in only)"
                          placeholder="my-project-files"
                          value={customSlug}
                          onChange={(e) =>
                            setCustomSlug(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-]/g, ''),
                            )
                          }
                          size="small"
                          fullWidth
                          helperText={
                            customSlug
                              ? `Your link: /transfer/${customSlug}`
                              : 'Leave blank for a random link. 3–60 chars, a–z 0–9 -'
                          }
                          slotProps={{ htmlInput: { maxLength: 60 } }}
                        />
                        <TextField
                          label="Your name (shown in recipient email)"
                          placeholder="e.g. Alex from Acme"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          size="small"
                          fullWidth
                          helperText="Recipients see 'Alex from Acme sent you files via Zync'"
                          slotProps={{ htmlInput: { maxLength: 80 } }}
                        />
                        <TextField
                          label="Schedule delivery (send emails at)"
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          size="small"
                          fullWidth
                          helperText="Leave blank to send immediately. Files are uploaded now; emails go out at the scheduled time."
                          slotProps={{
                            htmlInput: {
                              min: new Date().toISOString().slice(0, 16),
                            },
                          }}
                        />
                        <TextField
                          label="Slack webhook URL (notified on each download)"
                          placeholder="https://hooks.slack.com/services/…"
                          value={slackWebhookUrl}
                          onChange={(e) => setSlackWebhookUrl(e.target.value)}
                          size="small"
                          fullWidth
                          helperText="Paste an Incoming Webhook URL from your Slack app settings."
                        />
                        <TextField
                          label="Reply-To email (recipients can reply directly to you)"
                          placeholder="you@example.com"
                          value={replyTo}
                          onChange={(e) => setReplyTo(e.target.value)}
                          size="small"
                          fullWidth
                          type="email"
                        />
                        {workspaces.length > 0 && (
                          <FormControl size="small" fullWidth>
                            <InputLabel>
                              Assign to workspace (optional)
                            </InputLabel>
                            <Select
                              label="Assign to workspace (optional)"
                              value={workspaceId}
                              onChange={(e) => setWorkspaceId(e.target.value)}
                            >
                              <MenuItem value="">None</MenuItem>
                              {workspaces.map((ws) => (
                                <MenuItem key={ws.id} value={ws.id}>
                                  {ws.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                        <Stack
                          direction="row"
                          spacing={1.5}
                          sx={{ alignItems: 'center' }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Email button colour
                          </Typography>
                          <Box
                            component="input"
                            type="color"
                            aria-label="Email button colour"
                            title="Email button colour"
                            value={emailAccentColor || '#4f46e5'}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) => setEmailAccentColor(e.target.value)}
                            sx={{
                              width: 36,
                              height: 28,
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: 1,
                              p: 0,
                            }}
                          />
                          {emailAccentColor && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {emailAccentColor}
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>

                  {/* Save as template */}
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <TextField
                      label="Save current settings as preset"
                      placeholder="Preset name…"
                      value={saveTemplateName}
                      onChange={(e) => setSaveTemplateName(e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                      slotProps={{ htmlInput: { maxLength: 100 } }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveAsTemplate()
                      }}
                    />
                    <Button
                      variant="outlined"
                      onClick={saveAsTemplate}
                      disabled={!saveTemplateName.trim() || savingTemplate}
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      Save preset
                    </Button>
                  </Stack>
                </>
              )}

              {error && <Alert severity="error">{error}</Alert>}
              {overLimit && (
                <Alert severity="warning">
                  Total size exceeds the {formatBytes(MAX_BYTES)} limit.
                </Alert>
              )}

              <Button
                variant="contained"
                size="large"
                startIcon={
                  stage === 'uploading' ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <CloudUploadIcon />
                  )
                }
                onClick={upload}
                disabled={
                  files.length === 0 || overLimit || stage === 'uploading'
                }
                fullWidth
              >
                {stage === 'uploading' ? 'Uploading…' : 'Upload & get link'}
              </Button>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: 'center' }}
              >
                By uploading you agree to our{' '}
                <Box
                  component="a"
                  href="/acceptable-use"
                  sx={{ color: 'inherit' }}
                >
                  Acceptable Use Policy
                </Box>
                . Files are stored securely and automatically deleted on expiry.
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Container>
  )
}
