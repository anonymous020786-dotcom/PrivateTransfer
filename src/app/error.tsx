'use client'

import * as React from 'react'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import { ZyncIcon } from '../components/Logo'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): React.ReactElement {
  React.useEffect(() => {
    // Only log in development — in production, rely on error.digest for support tracing
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[Zync] route error:', error)
    }
    // Future: send digest to a structured logging/monitoring endpoint
    // fetch('/api/log/client-error', { method: 'POST', body: JSON.stringify({ digest: error.digest }) })
  }, [error])

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
      <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <ZyncIcon size={56} />
        <Stack spacing={1}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Something went wrong
          </Typography>
          <Typography color="text.secondary">
            An unexpected error occurred. You can try again, or go back home.
          </Typography>
        </Stack>
        {error.digest && (
          <Alert severity="info" sx={{ width: '100%', textAlign: 'left' }}>
            <Typography variant="caption">
              Error reference: <strong>{error.digest}</strong>
              <br />
              Include this if you contact support.
            </Typography>
          </Alert>
        )}
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={reset} size="large">
            Try again
          </Button>
          <Button variant="outlined" href="/" size="large">
            Go home
          </Button>
        </Stack>
      </Stack>
    </Container>
  )
}
