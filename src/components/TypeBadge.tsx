import React, { JSX } from 'react'
import Chip from '@mui/material/Chip'

type BadgeColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'

function getTypeColor(fileType: string): BadgeColor {
  if (fileType.startsWith('image/')) return 'info'
  if (fileType.startsWith('text/')) return 'success'
  if (fileType.startsWith('audio/')) return 'secondary'
  if (fileType.startsWith('video/')) return 'warning'
  return 'default'
}

export default function TypeBadge({ type }: { type: string }): JSX.Element {
  return (
    <Chip
      label={type || 'unknown'}
      size="small"
      color={getTypeColor(type)}
      variant="outlined"
      sx={{ fontSize: 10, fontWeight: 600, height: 22, maxWidth: 180 }}
    />
  )
}
