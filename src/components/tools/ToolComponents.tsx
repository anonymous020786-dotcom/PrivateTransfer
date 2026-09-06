'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import QRCode from 'react-qr-code'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function CopyButton({ value }: { value: string }): React.ReactElement {
  const [copied, setCopied] = React.useState(false)
  return (
    <Tooltip title={copied ? 'Copied' : 'Copy'}>
      <IconButton
        size="small"
        onClick={() => {
          navigator.clipboard?.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? (
          <CheckIcon fontSize="small" color="success" />
        ) : (
          <ContentCopyIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  )
}

function Output({
  value,
  label = 'Result',
}: {
  value: string
  label?: string
}) {
  if (!value) return null
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
      >
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <CopyButton value={value} />
      </Stack>
      <Typography
        component="pre"
        sx={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'monospace',
          fontSize: 13,
          m: 0,
        }}
      >
        {value}
      </Typography>
    </Paper>
  )
}

// 1. Password generator
function PasswordGenerator() {
  const [len, setLen] = React.useState(16)
  const [upper, setUpper] = React.useState(true)
  const [lower, setLower] = React.useState(true)
  const [nums, setNums] = React.useState(true)
  const [syms, setSyms] = React.useState(true)
  const [pw, setPw] = React.useState('')

  const gen = React.useCallback(() => {
    let set = ''
    if (upper) set += 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    if (lower) set += 'abcdefghijkmnopqrstuvwxyz'
    if (nums) set += '23456789'
    if (syms) set += '!@#$%^&*()-_=+[]{}'
    if (!set) {
      setPw('')
      return
    }
    const arr = new Uint32Array(len)
    crypto.getRandomValues(arr)
    setPw(Array.from(arr, (n) => set[n % set.length]).join(''))
  }, [len, upper, lower, nums, syms])

  React.useEffect(() => {
    gen()
  }, [gen])

  return (
    <Stack spacing={2}>
      <Output value={pw} label="Password" />
      <Box>
        <Typography gutterBottom>Length: {len}</Typography>
        <Slider
          min={6}
          max={64}
          value={len}
          onChange={(_, v) => setLen(v as number)}
        />
      </Box>
      <Stack direction="row" sx={{ flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={upper}
              onChange={(e) => setUpper(e.target.checked)}
            />
          }
          label="A-Z"
        />
        <FormControlLabel
          control={
            <Switch
              checked={lower}
              onChange={(e) => setLower(e.target.checked)}
            />
          }
          label="a-z"
        />
        <FormControlLabel
          control={
            <Switch
              checked={nums}
              onChange={(e) => setNums(e.target.checked)}
            />
          }
          label="0-9"
        />
        <FormControlLabel
          control={
            <Switch
              checked={syms}
              onChange={(e) => setSyms(e.target.checked)}
            />
          }
          label="!@#"
        />
      </Stack>
      <Button variant="contained" onClick={gen}>
        Regenerate
      </Button>
    </Stack>
  )
}

// 2. QR generator
function QrGenerator() {
  const [text, setText] = React.useState('https://zync.app')
  return (
    <Stack spacing={2} sx={{ alignItems: 'center' }}>
      <TextField
        label="Text or URL"
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {text && (
        <Box sx={{ bgcolor: '#fff', p: 2, borderRadius: 2 }}>
          <QRCode value={text} size={200} />
        </Box>
      )}
    </Stack>
  )
}

// 3. File & text hash
function FileHash() {
  const [text, setText] = React.useState('')
  const [algo, setAlgo] = React.useState<'SHA-256' | 'SHA-1' | 'SHA-512'>(
    'SHA-256',
  )
  const [out, setOut] = React.useState('')

  const hashBuffer = async (buf: BufferSource) => {
    const digest = await crypto.subtle.digest(algo, buf)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  const hashText = async () =>
    setOut(await hashBuffer(new TextEncoder().encode(text)))
  const hashFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setOut(await hashBuffer(await f.arrayBuffer()))
  }

  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={algo}
        onChange={(_, v) => v && setAlgo(v)}
      >
        <ToggleButton value="SHA-256">SHA-256</ToggleButton>
        <ToggleButton value="SHA-1">SHA-1</ToggleButton>
        <ToggleButton value="SHA-512">SHA-512</ToggleButton>
      </ToggleButtonGroup>
      <TextField
        label="Text"
        multiline
        minRows={3}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Stack direction="row" spacing={1.5}>
        <Button variant="contained" onClick={hashText}>
          Hash text
        </Button>
        <Button variant="outlined" component="label">
          Hash file
          <input type="file" hidden onChange={hashFile} />
        </Button>
      </Stack>
      <Output value={out} label={algo} />
    </Stack>
  )
}

