'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { useRotatingSpinner } from '../hooks/useRotatingSpinner'
import { ZyncIcon } from './Logo'

// Branded transfer graphic: a gradient ring (animated while a transfer is
// active) wrapping the Zync mark, with a direction arrow.
export default function TransferSpinner({
  direction,
}: {
  direction: 'up' | 'down'
}): React.ReactElement {
  const isRotating = useRotatingSpinner()
  const Arrow = direction === 'up' ? ArrowUpwardIcon : ArrowDownwardIcon

  return (
    <Box
      sx={{
        position: 'relative',
        width: 160,
        height: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        className={isRotating ? 'filepizza-spin-slow' : undefined}
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background:
            'conic-gradient(from 0deg, #6366f1, #a855f7, #6366f1, #a855f7, #6366f1)',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))',
          WebkitMask:
            'radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))',
          opacity: 0.9,
        }}
      />
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <ZyncIcon size={64} />
        <Arrow sx={{ color: 'primary.main' }} />
      </Box>
    </Box>
  )
}
