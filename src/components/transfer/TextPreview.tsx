'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Markdown from '../Markdown'
import {
  ext,
  MAX_CSV_ROWS,
  parseCsv,
  PREVIEW_BYTES,
} from '../../utils/textPreview'

export { isTextPreviewable } from '../../utils/textPreview'

// In-browser preview for text-like files (code, logs, Markdown, JSON, CSV…).
// Only the first PREVIEW_BYTES are fetched so huge logs stay cheap.

async function fetchHead(
  url: string,
): Promise<{ text: string; truncated: boolean }> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  let truncated = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.length
    if (size >= PREVIEW_BYTES) {
      truncated = true
      await reader.cancel()
      break
    }
  }
  const all = new Uint8Array(Math.min(size, PREVIEW_BYTES))
  let off = 0
  for (const c of chunks) {
    const take = Math.min(c.length, all.length - off)
    all.set(c.subarray(0, take), off)
    off += take
    if (off >= all.length) break
  }
  // `fatal: false` tolerates a multi-byte character cut at the boundary.
  return {
    text: new TextDecoder('utf-8', { fatal: false }).decode(all),
    truncated,
  }
}

export default function TextPreview({
  url,
  name,
}: {
  url: string
  name: string
}): React.ReactElement {
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'error'; msg: string }
    | { status: 'ok'; text: string; truncated: boolean }
  >({ status: 'loading' })

  React.useEffect(() => {
    let cancelled = false
    fetchHead(url)
      .then((r) => !cancelled && setState({ status: 'ok', ...r }))
      .catch(
        (e) =>
          !cancelled &&
          setState({ status: 'error', msg: (e as Error).message }),
      )
    return () => {
      cancelled = true
    }
  }, [url])

  if (state.status === 'loading') return <CircularProgress />
  if (state.status === 'error')
    return (
      <Alert severity="error">Could not load a preview ({state.msg}).</Alert>
    )

  const e = ext(name)
  const { text, truncated } = state
  let body: React.ReactNode

  if (e === 'csv' || e === 'tsv') {
    const rows = parseCsv(text, e === 'tsv' ? '\t' : ',')
    body = (
      <Box sx={{ overflow: 'auto', maxHeight: '75vh' }}>
        <Box
          component="table"
          sx={{
            borderCollapse: 'collapse',
            fontSize: 13,
            '& td, & th': {
              border: 1,
              borderColor: 'divider',
              px: 1,
              py: 0.5,
              whiteSpace: 'nowrap',
            },
            '& th': { bgcolor: 'action.hover', position: 'sticky', top: 0 },
          }}
        >
          <thead>
            <tr>
              {rows[0]?.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(1).map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Box>
        {rows.length >= MAX_CSV_ROWS && (
          <Typography variant="caption" color="text.secondary">
            Showing the first {MAX_CSV_ROWS} rows.
          </Typography>
        )}
      </Box>
    )
  } else if (e === 'md' || e === 'markdown') {
    body = (
      <Box sx={{ maxHeight: '75vh', overflow: 'auto', px: 2 }}>
        <Markdown>{text}</Markdown>
      </Box>
    )
  } else {
    let shown = text
    if (e === 'json' && !truncated) {
      try {
        shown = JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        // show as-is
      }
    }
    body = (
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 2,
          maxHeight: '75vh',
          overflow: 'auto',
          fontSize: 13,
          lineHeight: 1.55,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          bgcolor: 'action.hover',
          borderRadius: 1,
          whiteSpace: 'pre',
        }}
      >
        {shown}
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', pt: 5 }}>
      {truncated && (
        <Alert severity="info" sx={{ mb: 1 }}>
          Showing the first 512 KB. Download the file to see all of it.
        </Alert>
      )}
      {body}
    </Box>
  )
}
