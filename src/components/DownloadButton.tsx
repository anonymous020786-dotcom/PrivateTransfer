import React, { JSX } from 'react'
import Button from '@mui/material/Button'
import DownloadIcon from '@mui/icons-material/Download'

export default function DownloadButton({
  onClick,
}: {
  onClick?: React.MouseEventHandler
}): JSX.Element {
  return (
    <Button
      id="download-button"
      onClick={onClick}
      variant="contained"
      color="success"
      size="large"
      startIcon={<DownloadIcon />}
      sx={{ height: 48 }}
    >
      Download
    </Button>
  )
}
