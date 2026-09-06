import React from 'react'
import Button from '@mui/material/Button'
import StopIcon from '@mui/icons-material/Stop'

export default function StopButton({
  isDownloading,
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>
  isDownloading?: boolean
}): React.ReactElement {
  return (
    <Button
      onClick={onClick}
      size="small"
      color="warning"
      startIcon={<StopIcon />}
      sx={{ fontSize: 12 }}
    >
      {isDownloading ? 'Stop Download' : 'Stop Upload'}
    </Button>
  )
}
