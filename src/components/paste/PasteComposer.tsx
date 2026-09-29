'use client'

import * as React from 'react'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import LockIcon from '@mui/icons-material/Lock'
import { CopyableInput } from '../CopyableInput'
import { encryptText } from '../../utils/pasteCrypto'
import { PASTE_LANGUAGES } from './languages'

const EXPIRY = [
  { label: '10 minutes', seconds: 600 },
  { label: '1 hour', seconds: 3600 },
  { label: '1 day', seconds: 86400 },
  { label: '1 week', seconds: 7 * 86400 },
  { label: '30 days', seconds: 30 * 86400 },
]
const MAX_BYTES = 1024 * 1024

type Created = { url: string; deleteToken: string; slug: string; burn: boolean }

export default function PasteComposer(): React.ReactElement {
  const [content, setContent] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [language, setLanguage] = React.useState('text')
  const [expiresIn, setExpiresIn] = React.useState(86400)
  const [encrypt, setEncrypt] = React.useState(true)
  const [burn, setBurn] = React.useState(false)
  const [password, setPassword] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [created, setCreated] = React.useState<Created | null>(null)

  const bytes = React.useMemo(
    () => new TextEncoder().encode(content).length,
    [content],
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      let body = content
      let key = ''
      if (encrypt) {
        const enc = await encryptText(content)
        body = enc.ciphertext
        key = enc.key
      }
      const res = await fetch('/api/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: body,
          title: title.trim(),
          language,
          encrypted: encrypt,
          password: password || undefined,
          burnAfterRead: burn,
          expiresIn,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not create the paste.')
      const link = `${window.location.origin}/paste/${json.slug}${key ? `#${key}` : ''}`
      setCreated({
        url: link,
        deleteToken: json.deleteToken,
        slug: json.slug,
        burn,
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Your paste is ready
              </Typography>
              <CopyableInput label="Share link" value={created.url} />
              {encrypt && (
                <Alert severity="info" icon={<LockIcon />}>
                  The decryption key is the part after <code>#</code>. It never
                  reaches our server — anyone without the full link cannot read
                  this paste, including us.
                </Alert>
              )}
              {created.burn && (
                <Alert severity="warning">
                  Burn after reading: the paste is deleted the first time it is
                  opened. Don&apos;t open the link yourself to test it.
                </Alert>
              )}
              <Typography variant="caption" color="text.secondary">
                Delete it early with:{' '}
                <code style={{ wordBreak: 'break-all' }}>
                  curl -X DELETE -H &quot;x-delete-token: {created.deleteToken}
                  &quot; {window.location.origin}/api/paste/{created.slug}
                </code>
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  onClick={() => {
                    setCreated(null)
                    setContent('')
                    setTitle('')
                    setPassword('')
                  }}
                >
                  New paste
                </Button>
                {!created.burn && (
                  <Button href={created.url} variant="outlined">
                    Open
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
          Share text & code
        </Typography>
        <Typography color="text.secondary">
          Paste notes, logs, configs or code and get a private link. Encrypted
          in your browser by default, with optional password and
          burn-after-reading.
        </Typography>
      </Stack>
      <Box component="form" onSubmit={submit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              fullWidth
            />
            <TextField
              select
              label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              {PASTE_LANGUAGES.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            multiline
            minRows={14}
            maxRows={30}
            required
            fullWidth
            helperText={`${(bytes / 1024).toFixed(1)} KB of 1024 KB`}
            error={bytes > MAX_BYTES}
            slotProps={{
              htmlInput: {
                spellCheck: false,
                style: {
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: 14,
                },
              },
            }}
          />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' } }}
          >
            <TextField
              select
              label="Expires after"
              value={expiresIn}
              onChange={(e) => setExpiresIn(Number(e.target.value))}
              sx={{ minWidth: 180 }}
            >
              {EXPIRY.map((o) => (
                <MenuItem key={o.seconds} value={o.seconds}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Password (optional)"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={encrypt}
                  onChange={(e) => setEncrypt(e.target.checked)}
                />
              }
              label="End-to-end encrypt"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={burn}
                  onChange={(e) => setBurn(e.target.checked)}
                />
              }
              label="Burn after reading"
            />
          </Stack>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={busy || !content || bytes > MAX_BYTES}
            sx={{ alignSelf: 'flex-start' }}
          >
            {busy ? <CircularProgress size={22} /> : 'Create link'}
          </Button>
        </Stack>
      </Box>
    </Container>
  )
}
