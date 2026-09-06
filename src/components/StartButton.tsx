import React from 'react'
import Button from '@mui/material/Button'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'

export default function StartButton({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>
}): React.ReactElement {
  return (
    <Button
      id="start-button"
      onClick={onClick}
      variant="contained"
      color="success"
      startIcon={<PlayArrowIcon />}
    >
      Start
    </Button>
  )
}
