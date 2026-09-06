import React, { JSX } from 'react'
import Button from '@mui/material/Button'
import LockOpenIcon from '@mui/icons-material/LockOpen'

export default function UnlockButton({
  onClick,
}: {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}): JSX.Element {
  return (
    <Button
      type="submit"
      onClick={onClick}
      variant="contained"
      color="success"
      startIcon={<LockOpenIcon />}
    >
      Unlock
    </Button>
  )
}