// 4. Base64
function Base64Tool() {
  const [text, setText] = React.useState('')
  const [out, setOut] = React.useState('')
  const [err, setErr] = React.useState('')
  const enc = () => {
    try {
      setErr('')
      setOut(btoa(unescape(encodeURIComponent(text))))
    } catch {
      setErr('Could not encode.')
    }
  }
  const dec = () => {
    try {
      setErr('')
      setOut(decodeURIComponent(escape(atob(text))))
    } catch {
      setErr('Invalid Base64.')
    }
  }
  return (
    <Stack spacing={2}>
      <TextField
        label="Input"
        multiline
        minRows={4}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Stack direction="row" spacing={1.5}>
        <Button variant="contained" onClick={enc}>
          Encode
        </Button>
        <Button variant="outlined" onClick={dec}>
          Decode
        </Button>
      </Stack>
      {err && <Alert severity="error">{err}</Alert>}
      <Output value={out} />
    </Stack>
  )
}

// 5. URL encode
function UrlTool() {
  const [text, setText] = React.useState('')
  const [out, setOut] = React.useState('')
  return (
    <Stack spacing={2}>
      <TextField
        label="Input"
        multiline
        minRows={3}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Stack direction="row" spacing={1.5}>
        <Button
          variant="contained"
          onClick={() => setOut(encodeURIComponent(text))}
        >
          Encode
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            try {
              setOut(decodeURIComponent(text))
            } catch {
              setOut('Invalid input')
            }
          }}
        >
          Decode
        </Button>
      </Stack>
      <Output value={out} />
    </Stack>
  )
}

// 6. UUID generator
function UuidGenerator() {
  const [n, setN] = React.useState(5)
  const [out, setOut] = React.useState('')
  const gen = React.useCallback(
    () =>
      setOut(Array.from({ length: n }, () => crypto.randomUUID()).join('\n')),
    [n],
  )
  React.useEffect(() => {
    gen()
  }, [gen])
  return (
    <Stack spacing={2}>
      <Box>
        <Typography gutterBottom>Count: {n}</Typography>
        <Slider
          min={1}
          max={50}
          value={n}
          onChange={(_, v) => setN(v as number)}
        />
      </Box>
      <Button variant="contained" onClick={gen}>
        Generate
      </Button>
      <Output value={out} label="UUIDs" />
    </Stack>
  )
}

// 7. JSON formatter
function JsonFormatter() {
  const [text, setText] = React.useState('')
  const [out, setOut] = React.useState('')
  const [err, setErr] = React.useState('')
  const fmt = (min: boolean) => {
    try {
      setErr('')
      const o = JSON.parse(text)
      setOut(JSON.stringify(o, null, min ? 0 : 2))
    } catch (e) {
      setErr((e as Error).message)
    }
  }
  return (
    <Stack spacing={2}>
      <TextField
        label="JSON"
        multiline
        minRows={6}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Stack direction="row" spacing={1.5}>
        <Button variant="contained" onClick={() => fmt(false)}>
          Prettify
        </Button>
        <Button variant="outlined" onClick={() => fmt(true)}>
          Minify
        </Button>
      </Stack>
      {err ? (
        <Alert severity="error">{err}</Alert>
      ) : (
        <Alert severity="success" sx={{ display: out ? 'flex' : 'none' }}>
          Valid JSON
        </Alert>
      )}
      <Output value={out} />
    </Stack>
  )
}

