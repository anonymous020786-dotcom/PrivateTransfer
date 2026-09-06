'use client'

import * as React from 'react'
import Box from '@mui/material/Box'

// Animated "tech" backdrop: drifting gradient orbs over a subtle grid, with a
// soft fade at the edges. Pure CSS so it's lightweight; the global reduced-
// motion preference neutralizes the animation automatically.
export default function AnimatedBackground({
  height = '100%',
}: {
  height?: number | string
}): React.ReactElement {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        height,
        overflow: 'hidden',
        zIndex: 0,
        pointerEvents: 'none',
        // grid
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(99,102,241,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.08) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage:
            'radial-gradient(ellipse at 50% 0%, #000 30%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at 50% 0%, #000 30%, transparent 75%)',
        },
      }}
    >
      {[
        {
          c: 'rgba(99,102,241,0.45)',
          size: 420,
          top: '-10%',
          left: '5%',
          dur: '14s',
        },
        {
          c: 'rgba(168,85,247,0.40)',
          size: 360,
          top: '0%',
          left: '70%',
          dur: '18s',
        },
        {
          c: 'rgba(6,182,212,0.30)',
          size: 300,
          top: '40%',
          left: '40%',
          dur: '22s',
        },
      ].map((orb, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            top: orb.top,
            left: orb.left,
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.c}, transparent 70%)`,
            filter: 'blur(30px)',
            animation: `zync-float-${i} ${orb.dur} ease-in-out infinite alternate`,
            [`@keyframes zync-float-${i}`]: {
              from: { transform: 'translate(0,0) scale(1)' },
              to: {
                transform: `translate(${i % 2 ? -40 : 40}px, 30px) scale(1.15)`,
              },
            },
          }}
        />
      ))}
    </Box>
  )
}
