'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'

export type FileProgress = {
  name: string
  size: number // total bytes
  loaded: number // bytes uploaded so far
  progress: number // 0–100
  done: boolean
  error: boolean
}

type Props = {
  files: FileProgress[]
  overallProgress: number // 0–100
  speedBps: number // current bytes/sec across all files
  etaSeconds: number | null // null while calculating
}

function fmtSpeed(bps: number): string {
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} MB/s`
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(0)} KB/s`
  return `${bps.toFixed(0)} B/s`
}

function fmtEta(s: number): string {
  if (s < 60) return `${Math.ceil(s)}s left`
  if (s < 3600) return `${Math.ceil(s / 60)}m left`
  return `${(s / 3600).toFixed(1)}h left`
}

export default function UploadProgress({
  files,
  overallProgress,
  speedBps,
  etaSeconds,
}: Props): React.ReactElement {
  return (
    <Box>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Uploading…
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {speedBps > 0 && (
            <Typography variant="caption" color="text.secondary">
              {fmtSpeed(speedBps)}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {Math.round(overallProgress)}%
            {etaSeconds !== null &&
              etaSeconds > 0 &&
              ` · ${fmtEta(etaSeconds)}`}
          </Typography>
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={overallProgress}
        sx={{ height: 8, borderRadius: 1, mb: 2 }}
      />
      <Stack spacing={1}>
        {files.map((f, i) => (
          <Box key={i}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ mb: 0.25, alignItems: 'center' }}
            >
              {f.done && !f.error && (
                <CheckCircleIcon fontSize="small" color="success" />
              )}
              {f.error && <ErrorIcon fontSize="small" color="error" />}
              <Typography
                variant="caption"
                noWrap
                sx={{ flex: 1, color: f.error ? 'error.main' : 'text.primary' }}
              >
                {f.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {f.done
                  ? 'Done'
                  : f.error
                    ? 'Failed'
                    : `${Math.round(f.progress)}%`}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={f.progress}
              color={f.error ? 'error' : f.done ? 'success' : 'primary'}
              sx={{ height: 4, borderRadius: 1 }}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  )
}
