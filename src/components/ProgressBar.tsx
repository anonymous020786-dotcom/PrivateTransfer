'use client'

import React, { JSX, useRef, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'

function formatSpeed(bps: number): string {
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(1)} GB/s`
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} MB/s`
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(1)} KB/s`
  return `${Math.round(bps)} B/s`
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s left`
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m left`
  return `${(seconds / 3600).toFixed(1)}h left`
}

export default function ProgressBar({
  value,
  max,
  startTime,
}: {
  value: number
  max: number
  startTime?: number
}): JSX.Element {
  const percentage = max > 0 ? (value / max) * 100 : 0
  const isComplete = value >= max && max > 0

  // Rolling speed calculation using last 3s window
  const windowRef = useRef<Array<{ t: number; v: number }>>([])
  const [speed, setSpeed] = useState<number | null>(null)

  useEffect(() => {
    if (!startTime || isComplete) return
    const now = Date.now()
    windowRef.current.push({ t: now, v: value })
    // Keep only last 3s of samples
    windowRef.current = windowRef.current.filter((s) => now - s.t < 3000)
    if (windowRef.current.length >= 2) {
      const oldest = windowRef.current[0]
      const dt = (now - oldest.t) / 1000
      if (dt > 0) setSpeed((value - oldest.v) / dt)
    }
  }, [value, startTime, isComplete])

  useEffect(() => {
    if (isComplete) setSpeed(null)
  }, [isComplete])

  const remaining =
    speed && speed > 0 && max > value ? (max - value) / speed : null

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        id="progress-bar"
        sx={{ position: 'relative', width: '100%', height: 48 }}
      >
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(0, percentage))}
          color={isComplete ? 'success' : 'primary'}
          sx={{
            height: '100%',
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              borderRadius: 1.5,
              transition: 'transform .3s ease-in-out',
            },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography
            id="progress-percentage"
            sx={{
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,.45)',
            }}
          >
            {Math.round(percentage)}%
          </Typography>
        </Box>
      </Box>
      {(speed !== null || remaining !== null) && !isComplete && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 0.5,
            px: 0.5,
          }}
        >
          {speed !== null && (
            <Typography variant="caption" color="text.secondary">
              {formatSpeed(speed)}
            </Typography>
          )}
          {remaining !== null && (
            <Typography variant="caption" color="text.secondary">
              {formatEta(remaining)}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
}