// 8. Word counter
function WordCounter() {
  const [text, setText] = React.useState('')
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const chars = text.length
  const sentences = text.trim() ? (text.match(/[.!?]+/g) || []).length || 1 : 0
  const minutes = Math.max(1, Math.round(words / 200))
  const stats = [
    ['Words', words],
    ['Characters', chars],
    ['Sentences', sentences],
    ['Reading time', `${minutes} min`],
  ] as const
  return (
    <Stack spacing={2}>
      <TextField
        label="Text"
        multiline
        minRows={6}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        {stats.map(([k, v]) => (
          <Paper
            key={k}
            variant="outlined"
            sx={{ p: 2, minWidth: 110, textAlign: 'center', flex: 1 }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {v}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {k}
            </Typography>
          </Paper>
        ))}
      </Stack>
    </Stack>
  )
}

// 9. Case converter
function CaseConverter() {
  const [text, setText] = React.useState('')
  const toTitle = (s: string) =>
    s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
  const toCamel = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase())
  const toSnake = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
  const toKebab = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
  const variants: Array<[string, string]> = [
    ['UPPERCASE', text.toUpperCase()],
    ['lowercase', text.toLowerCase()],
    ['Title Case', toTitle(text)],
    ['camelCase', toCamel(text)],
    ['snake_case', toSnake(text)],
    ['kebab-case', toKebab(text)],
  ]
  return (
    <Stack spacing={2}>
      <TextField
        label="Text"
        multiline
        minRows={3}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {text && variants.map(([k, v]) => <Output key={k} value={v} label={k} />)}
    </Stack>
  )
}

// 10. Lorem ipsum
const LOREM =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'.split(
    ' ',
  )
function LoremIpsum() {
  const [count, setCount] = React.useState(3)
  const [unit, setUnit] = React.useState<'paragraphs' | 'sentences' | 'words'>(
    'paragraphs',
  )
  const sentence = () => {
    const len = 8 + Math.floor(Math.random() * 8)
    const s = Array.from(
      { length: len },
      () => LOREM[Math.floor(Math.random() * LOREM.length)],
    ).join(' ')
    return s[0].toUpperCase() + s.slice(1) + '.'
  }
  const para = () =>
    Array.from({ length: 4 + Math.floor(Math.random() * 3) }, sentence).join(
      ' ',
    )
  const out =
    unit === 'words'
      ? Array.from(
          { length: count },
          () => LOREM[Math.floor(Math.random() * LOREM.length)],
        ).join(' ')
      : unit === 'sentences'
        ? Array.from({ length: count }, sentence).join(' ')
        : Array.from({ length: count }, para).join('\n\n')
  const [text, setText] = React.useState('')
  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={unit}
        onChange={(_, v) => v && setUnit(v)}
      >
        <ToggleButton value="paragraphs">Paragraphs</ToggleButton>
        <ToggleButton value="sentences">Sentences</ToggleButton>
        <ToggleButton value="words">Words</ToggleButton>
      </ToggleButtonGroup>
      <Box>
        <Typography gutterBottom>Count: {count}</Typography>
        <Slider
          min={1}
          max={20}
          value={count}
          onChange={(_, v) => setCount(v as number)}
        />
      </Box>
      <Button variant="contained" onClick={() => setText(out)}>
        Generate
      </Button>
      <Output value={text} />
    </Stack>
  )
}

// 11. Color converter
function hexToRgb(hex: string) {
  const m = hex.replace('#', '').match(/.{1,2}/g)
  if (!m || m.length < 3) return null
  const [r, g, b] = m.map((x) => parseInt(x, 16))
  return { r, g, b }
}
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h =
      max === r
        ? (g - b) / d + (g < b ? 6 : 0)
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4
    h /= 6
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}
function ColorConverter() {
  const [hex, setHex] = React.useState('#6366f1')
  const rgb = hexToRgb(hex)
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box
          component="input"
          type="color"
          aria-label="Pick a color"
          title="Pick a color"
          value={hex}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setHex(e.target.value)
          }
          sx={{
            width: 56,
            height: 56,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
          }}
        />
        <TextField
          label="HEX"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
        />
      </Stack>
      {rgb && (
        <Output value={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} label="RGB" />
      )}
      {hsl && (
        <Output value={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} label="HSL" />
      )}
    </Stack>
  )
}

// 12. Timestamp
function TimestampTool() {
  const [ts, setTs] = React.useState(String(Math.floor(Date.now() / 1000)))
  const [date, setDate] = React.useState('')
  const fromTs = Number(ts) ? new Date(Number(ts) * 1000).toString() : 'Invalid'
  return (
    <Stack spacing={2}>
      <TextField
        label="Unix timestamp (seconds)"
        value={ts}
        onChange={(e) => setTs(e.target.value)}
      />
      <Output value={fromTs} label="Date" />
      <TextField
        label="Date (any parseable string)"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        placeholder="2026-06-17"
      />
      <Output
        value={
          date && !isNaN(Date.parse(date))
            ? String(Math.floor(Date.parse(date) / 1000))
            : ''
        }
        label="Timestamp"
      />
    </Stack>
  )
}

