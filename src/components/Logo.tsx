import * as React from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { brand } from '../brand'

// The Zync mark: a stylized "Z" formed from two beams meeting in the middle,
// evoking peer-to-peer transfer. Uses an indigo→violet gradient.
export function ZyncIcon({
  size = 40,
  title = brand.name,
}: {
  size?: number
  title?: string
}): React.ReactElement {
  const id = React.useId()
  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      sx={{ display: 'block', flex: 'none' }}
    >
      <defs>
        <linearGradient id={`zync-grad-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        fill={`url(#zync-grad-${id})`}
      />
      <path
        d="M15 16h18l-13 12h13"
        fill="none"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="32" r="2.4" fill="#fff" />
      <circle cx="31.5" cy="16" r="2.4" fill="#fff" />
    </Box>
  )
}

export default function Logo({
  size = 40,
  showText = true,
}: {
  size?: number
  showText?: boolean
}): React.ReactElement {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <ZyncIcon size={size} />
      {showText && (
        <Typography
          component="span"
          sx={{
            fontWeight: 800,
            fontSize: size * 0.62,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg,#6366f1,#a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {brand.name}
        </Typography>
      )}
    </Stack>
  )
}
