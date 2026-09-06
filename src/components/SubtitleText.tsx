import React, { JSX } from 'react'
import Typography from '@mui/material/Typography'

export default function SubtitleText({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return (
    <Typography
      variant="body2"
      align="center"
      sx={{ maxWidth: 448, color: 'text.secondary' }}
    >
      {children}
    </Typography>
  )
}
