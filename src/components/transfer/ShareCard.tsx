'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ShareIcon from '@mui/icons-material/Share'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import TwitterIcon from '@mui/icons-material/X'
import EmailIcon from '@mui/icons-material/Email'
import TelegramIcon from '@mui/icons-material/Telegram'
import QRCode from 'react-qr-code'
import LockIcon from '@mui/icons-material/Lock'

type Props = {
  slug: string
  expiresAt: string
  title?: string
  passwordProtected?: boolean
  burnAfterRead?: boolean
  encryptionKey?: string // hex AES-256 key — appended to URL as #k=<hex>
}

export default function ShareCard({
  slug,
  expiresAt,
  title,
  passwordProtected,
  burnAfterRead,
  encryptionKey,
}: Props): React.ReactElement {
  const [origin, setOrigin] = React.useState('')
  const [canShare, setCanShare] = React.useState(false)
  const [customDomain, setCustomDomain] = React.useState<string | null>(null)
  const [useCustomDomain, setUseCustomDomain] = React.useState(false)
  React.useEffect(() => {
    setOrigin(window.location.origin)
    setCanShare(typeof navigator.share === 'function')
    // Load user's verified custom domain (signed-in only; silently empty for guests)
    fetch('/api/custom-domain')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.domain?.verified && j.domain.domain) {
          setCustomDomain(j.domain.domain)
          setUseCustomDomain(true)
        }
      })
      .catch(() => {})
  }, [])
  const activeOrigin =
    useCustomDomain && customDomain ? `https://${customDomain}` : origin
  const baseUrl = `${activeOrigin}/transfer/${slug}`
  const url = encryptionKey ? `${baseUrl}#k=${encryptionKey}` : baseUrl
  const shareText = title
    ? `"${title}" — download via Zync`
    : 'Here are your files — download via Zync'

  const [copied, setCopied] = React.useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const nativeShare = async () => {
    try {
      await navigator.share({ title: shareText, url })
    } catch {
      /* user cancelled */
    }
  }

  const [daysLeft, setDaysLeft] = React.useState<number | null>(null)
  React.useEffect(() => {
    const expiry = new Date(expiresAt)
    setDaysLeft(Math.ceil((expiry.getTime() - Date.now()) / 86400000))
  }, [expiresAt])

  const expiryStr = new Date(expiresAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const encoded = encodeURIComponent(url)
  const encodedText = encodeURIComponent(shareText)

  const socialLinks = [
    {
      label: 'WhatsApp',
      icon: <WhatsAppIcon fontSize="small" />,
      href: `https://wa.me/?text=${encodedText}%20${encoded}`,
      color: '#25D366',
      disabledWhenEncrypted: false,
    },
    {
      label: 'X / Twitter',
      icon: <TwitterIcon fontSize="small" />,
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encoded}`,
      color: '#000',
      disabledWhenEncrypted: false,
    },
    {
      label: 'Telegram',
      icon: <TelegramIcon fontSize="small" />,
      href: `https://t.me/share/url?url=${encoded}&text=${encodedText}`,
      color: '#229ED9',
      disabledWhenEncrypted: false,
    },
    {
      label: encryptionKey
        ? 'Email clients strip the key from the link — copy the link instead'
        : 'Email',
      icon: <EmailIcon fontSize="small" />,
      href: encryptionKey
        ? '#'
        : `mailto:?subject=${encodedText}&body=${encoded}`,
      color: undefined,
      disabledWhenEncrypted: true,
    },
  ]

  return (
    <Stack spacing={2}>
      <Alert severity="success" icon={<CheckIcon />}>
        {title
          ? `"${title}" is ready to share!`
          : 'Your files are ready to share!'}
      </Alert>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: 'flex-start' }}
      >
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 1,
            flexShrink: 0,
            bgcolor: 'white',
          }}
        >
          {origin && <QRCode value={url} size={112} />}
        </Box>
        <Stack spacing={1} sx={{ flex: 1, width: '100%' }}>
          {customDomain && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', flexWrap: 'wrap' }}
            >
              <Typography variant="caption" color="text.secondary">
                Share via:
              </Typography>
              <Button
                size="small"
                variant={!useCustomDomain ? 'contained' : 'outlined'}
                onClick={() => setUseCustomDomain(false)}
                sx={{ textTransform: 'none', minWidth: 0, px: 1.5 }}
              >
                {origin.replace(/^https?:\/\//, '')}
              </Button>
              <Button
                size="small"
                variant={useCustomDomain ? 'contained' : 'outlined'}
                onClick={() => setUseCustomDomain(true)}
                sx={{ textTransform: 'none', minWidth: 0, px: 1.5 }}
              >
                {customDomain}
              </Button>
            </Stack>
          )}
          <TextField
            value={url}
            size="small"
            fullWidth
            slotProps={{ input: { readOnly: true } }}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            variant="contained"
            startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
            onClick={copy}
            color={copied ? 'success' : 'primary'}
            fullWidth
          >
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
          {canShare && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ShareIcon />}
              onClick={nativeShare}
              fullWidth
            >
              Share…
            </Button>
          )}
        </Stack>
      </Stack>

      <Divider>
        <Typography variant="caption" color="text.secondary">
          Share via
        </Typography>
      </Divider>

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
        {socialLinks.map(
          ({ label, icon, href, color, disabledWhenEncrypted }) => {
            const isDisabled = !!(encryptionKey && disabledWhenEncrypted)
            return (
              <Tooltip key={href} title={label}>
                <span>
                  <IconButton
                    component={isDisabled ? 'button' : 'a'}
                    {...(!isDisabled
                      ? { href, target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    size="small"
                    disabled={isDisabled}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      p: 1,
                      color: isDisabled
                        ? 'text.disabled'
                        : (color ?? 'text.primary'),
                      '&:hover': isDisabled
                        ? {}
                        : {
                            borderColor: color ?? 'primary.main',
                            bgcolor: 'action.hover',
                          },
                    }}
                  >
                    {icon}
                  </IconButton>
                </span>
              </Tooltip>
            )
          },
        )}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {daysLeft !== null && (
          <Chip
            label={`Expires ${expiryStr} (${daysLeft}d)`}
            size="small"
            color={daysLeft <= 2 ? 'warning' : 'default'}
          />
        )}
        {passwordProtected && (
          <Chip label="Password protected" size="small" color="info" />
        )}
        {burnAfterRead && (
          <Chip
            label="Deletes after download"
            size="small"
            color="error"
            variant="outlined"
          />
        )}
        {encryptionKey && (
          <Chip
            icon={<LockIcon />}
            label="E2E Encrypted"
            size="small"
            color="success"
          />
        )}
      </Stack>

      {encryptionKey && (
        <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
          The decryption key is embedded in the link above. Anyone with the link
          can decrypt and download. Do not share the link on public pages.
        </Alert>
      )}

      <Typography variant="caption" color="text.secondary">
        Anyone with this link can download the files.
        {daysLeft !== null && daysLeft <= 7
          ? ' Sign in to get links up to 30 days.'
          : ''}
      </Typography>

      {/* Direct download link */}
      {origin && (
        <>
          <Divider />
          <Stack spacing={0.5}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Direct download link
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Opening this link auto-starts the download — useful for email or
              automation.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                value={`${baseUrl}?direct=1${encryptionKey ? `#k=${encryptionKey}` : ''}`}
                size="small"
                fullWidth
                slotProps={{
                  input: { readOnly: true, sx: { fontSize: '0.75rem' } },
                }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Tooltip title="Copy direct link">
                <IconButton
                  size="small"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `${baseUrl}?direct=1${encryptionKey ? `#k=${encryptionKey}` : ''}`,
                    )
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </>
      )}
    </Stack>
  )
}
