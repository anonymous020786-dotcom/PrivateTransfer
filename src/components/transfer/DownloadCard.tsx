'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Rating from '@mui/material/Rating'
import Divider from '@mui/material/Divider'
import DownloadIcon from '@mui/icons-material/Download'
import FolderZipIcon from '@mui/icons-material/FolderZip'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import ImageIcon from '@mui/icons-material/Image'
import VideoFileIcon from '@mui/icons-material/VideoFile'
import AudioFileIcon from '@mui/icons-material/AudioFile'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import CloseIcon from '@mui/icons-material/Close'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import StarIcon from '@mui/icons-material/Star'
import SendIcon from '@mui/icons-material/Send'

type FileInfo = { name: string; size: number; type: string; path?: string }

type Props = {
  slug: string
  files: FileInfo[]
  totalSize: number
  expiresAt: string
  message: string
  title?: string
  downloadCount: number
  maxDownloads: number | null
  passwordProtected?: boolean
  burnAfterRead?: boolean
  autoDownload?: boolean
  encrypted?: boolean
  scanStatus?: string | null
  passwordHint?: string | null
  senderEmail?: string | null
}

function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${n} B`
}

function fileIcon(type: string): React.ReactElement {
  if (type.startsWith('image/'))
    return <ImageIcon fontSize="small" color="primary" />
  if (type.startsWith('video/'))
    return <VideoFileIcon fontSize="small" color="secondary" />
  if (type.startsWith('audio/'))
    return <AudioFileIcon fontSize="small" color="warning" />
  if (type === 'application/pdf')
    return <PictureAsPdfIcon fontSize="small" color="error" />
  return <InsertDriveFileIcon fontSize="small" color="action" />
}

function isPreviewable(type: string): boolean {
  return (
    type.startsWith('image/') ||
    type.startsWith('video/') ||
    type.startsWith('audio/') ||
    type === 'application/pdf'
  )
}

// Decrypt AES-256-GCM ciphertext (IV prepended as first 12 bytes)
async function decryptBlob(
  ciphertext: ArrayBuffer,
  keyHex: string,
): Promise<ArrayBuffer> {
  const raw = new Uint8Array(keyHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, [
    'decrypt',
  ])
  const iv = ciphertext.slice(0, 12)
  const data = ciphertext.slice(12)
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    data,
  )
}

export default function DownloadCard({
  slug,
  files,
  totalSize,
  expiresAt,
  message,
  title,
  downloadCount,
  maxDownloads,
  passwordProtected,
  burnAfterRead,
  autoDownload,
  encrypted,
  scanStatus,
  passwordHint,
  senderEmail,
}: Props): React.ReactElement {
  const [now, setNow] = React.useState<number | null>(null)
  React.useEffect(() => {
    setNow(Date.now())
  }, [])

  // Extract decryption key from URL fragment (#k=<hex>)
  const [encKeyHex, setEncKeyHex] = React.useState<string | null>(null)
  // Extract recipient token from URL search params (?rt=<token>)
  const [recipientToken, setRecipientToken] = React.useState<string | null>(
    null,
  )
  React.useEffect(() => {
    if (encrypted) {
      const hash = window.location.hash
      const match = hash.match(/[#&]k=([0-9a-f]{64})/i)
      if (match) setEncKeyHex(match[1].toLowerCase())
    }
    const params = new URLSearchParams(window.location.search)
    const rt = params.get('rt')
    if (rt && /^[0-9a-f]{32}$/i.test(rt)) setRecipientToken(rt)
  }, [encrypted])

  const expiry = new Date(expiresAt)
  const msLeft = now !== null ? expiry.getTime() - now : null
  const daysLeft = msLeft !== null ? Math.ceil(msLeft / 86400000) : null
  const hoursLeft =
    msLeft !== null && msLeft > 0 ? Math.ceil(msLeft / 3600000) : null
  const expired = msLeft !== null && msLeft <= 0
  const expiryLabel =
    msLeft === null
      ? 'Checking expiry…'
      : msLeft <= 0
        ? 'Expired'
        : hoursLeft !== null && hoursLeft <= 24
          ? `Expires in ${hoursLeft}h`
          : `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`

  // Password gate
  const [unlocked, setUnlocked] = React.useState(!passwordProtected)
  const [passwordInput, setPasswordInput] = React.useState('')
  const [showPw, setShowPw] = React.useState(false)
  const [pwError, setPwError] = React.useState(false)
  const [pwChecking, setPwChecking] = React.useState(false)

  const verifyPassword = async () => {
    if (!passwordInput) return
    setPwChecking(true)
    setPwError(false)
    try {
      const res = await fetch(`/api/transfer/${slug}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })
      const json = await res.json()
      if (json.valid) {
        setUnlocked(true)
        try {
          sessionStorage.setItem(`transfer-pw-${slug}`, passwordInput)
        } catch (_e) {
          /* private browsing */
        }
      } else {
        setPwError(true)
      }
    } catch {
      setPwError(true)
    } finally {
      setPwChecking(false)
    }
  }

  // Restore password from sessionStorage
  React.useEffect(() => {
    if (!passwordProtected) return
    try {
      const saved = sessionStorage.getItem(`transfer-pw-${slug}`)
      if (saved) {
        setPasswordInput(saved)
        setUnlocked(true)
      }
    } catch (_e) {
      /* private browsing */
    }
  }, [slug, passwordProtected])

  const currentPassword = (): string | undefined => {
    if (!passwordProtected) return undefined
    try {
      return sessionStorage.getItem(`transfer-pw-${slug}`) ?? passwordInput
    } catch {
      return passwordInput
    }
  }

  // Inline thumbnails
  const [thumbnails, setThumbnails] = React.useState<Record<number, string>>({})
  React.useEffect(() => {
    if (!unlocked) return
    files.forEach((f, i) => {
      if (!f.type.startsWith('image/')) return
      fetch(`/api/transfer/${slug}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIndex: i,
          preview: true,
          password: currentPassword(),
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.url) setThumbnails((prev) => ({ ...prev, [i]: json.url }))
        })
        .catch(() => {})
    })
  }, [unlocked, slug])

  const [downloading, setDownloading] = React.useState<Set<number>>(new Set())
  const [zipping, setZipping] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [hasDownloaded, setHasDownloaded] = React.useState(false)

  // Request re-send (expired) state
  const [reqEmail, setReqEmail] = React.useState('')
  const [reqSending, setReqSending] = React.useState(false)
  const [reqSent, setReqSent] = React.useState(false)

  const requestReSend = async () => {
    if (!reqEmail.trim()) return
    setReqSending(true)
    try {
      await fetch(`/api/transfer/${slug}/request-resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: reqEmail.trim() }),
      })
      setReqSent(true)
    } catch {
      setReqSent(true)
    } finally {
      setReqSending(false)
    }
  }

  // Review state
  const [reviewRating, setReviewRating] = React.useState<number | null>(null)
  const [reviewComment, setReviewComment] = React.useState('')
  const [reviewSubmitting, setReviewSubmitting] = React.useState(false)
  const [reviewSubmitted, setReviewSubmitted] = React.useState(false)

  // Comment (open message) state
  const [commentText, setCommentText] = React.useState('')
  const [commentSubmitting, setCommentSubmitting] = React.useState(false)
  const [commentSubmitted, setCommentSubmitted] = React.useState(false)

  const submitComment = async () => {
    if (!commentText.trim()) return
    setCommentSubmitting(true)
    try {
      await fetch(`/api/transfer/${slug}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText.trim() }),
      })
      setCommentSubmitted(true)
    } catch {
      setCommentSubmitted(true)
    } finally {
      setCommentSubmitting(false)
    }
  }

  // Auto-trigger download when ?direct=1 and card is unlocked and not expired
  const autoTriggered = React.useRef(false)
  React.useEffect(() => {
    if (!autoDownload || !unlocked || expired || autoTriggered.current) return
    autoTriggered.current = true
    void downloadAll()
  }, [autoDownload, unlocked, expired])

  // Preview dialog
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [previewType, setPreviewType] = React.useState<string>('')
  const [previewLoading, setPreviewLoading] = React.useState<number | null>(
    null,
  )

  const downloadFile = async (index: number) => {
    setDownloading((prev) => new Set(prev).add(index))
    setError(null)
    try {
      const res = await fetch(`/api/transfer/${slug}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIndex: index,
          password: currentPassword(),
          recipientToken: recipientToken ?? undefined,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Download failed.')
        return
      }
      const { url } = await res.json()

      if (encrypted && encKeyHex) {
        const cipher = await fetch(url).then((r) => r.arrayBuffer())
        const plain = await decryptBlob(cipher, encKeyHex)
        const blob = new Blob([plain], {
          type: files[index].type || 'application/octet-stream',
        })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = files[index].name
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 60000)
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = files[index].name
        a.click()
      }
      setHasDownloaded(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }
  }

  const previewFile = async (index: number) => {
    setPreviewLoading(index)
    try {
      const res = await fetch(`/api/transfer/${slug}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIndex: index,
          preview: true,
          password: currentPassword(),
        }),
      })
      if (!res.ok) return
      const { url } = await res.json()
      setPreviewType(files[index].type)
      setPreviewUrl(url)
    } catch {
      // ignore
    } finally {
      setPreviewLoading(null)
    }
  }

  const downloadAll = async () => {
    if (files.length === 1) {
      await downloadFile(0)
      return
    }
    setZipping(true)
    setError(null)
    try {
      const { Zip, AsyncZipDeflate } = await import('fflate')
      const zipChunks: Uint8Array[] = []
      await new Promise<void>((resolve, reject) => {
        const zip = new Zip((err, chunk, final) => {
          if (err) {
            reject(err)
            return
          }
          zipChunks.push(chunk)
          if (final) resolve()
        })
        let pending = files.length
        const finish = () => {
          if (--pending === 0) zip.end()
        }
        files.forEach(async (f, i) => {
          const res = await fetch(`/api/transfer/${slug}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileIndex: i,
              password: currentPassword(),
              recipientToken: recipientToken ?? undefined,
            }),
          })
          if (!res.ok) {
            reject(new Error('Failed to get download URL'))
            return
          }
          const { url } = await res.json()
          const fileRes = await fetch(url)
          let raw = await fileRes.arrayBuffer()
          if (encrypted && encKeyHex) raw = await decryptBlob(raw, encKeyHex)
          const buf = new Uint8Array(raw)
          const zipPath = f.path && f.path !== f.name ? f.path : f.name
          const entry = new AsyncZipDeflate(zipPath)
          zip.add(entry)
          entry.push(buf, true)
          finish()
        })
      })
      const blob = new Blob(zipChunks, { type: 'application/zip' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `zync-${slug}.zip`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 60000)
      setHasDownloaded(true)
    } catch {
      setError('Failed to create ZIP. Try downloading files individually.')
    } finally {
      setZipping(false)
    }
  }

  const submitReview = async () => {
    if (!reviewRating) return
    setReviewSubmitting(true)
    try {
      await fetch(`/api/transfer/${slug}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      })
      setReviewSubmitted(true)
    } catch {
      setReviewSubmitted(true)
    } finally {
      setReviewSubmitting(false)
    }
  }

  if (expired) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">
          This transfer has expired and the files have been deleted.
        </Alert>
        {reqSent ? (
          <Alert severity="success">
            Request sent! The sender has been notified.
          </Alert>
        ) : (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Ask the sender to re-send the files:
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="your@email.com"
                type="email"
                value={reqEmail}
                onChange={(e) => setReqEmail(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={requestReSend}
                disabled={!reqEmail.trim() || reqSending}
              >
                {reqSending ? 'Sending…' : 'Request re-send'}
              </Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    )
  }

  // Password gate
  if (!unlocked) {
    return (
      <Stack spacing={2}>
        <Stack spacing={0.5} sx={{ alignItems: 'center', py: 2 }}>
          <LockIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Password required
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This transfer is password protected.
          </Typography>
          {passwordHint && (
            <Typography variant="caption" color="text.secondary">
              Hint: {passwordHint}
            </Typography>
          )}
        </Stack>
        <TextField
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') verifyPassword()
          }}
          error={pwError}
          helperText={pwError ? 'Incorrect password. Try again.' : ''}
          size="small"
          fullWidth
          slotProps={{
            input: {
              endAdornment: (
                <IconButton
                  size="small"
                  onClick={() => setShowPw((p) => !p)}
                  edge="end"
                >
                  {showPw ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </IconButton>
              ),
            },
          }}
        />
        <Button
          variant="contained"
          onClick={verifyPassword}
          disabled={!passwordInput || pwChecking}
          startIcon={
            pwChecking ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <LockOpenIcon />
            )
          }
          fullWidth
        >
          {pwChecking ? 'Checking…' : 'Unlock transfer'}
        </Button>
      </Stack>
    )
  }

  return (
    <Stack spacing={2}>
      {title && (
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      )}

      {message && (
        <Box
          sx={{
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1,
            borderLeft: '4px solid',
            borderColor: 'primary.main',
          }}
        >
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            &ldquo;{message}&rdquo;
          </Typography>
        </Box>
      )}

      {burnAfterRead && (
        <Alert severity="warning" icon="🔥">
          <strong>Burn after read</strong> — these files will be permanently
          deleted from storage 30 seconds after the first download starts.
        </Alert>
      )}

      {encrypted && !encKeyHex && (
        <Alert severity="error">
          <strong>Decryption key missing.</strong> The share link must include{' '}
          <code>#k=…</code> at the end. Make sure you copied the full link.
        </Alert>
      )}

      {encrypted && encKeyHex && (
        <Alert severity="success" icon={<LockIcon fontSize="small" />}>
          End-to-end encrypted — files will be decrypted in your browser.
        </Alert>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Chip
          icon={<AccessTimeIcon />}
          label={expiryLabel}
          size="small"
          color={
            hoursLeft !== null && hoursLeft <= 24
              ? 'error'
              : daysLeft !== null && daysLeft <= 2
                ? 'warning'
                : 'default'
          }
        />
        <Chip
          label={`${files.length} file${files.length !== 1 ? 's' : ''}`}
          size="small"
        />
        <Chip label={formatBytes(totalSize)} size="small" />
        {passwordProtected && (
          <Chip
            icon={<LockIcon />}
            label="Password protected"
            size="small"
            color="info"
          />
        )}
        {maxDownloads && (
          <Chip
            label={`${downloadCount}/${maxDownloads} downloads`}
            size="small"
            color={downloadCount >= maxDownloads ? 'error' : 'default'}
          />
        )}
        {scanStatus === 'pending' && (
          <Chip label="Scan pending" size="small" variant="outlined" />
        )}
        {scanStatus === 'scanning' && (
          <Chip
            label="Scanning…"
            size="small"
            color="info"
            variant="outlined"
          />
        )}
        {scanStatus === 'clean' && (
          <Chip
            label="✓ No threats found"
            size="small"
            color="success"
            variant="outlined"
          />
        )}
        {scanStatus === 'infected' && (
          <Chip label="⚠ Flagged as malicious" size="small" color="error" />
        )}
      </Stack>

      <List disablePadding>
        {files.map((f, i) => (
          <ListItem
            key={i}
            disableGutters
            sx={{ py: 0.5 }}
            secondaryAction={
              <Stack direction="row" spacing={0.5}>
                {isPreviewable(f.type) && !encrypted && (
                  <IconButton
                    size="small"
                    onClick={() => previewFile(i)}
                    disabled={previewLoading === i}
                    title="Preview"
                  >
                    {previewLoading === i ? (
                      <CircularProgress size={16} />
                    ) : (
                      <ZoomInIcon fontSize="small" />
                    )}
                  </IconButton>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={
                    downloading.has(i) ? (
                      <CircularProgress size={14} />
                    ) : (
                      <DownloadIcon />
                    )
                  }
                  onClick={() => downloadFile(i)}
                  disabled={downloading.has(i) || zipping}
                >
                  {downloading.has(i) ? 'Downloading…' : 'Download'}
                </Button>
              </Stack>
            }
          >
            <ListItemIcon sx={{ minWidth: 44 }}>
              {thumbnails[i] ? (
                <Box
                  component="img"
                  src={thumbnails[i]}
                  alt={f.name}
                  onClick={() => {
                    setPreviewType(f.type)
                    setPreviewUrl(thumbnails[i])
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    objectFit: 'cover',
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              ) : (
                fileIcon(f.type)
              )}
            </ListItemIcon>
            <ListItemText
              primary={f.path && f.path !== f.name ? f.path : f.name}
              secondary={formatBytes(f.size)}
              slotProps={{ primary: { noWrap: true, sx: { maxWidth: '45%' } } }}
            />
          </ListItem>
        ))}
      </List>

      <Button
        variant="contained"
        size="large"
        startIcon={
          zipping ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <FolderZipIcon />
          )
        }
        onClick={downloadAll}
        disabled={
          zipping || downloading.size > 0 || (!!encrypted && !encKeyHex)
        }
        fullWidth
      >
        {zipping
          ? 'Creating ZIP…'
          : files.length === 1
            ? 'Download file'
            : 'Download all as ZIP'}
      </Button>

      {/* Review widget — shown after the first successful download */}
      {hasDownloaded && (
        <>
          <Divider />
          {reviewSubmitted ? (
            <Alert severity="success" icon={<StarIcon fontSize="small" />}>
              Thanks for your feedback!
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                How were these files?
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Rating
                  value={reviewRating}
                  onChange={(_e, val) => setReviewRating(val)}
                  size="large"
                />
                {reviewRating && (
                  <Typography variant="caption" color="text.secondary">
                    {
                      ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][
                        reviewRating
                      ]
                    }
                  </Typography>
                )}
              </Stack>
              {reviewRating && (
                <TextField
                  label="Comment (optional)"
                  placeholder="Anything to add?"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  slotProps={{ htmlInput: { maxLength: 500 } }}
                />
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={submitReview}
                disabled={!reviewRating || reviewSubmitting}
                startIcon={
                  reviewSubmitting ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <SendIcon fontSize="small" />
                  )
                }
                sx={{ alignSelf: 'flex-start' }}
              >
                {reviewSubmitting ? 'Sending…' : 'Send feedback'}
              </Button>
            </Stack>
          )}
        </>
      )}

      {/* Comment widget — shown after download alongside review */}
      {hasDownloaded && (
        <>
          <Divider />
          {commentSubmitted ? (
            <Alert severity="success">Message sent to sender!</Alert>
          ) : (
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Leave a message for the sender
              </Typography>
              <TextField
                placeholder="Write a message…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                size="small"
                fullWidth
                multiline
                rows={2}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={submitComment}
                disabled={!commentText.trim() || commentSubmitting}
                startIcon={
                  commentSubmitting ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <SendIcon fontSize="small" />
                  )
                }
                sx={{ alignSelf: 'flex-start' }}
              >
                {commentSubmitting ? 'Sending…' : 'Send message'}
              </Button>
            </Stack>
          )}
        </>
      )}

      {/* Preview dialog */}
      <Dialog
        open={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        maxWidth="lg"
        fullWidth
      >
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <IconButton onClick={() => setPreviewUrl(null)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent
          sx={{
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
          }}
        >
          {previewUrl && previewType.startsWith('image/') && (
            <Box
              component="img"
              src={previewUrl}
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
          {previewUrl && previewType.startsWith('video/') && (
            <Box
              component="video"
              src={previewUrl}
              controls
              sx={{ maxWidth: '100%', maxHeight: '80vh' }}
            />
          )}
          {previewUrl && previewType.startsWith('audio/') && (
            <Box
              component="audio"
              src={previewUrl}
              controls
              sx={{ width: '100%' }}
            />
          )}
          {previewUrl && previewType === 'application/pdf' && (
            <Box
              component="iframe"
              src={previewUrl}
              sx={{ width: '100%', height: '80vh', border: 'none' }}
              title="PDF preview"
            />
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  )
}