// 13. Slug
function SlugGenerator() {
  const [text, setText] = React.useState('')
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return (
    <Stack spacing={2}>
      <TextField
        label="Title"
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Output value={slug} label="Slug" />
    </Stack>
  )
}

// 14. Markdown preview
function MarkdownPreview() {
  const [text, setText] = React.useState(
    '# Hello, Zync\n\nType **Markdown** on the left.\n\n- Lists\n- [Links](https://zync.app)\n- `code`',
  )
  return (
    <Stack spacing={2}>
      <TextField
        label="Markdown"
        multiline
        minRows={8}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
        sx={{ fontFamily: 'monospace' }}
      />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </Paper>
    </Stack>
  )
}

// 15. Text diff
function TextDiff() {
  const [a, setA] = React.useState('')
  const [b, setB] = React.useState('')
  const linesA = a.split('\n')
  const linesB = b.split('\n')
  const max = Math.max(linesA.length, linesB.length)
  const rows = Array.from({ length: max }, (_, i) => ({
    a: linesA[i] ?? '',
    b: linesB[i] ?? '',
    same: (linesA[i] ?? '') === (linesB[i] ?? ''),
  }))
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Original"
          multiline
          minRows={6}
          fullWidth
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
        <TextField
          label="Changed"
          multiline
          minRows={6}
          fullWidth
          value={b}
          onChange={(e) => setB(e.target.value)}
        />
      </Stack>
      {(a || b) && (
        <Paper
          variant="outlined"
          sx={{ p: 1.5, fontFamily: 'monospace', fontSize: 13 }}
        >
          {rows.map((r, i) => (
            <Box
              key={i}
              sx={{
                bgcolor: r.same ? 'transparent' : 'warning.main',
                color: r.same ? 'text.primary' : 'warning.contrastText',
                px: 1,
                borderRadius: 0.5,
                opacity: r.same ? 0.7 : 1,
              }}
            >
              {i + 1}. {r.same ? r.a : `- ${r.a}  |  + ${r.b}`}
            </Box>
          ))}
        </Paper>
      )}
    </Stack>
  )
}

// 16. Regex tester
function RegexTester() {
  const [pattern, setPattern] = React.useState('')
  const [flags, setFlags] = React.useState('g')
  const [text, setText] = React.useState('')
  const [error, setError] = React.useState('')
  const [matches, setMatches] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!pattern) {
      setMatches([])
      setError('')
      return
    }
    try {
      const re = new RegExp(pattern, flags)
      const m = [...text.matchAll(re)].map((x) => x[0])
      setMatches(m)
      setError('')
    } catch (e) {
      setError((e as Error).message)
      setMatches([])
    }
  }, [pattern, flags, text])

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5}>
        <TextField
          label="Pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          sx={{ flex: 3 }}
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
        />
        <TextField
          label="Flags"
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          sx={{ flex: 1 }}
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
        />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Test text"
        multiline
        minRows={4}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {matches.length > 0 ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">
            {matches.length} match{matches.length !== 1 ? 'es' : ''}
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {matches.slice(0, 50).map((m, i) => (
              <Typography
                key={i}
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  bgcolor: 'warning.main',
                  color: 'warning.contrastText',
                  px: 1,
                  borderRadius: 0.5,
                  display: 'inline-block',
                  width: 'fit-content',
                }}
              >
                {m || '(empty match)'}
              </Typography>
            ))}
          </Stack>
        </Paper>
      ) : pattern && text && !error ? (
        <Alert severity="info">No matches</Alert>
      ) : null}
    </Stack>
  )
}

