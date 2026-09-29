'use client'

import * as React from 'react'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'
import LockIcon from '@mui/icons-material/Lock'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import Markdown from '../Markdown'
import { decryptText } from '../../utils/pasteCrypto'
import { languageInfo } from './languages'

type Meta = {
  slug: string
  title: string
  language: string
  encrypted: boolean
  passwordProtected: boolean
  burnAfterRead: boolean
  createdAt: string
  expiresAt: string
  views: number
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

function prettyJson(text: string): string | null {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return null
  }
}

export default function PasteViewer({
  meta,
}: {
  meta: Meta
}): React.ReactElement {
  const [text, setText] = React.useState<string | null>(null)
  const [password, setPassword] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [burned, setBurned] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [view, setView] = React.useState<'source' | 'rendered'>('rendered')
  const lang = languageInfo(meta.language)

  // Pastes that need no interaction open automatically; burn-after-read ones
  // wait for an explicit click so link previews can't destroy them.
  const needsClick = meta.burnAfterRead || meta.passwordProtected

  const open = React.useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const key = window.location.hash.slice(1)
      if (meta.encrypted && !key)
        throw new Error(
          'This link is missing its decryption key (the part after #).',
        )
      const res = await fetch(`/api/paste/${meta.slug}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not open this paste.')
      const body = meta.encrypted
        ? await decryptText(json.content, key).catch(() => {
            throw new Error(
              'Decryption failed — the link key is wrong or incomplete.',
            )
          })
        : json.content
      setText(body)
      setBurned(json.burned)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [meta, password])

  // Auto-open once on mount; the ref keeps later `open` identities out of it.
  const openRef = React.useRef(open)
  openRef.current = open
  React.useEffect(() => {
    if (!needsClick) void openRef.current()
  }, [needsClick])

  const copy = async () => {
    if (text === null) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    if (text === null) return
    const base = (meta.title || meta.slug).replace(/[^\w.-]+/g, '_')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${base}.${lang.ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const json =
    meta.language === 'json' && text !== null ? prettyJson(text) : null
  const renderable = meta.language === 'markdown' || json !== null
  const shown = view === 'rendered' && json !== null ? json : (text ?? '')
  const lines = shown.split('\n')

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <Box>
            <Typography
              variant="h5"
              component="h1"
              sx={{ fontWeight: 800, wordBreak: 'break-word' }}
            >
              {meta.title || 'Untitled paste'}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}
            >
              <Chip size="small" label={lang.label} />
              {meta.encrypted && (
                <Chip
                  size="small"
                  color="success"
                  icon={<LockIcon />}
                  label="End-to-end encrypted"
                />
              )}
              {meta.burnAfterRead && (
                <Chip
                  size="small"
                  color="warning"
                  icon={<LocalFireDepartmentIcon />}
                  label="Burn after reading"
                />
              )}
              <Chip
                size="small"
                variant="outlined"
                label={`Expires ${new Date(meta.expiresAt).toLocaleString()}`}
              />
            </Stack>
          </Box>
          {text !== null && (
            <Stack direction="row" spacing={1}>
              {renderable && (
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={view}
                  onChange={(_, v) => v && setView(v)}
                >
                  <ToggleButton value="rendered">
                    {json !== null ? 'Pretty' : 'Rendered'}
                  </ToggleButton>
                  <ToggleButton value="source">Source</ToggleButton>
                </ToggleButtonGroup>
              )}
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={copy}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={download}
              >
                Download
              </Button>
            </Stack>
          )}
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {burned && (
          <Alert severity="warning">
            This paste has now been deleted from the server. Copy what you need
            before leaving the page.
          </Alert>
        )}

        {text === null && (
          <Box sx={{ py: 4 }}>
            {needsClick ? (
              <Stack spacing={2} sx={{ maxWidth: 420 }}>
                {meta.burnAfterRead && (
                  <Typography color="text.secondary">
                    This paste can be read only once. It will be deleted as soon
                    as you reveal it.
                  </Typography>
                )}
                {meta.passwordProtected && (
                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void open()}
                    autoFocus
                  />
                )}
                <Button
                  variant="contained"
                  onClick={open}
                  disabled={busy}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {busy ? <CircularProgress size={20} /> : 'Reveal paste'}
                </Button>
              </Stack>
            ) : (
              busy && <CircularProgress />
            )}
          </Box>
        )}

        {text !== null &&
          (view === 'rendered' && meta.language === 'markdown' ? (
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                p: { xs: 2, md: 3 },
              }}
            >
              <Markdown>{text}</Markdown>
            </Box>
          ) : (
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'auto',
                bgcolor: 'action.hover',
                fontFamily: MONO,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <Box
                component="table"
                sx={{ borderCollapse: 'collapse', width: '100%' }}
              >
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <Box
                        component="td"
                        sx={{
                          userSelect: 'none',
                          textAlign: 'right',
                          color: 'text.disabled',
                          px: 1.5,
                          verticalAlign: 'top',
                          borderRight: 1,
                          borderColor: 'divider',
                          width: '1%',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {i + 1}
                      </Box>
                      <Box
                        component="td"
                        sx={{
                          px: 1.5,
                          whiteSpace: 'pre',
                          verticalAlign: 'top',
                        }}
                      >
                        {l || ' '}
                      </Box>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>
          ))}

        {!meta.encrypted &&
          !meta.passwordProtected &&
          !meta.burnAfterRead &&
          text !== null && (
            <Typography variant="caption" color="text.secondary">
              Raw:{' '}
              <code>
                curl{' '}
                {typeof window !== 'undefined' ? window.location.origin : ''}
                /api/paste/{meta.slug}/raw
              </code>
            </Typography>
          )}
      </Stack>
    </Container>
  )
}
