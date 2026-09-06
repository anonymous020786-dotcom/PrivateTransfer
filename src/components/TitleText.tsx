import React, { JSX } from 'react'
import Typography from '@mui/material/Typography'

export default function TitleText({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return (
    <Typography
      variant="h6"
      component="p"
      align="center"
      sx={{ maxWidth: 448, fontWeight: 500, color: 'text.primary' }}
    >
      {children}
    </Typography>
  )
}