// 17. JWT decoder
function JwtDecoder() {
  const [token, setToken] = React.useState('')
  const [error, setError] = React.useState('')

  const decode = (part: string) => {
    try {
      const pad =
        part.replace(/-/g, '+').replace(/_/g, '/') +
        '=='.slice((part.length + 2) % 4 === 0 ? 4 : (part.length + 2) % 4)
      return JSON.parse(decodeURIComponent(escape(atob(pad))))
    } catch {
      return null
    }
  }

  const parts = token.trim().split('.')
  const isValid = parts.length === 3
  const header = isValid ? decode(parts[0]) : null
  const payload = isValid ? decode(parts[1]) : null

  React.useEffect(() => {
    if (token && !isValid)
      setError('Not a valid JWT (expected 3 dot-separated parts)')
    else setError('')
  }, [token, isValid])

  const fmt = (obj: unknown) => JSON.stringify(obj, null, 2)

  return (
    <Stack spacing={2}>
      <TextField
        label="JWT token"
        multiline
        minRows={3}
        fullWidth
        value={token}
        onChange={(e) => setToken(e.target.value)}
        slotProps={{
          htmlInput: { style: { fontFamily: 'monospace', fontSize: 12 } },
        }}
      />
      {error && <Alert severity="error">{error}</Alert>}
      {header && <Output value={fmt(header)} label="Header" />}
      {payload && (
        <>
          <Output value={fmt(payload)} label="Payload" />
          {payload.exp && (
            <Alert
              severity={payload.exp * 1000 > Date.now() ? 'success' : 'warning'}
            >
              Expires: {new Date(payload.exp * 1000).toLocaleString()} (
              {payload.exp * 1000 > Date.now() ? 'valid' : 'expired'})
            </Alert>
          )}
        </>
      )}
      {isValid && (
        <Alert severity="info">
          Signature is NOT verified — this tool only decodes the payload.
        </Alert>
      )}
    </Stack>
  )
}

