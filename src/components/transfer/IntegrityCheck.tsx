'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Collapse from '@mui/material/Collapse'
import LinearProgress from '@mui/material/LinearProgress'
import VerifiedIcon from '@mui/icons-material/Verified'
import { hashFile } from '../../utils/cloudUpload'

type Checked = {
  name: string
  hex: string | null
  match: string | null // name of the transfer file it matches
}

// Lets recipients confirm that files they downloaded are bit-for-bit what the
// sender uploaded, by comparing SHA-256 digests computed locally in the
// browser against the ones the sender's browser recorded at upload time.
export default function IntegrityCheck({
  files,
}: {
  files: Array<{ name: string; sha256?: string }>
}): React.ReactElement | null {
  const withSums = files.filter((f) => f.sha256)
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [results, setResults] = React.useState<Checked[]>([])
  const inputRef = React.useRef<HTMLInputElement>(null)

  if (withSums.length === 0) return null

  const check = async (list: FileList | null) => {
    if (!list?.length) return
    setBusy(true)
    const out: Checked[] = []
    for (const f of Array.from(list)) {
      const hex = await hashFile(f)
      const match = withSums.find((w) => w.sha256 === hex)?.name ?? null
      out.push({ name: f.name, hex, match })
    }
    setResults(out)
    setBusy(false)
  }

  return (
    <Box>
      <Button
        size="small"
        startIcon={<VerifiedIcon />}
        onClick={() => setOpen((o) => !o)}
        sx={{ textTransform: 'none' }}
      >
        Verify file integrity (SHA-256)
      </Button>
      <Collapse in={open}>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            The sender&apos;s browser recorded a SHA-256 fingerprint of each
            file. Select the files you downloaded to check they arrived intact —
            they are hashed on your device and never uploaded.
          </Typography>
          <Box
            component="ul"
            sx={{
              m: 0,
              pl: 2.5,
              fontSize: 12,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            {withSums.map((f) => (
              <li key={f.name}>
                <strong>{f.name}</strong>: {f.sha256}
              </li>
            ))}
          </Box>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => void check(e.target.files)}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            sx={{ alignSelf: 'flex-start' }}
          >
            Choose downloaded files…
          </Button>
          {busy && <LinearProgress />}
          {results.map((r) => (
            <Alert key={r.name} severity={r.match ? 'success' : 'error'}>
              <strong>{r.name}</strong>
              {r.match
                ? ` matches “${r.match}” — intact.`
                : ' does not match any file in this transfer. It may be corrupted, incomplete, or a different file.'}
            </Alert>
          ))}
        </Stack>
      </Collapse>
    </Box>
  )
}
