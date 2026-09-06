'use client'

import Button from '@mui/material/Button'

export default function OfflineReloadButton(): React.ReactElement {
  return (
    <Button variant="contained" onClick={() => window.location.reload()}>
      Try again
    </Button>
  )
}