// 18. Number base converter
function BaseConverter() {
  const [value, setValue] = React.useState('255')
  const [from, setFrom] = React.useState<10 | 2 | 8 | 16>(10)
  const num = parseInt(value, from)
  const valid = !isNaN(num) && value.trim() !== ''
  const bases: Array<[10 | 2 | 8 | 16, string, string]> = [
    [2, 'Binary', '0b'],
    [8, 'Octal', '0o'],
    [10, 'Decimal', ''],
    [16, 'Hexadecimal', '0x'],
  ]

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <TextField
          label="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
          sx={{ flex: 1 }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={from}
          onChange={(_, v) => v && setFrom(v)}
        >
          {bases.map(([base, label]) => (
            <ToggleButton key={base} value={base}>
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      {!valid && value && (
        <Alert severity="error">Invalid value for base {from}</Alert>
      )}
      {valid &&
        bases.map(
          ([base, label, prefix]) =>
            base !== from && (
              <Output
                key={base}
                value={prefix + num.toString(base).toUpperCase()}
                label={label}
              />
            ),
        )}
    </Stack>
  )
}

// 19. Unit converter
type UnitCategory = 'Temperature' | 'Length' | 'Weight' | 'Data'
const UNITS: Record<
  UnitCategory,
  Array<{
    label: string
    toBase: (v: number) => number
    fromBase: (v: number) => number
  }>
> = {
  Temperature: [
    { label: '°C', toBase: (v) => v, fromBase: (v) => v },
    {
      label: '°F',
      toBase: (v) => ((v - 32) * 5) / 9,
      fromBase: (v) => (v * 9) / 5 + 32,
    },
    { label: 'K', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
  ],
  Length: [
    { label: 'mm', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
    { label: 'cm', toBase: (v) => v / 100, fromBase: (v) => v * 100 },
    { label: 'm', toBase: (v) => v, fromBase: (v) => v },
    { label: 'km', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
    { label: 'in', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
    { label: 'ft', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
    { label: 'mi', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
  ],
  Weight: [
    { label: 'mg', toBase: (v) => v / 1e6, fromBase: (v) => v * 1e6 },
    { label: 'g', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
    { label: 'kg', toBase: (v) => v, fromBase: (v) => v },
    { label: 'lb', toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 },
    {
      label: 'oz',
      toBase: (v) => v * 0.0283495,
      fromBase: (v) => v / 0.0283495,
    },
    { label: 't', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
  ],
  Data: [
    { label: 'B', toBase: (v) => v, fromBase: (v) => v },
    { label: 'KB', toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
    {
      label: 'MB',
      toBase: (v) => v * 1024 ** 2,
      fromBase: (v) => v / 1024 ** 2,
    },
    {
      label: 'GB',
      toBase: (v) => v * 1024 ** 3,
      fromBase: (v) => v / 1024 ** 3,
    },
    {
      label: 'TB',
      toBase: (v) => v * 1024 ** 4,
      fromBase: (v) => v / 1024 ** 4,
    },
  ],
}

function UnitConverter() {
  const [category, setCategory] = React.useState<UnitCategory>('Temperature')
  const [fromUnit, setFromUnit] = React.useState(0)
  const [value, setValue] = React.useState('100')

  const units = UNITS[category]
  const fromDef = units[fromUnit]
  const base = fromDef ? fromDef.toBase(Number(value)) : NaN

  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={category}
        onChange={(_, v) => {
          if (v) {
            setCategory(v as UnitCategory)
            setFromUnit(0)
          }
        }}
        sx={{ flexWrap: 'wrap' }}
      >
        {Object.keys(UNITS).map((c) => (
          <ToggleButton key={c} value={c}>
            {c}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Stack direction="row" spacing={1.5}>
        <TextField
          label="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="number"
          sx={{ flex: 1 }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={fromUnit}
          onChange={(_, v) => v !== null && setFromUnit(v)}
          sx={{ flexWrap: 'wrap' }}
        >
          {units.map((u, i) => (
            <ToggleButton key={i} value={i}>
              {u.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      {!isNaN(base) &&
        units.map(
          (u, i) =>
            i !== fromUnit && (
              <Output
                key={i}
                value={String(parseFloat(u.fromBase(base).toPrecision(8)))}
                label={u.label}
              />
            ),
        )}
    </Stack>
  )
}

// 20. Cron parser
function parseCron(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5)
    return 'Expected 5 fields: minute hour day-of-month month day-of-week'
  const [min, hr, dom, mon, dow] = parts
  const months = [
    '',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const fmt = (v: string, unit: string, names?: string[]) => {
    if (v === '*') return `every ${unit}`
    if (v.startsWith('*/')) return `every ${v.slice(2)} ${unit}s`
    if (v.includes('-')) {
      const [a, b] = v.split('-')
      return `${unit}s ${names ? names[+a] : a}–${names ? names[+b] : b}`
    }
    if (v.includes(','))
      return `${unit}s ${v
        .split(',')
        .map((x) => (names ? names[+x] : x))
        .join(', ')}`
    return `at ${unit} ${names ? names[+v] : v}`
  }
  return `Runs ${fmt(min, 'minute')} | ${fmt(hr, 'hour')} | ${fmt(dom, 'day-of-month')} | ${fmt(mon, 'month', months)} | ${fmt(dow, 'weekday', days)}`
}

function CronParser() {
  const presets = [
    ['Every minute', '* * * * *'],
    ['Every hour', '0 * * * *'],
    ['Daily at midnight', '0 0 * * *'],
    ['Weekly (Sunday)', '0 0 * * 0'],
    ['Monthly (1st)', '0 0 1 * *'],
  ]
  const [expr, setExpr] = React.useState('0 9 * * 1-5')
  const description = parseCron(expr)
  return (
    <Stack spacing={2}>
      <TextField
        label="Cron expression"
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
        placeholder="* * * * *"
      />
      <Typography variant="caption" color="text.secondary">
        Format: minute hour day-of-month month day-of-week
      </Typography>
      <Alert severity="info">{description}</Alert>
      <Typography variant="overline" color="text.secondary">
        Presets
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {presets.map(([label, val]) => (
          <Button
            key={val}
            size="small"
            variant="outlined"
            onClick={() => setExpr(val)}
          >
            {label}
          </Button>
        ))}
      </Stack>
    </Stack>
  )
}

// 21. Random generator
function RandomGenerator() {
  const [mode, setMode] = React.useState<'number' | 'dice' | 'coin' | 'list'>(
    'number',
  )
  const [min, setMin] = React.useState(1)
  const [max, setMax] = React.useState(100)
  const [count, setCount] = React.useState(1)
  const [list, setList] = React.useState('apple\nbanana\norange\ngrape\nmango')
  const [result, setResult] = React.useState('')

  const run = () => {
    if (mode === 'number') {
      const nums = Array.from(
        { length: count },
        () => min + Math.floor(Math.random() * (max - min + 1)),
      )
      setResult(nums.join(', '))
    } else if (mode === 'dice') {
      const rolls = Array.from(
        { length: count },
        () => 1 + Math.floor(Math.random() * 6),
      )
      setResult(
        rolls.join(', ') + ` (sum: ${rolls.reduce((a, b) => a + b, 0)})`,
      )
    } else if (mode === 'coin') {
      setResult(
        Array.from({ length: count }, () =>
          Math.random() < 0.5 ? 'Heads' : 'Tails',
        ).join(', '),
      )
    } else {
      const items = list.split('\n').filter(Boolean)
      if (!items.length) return
      const picked = [...items]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(count, items.length))
      setResult(picked.join('\n'))
    }
  }

  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={mode}
        onChange={(_, v) => v && setMode(v)}
      >
        <ToggleButton value="number">Number</ToggleButton>
        <ToggleButton value="dice">Dice 🎲</ToggleButton>
        <ToggleButton value="coin">Coin 🪙</ToggleButton>
        <ToggleButton value="list">Pick from list</ToggleButton>
      </ToggleButtonGroup>
      {mode === 'number' && (
        <Stack direction="row" spacing={1.5}>
          <TextField
            label="Min"
            type="number"
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
          />
          <TextField
            label="Max"
            type="number"
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
          />
        </Stack>
      )}
      {mode === 'list' && (
        <TextField
          label="Items (one per line)"
          multiline
          minRows={4}
          value={list}
          onChange={(e) => setList(e.target.value)}
        />
      )}
      <Box>
        <Typography gutterBottom>Count: {count}</Typography>
        <Slider
          min={1}
          max={mode === 'list' ? 20 : 50}
          value={count}
          onChange={(_, v) => setCount(v as number)}
        />
      </Box>
      <Button variant="contained" onClick={run}>
        Generate
      </Button>
      <Output value={result} label="Result" />
    </Stack>
  )
}

// 22. CSS minifier
function CssMinifier() {
  const [css, setCss] = React.useState('')
  const [out, setOut] = React.useState('')
  const minify = () => {
    const result = css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}:;,>+~])\s*/g, '$1')
      .replace(/;}/g, '}')
      .trim()
    setOut(result)
  }
  const savings =
    css.length && out.length
      ? Math.round((1 - out.length / css.length) * 100)
      : 0
  return (
    <Stack spacing={2}>
      <TextField
        label="CSS"
        multiline
        minRows={8}
        fullWidth
        value={css}
        onChange={(e) => setCss(e.target.value)}
        slotProps={{
          htmlInput: { style: { fontFamily: 'monospace', fontSize: 13 } },
        }}
      />
      <Button variant="contained" onClick={minify}>
        Minify
      </Button>
      {savings > 0 && (
        <Alert severity="success">
          Saved {savings}% ({css.length - out.length} bytes)
        </Alert>
      )}
      <Output value={out} label="Minified CSS" />
    </Stack>
  )
}

// 23. Text repeater
function TextRepeater() {
  const [text, setText] = React.useState('')
  const [n, setN] = React.useState(3)
  const [sep, setSep] = React.useState('\n')
  const out = text ? Array(n).fill(text).join(sep) : ''
  return (
    <Stack spacing={2}>
      <TextField
        label="Text to repeat"
        multiline
        minRows={2}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Stack direction="row" spacing={1.5}>
        <Box sx={{ flex: 1 }}>
          <Typography gutterBottom>Repeat: {n}×</Typography>
          <Slider
            min={1}
            max={100}
            value={n}
            onChange={(_, v) => setN(v as number)}
          />
        </Box>
        <TextField
          label="Separator"
          value={sep}
          onChange={(e) => setSep(e.target.value)}
          sx={{ width: 140 }}
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
          placeholder="\n"
        />
      </Stack>
      <Output value={out} label={`Result (${out.length} chars)`} />
    </Stack>
  )
}

// 24. Pomodoro timer
function PomodoroTimer() {
  const presets = [
    { label: 'Focus 25m', seconds: 25 * 60 },
    { label: 'Short break 5m', seconds: 5 * 60 },
    { label: 'Long break 15m', seconds: 15 * 60 },
  ]
  const [total, setTotal] = React.useState(25 * 60)
  const [left, setLeft] = React.useState(25 * 60)
  const [running, setRunning] = React.useState(false)
  const [phase, setPhase] = React.useState('Focus 25m')

  React.useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false)
          return 0
        }
        return l - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const pick = (label: string, seconds: number) => {
    setRunning(false)
    setPhase(label)
    setTotal(seconds)
    setLeft(seconds)
  }

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  const pct = total > 0 ? ((total - left) / total) * 100 : 0

  return (
    <Stack spacing={2} sx={{ alignItems: 'center' }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
      >
        {presets.map((p) => (
          <Button
            key={p.label}
            size="small"
            variant={phase === p.label ? 'contained' : 'outlined'}
            onClick={() => pick(p.label, p.seconds)}
          >
            {p.label}
          </Button>
        ))}
      </Stack>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <Box
          sx={{
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: `conic-gradient(var(--mui-palette-primary-main) ${pct}%, transparent ${pct}%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '4px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h2"
            sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
          >
            {mm}:{ss}
          </Typography>
        </Box>
      </Box>
      <Stack direction="row" spacing={1.5}>
        <Button
          variant="contained"
          size="large"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? 'Pause' : left === total ? 'Start' : 'Resume'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            setRunning(false)
            setLeft(total)
          }}
        >
          Reset
        </Button>
      </Stack>
      {left === 0 && (
        <Alert severity="success">Time's up! Take a break 🎉</Alert>
      )}
    </Stack>
  )
}

// 25. HTML formatter
function HtmlFormatter() {
  const [html, setHtml] = React.useState('')
  const [out, setOut] = React.useState('')
  const [mode, setMode] = React.useState<'beautify' | 'minify'>('beautify')

  const process = () => {
    if (mode === 'minify') {
      setOut(
        html
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/\s+/g, ' ')
          .replace(/>\s+</g, '><')
          .trim(),
      )
    } else {
      let indent = 0
      const voidTags = new Set([
        'area',
        'base',
        'br',
        'col',
        'embed',
        'hr',
        'img',
        'input',
        'link',
        'meta',
        'param',
        'source',
        'track',
        'wbr',
      ])
      const tokens = html.match(/<[^>]+>|[^<]+/g) || []
      const lines: string[] = []
      for (const tok of tokens) {
        const text = tok.trim()
        if (!text) continue
        if (text.startsWith('</')) {
          indent = Math.max(0, indent - 1)
          lines.push('  '.repeat(indent) + text)
        } else if (text.startsWith('<') && !text.startsWith('<!')) {
          const tag = (text.match(/^<(\w+)/) || [])[1]?.toLowerCase() ?? ''
          lines.push('  '.repeat(indent) + text)
          if (tag && !voidTags.has(tag) && !text.endsWith('/>')) indent++
        } else {
          lines.push('  '.repeat(indent) + text)
        }
      }
      setOut(lines.join('\n'))
    }
  }

  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={mode}
        onChange={(_, v) => v && setMode(v)}
      >
        <ToggleButton value="beautify">Beautify</ToggleButton>
        <ToggleButton value="minify">Minify</ToggleButton>
      </ToggleButtonGroup>
      <TextField
        label="HTML"
        multiline
        minRows={8}
        fullWidth
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        slotProps={{
          htmlInput: { style: { fontFamily: 'monospace', fontSize: 13 } },
        }}
      />
      <Button variant="contained" onClick={process}>
        {mode === 'beautify' ? 'Beautify' : 'Minify'}
      </Button>
      <Output value={out} label="Result" />
    </Stack>
  )
}

export const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  'password-generator': PasswordGenerator,
  'qr-generator': QrGenerator,
  'file-hash': FileHash,
  base64: Base64Tool,
  'url-encode': UrlTool,
  'uuid-generator': UuidGenerator,
  'json-formatter': JsonFormatter,
  'word-counter': WordCounter,
  'case-converter': CaseConverter,
  'lorem-ipsum': LoremIpsum,
  'color-converter': ColorConverter,
  timestamp: TimestampTool,
  'slug-generator': SlugGenerator,
  'markdown-preview': MarkdownPreview,
  'text-diff': TextDiff,
  'regex-tester': RegexTester,
  'jwt-decoder': JwtDecoder,
  'base-converter': BaseConverter,
  'unit-converter': UnitConverter,
  'cron-parser': CronParser,
  'random-generator': RandomGenerator,
  'css-minifier': CssMinifier,
  'text-repeater': TextRepeater,
  pomodoro: PomodoroTimer,
  'html-formatter': HtmlFormatter,
}
