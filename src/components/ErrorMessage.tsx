import { JSX } from 'react'
import Alert from '@mui/material/Alert'

export function ErrorMessage({ message }: { message: string }): JSX.Element {
  return (
    <Alert severity="error" variant="outlined" sx={{ width: '100%' }}>
      {message}
    </Alert>
  )
}
