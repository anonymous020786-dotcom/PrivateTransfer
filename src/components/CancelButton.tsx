import React, { JSX } from 'react'
import Button from '@mui/material/Button'

export default function CancelButton({
  onClick,
  text = 'Cancel',
}: {
  onClick: React.MouseEventHandler
  text?: string
}): JSX.Element {
  return (
    <Button onClick={onClick} variant="outlined" color="inherit">
      {text}
    </Button>
  )
}
