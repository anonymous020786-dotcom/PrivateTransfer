'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import GroupIcon from '@mui/icons-material/Group'

export default function JoinWorkspacePage(): React.ReactElement {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [status, setStatus] = React.useState<
    'idle' | 'joining' | 'done' | 'error'
  >('idle')
  const [message, setMessage] = React.useState('')
  const [wsName, setWsName] = React.useState('')

  const join = async () => {
    setStatus('joining')
    try {
      const res = await fetch('/api/workspaces/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()
      if (res.ok) {
        setWsName(json.workspace?.name ?? 'the workspace')
        setStatus('done')
      } else if (res.status === 401) {
        setMessage('Please sign in first to accept this invitation.')
        setStatus('error')
      } else {
        setMessage(json.error ?? 'Invite not found or expired.')
        setStatus('error')
      }
    } catch {
      setMessage('Network error. Please try again.')
      setStatus('error')
    }
  }

  React.useEffect(() => {
    void join()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 8, md: 14 } }}>
      <Card variant="outlined">
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <GroupIcon sx={{ fontSize: 56, color: 'primary.main' }} />
            {status === 'joining' && (
              <>
                <Typography variant="h6">Joining workspace…</Typography>
                <CircularProgress />
              </>
            )}
            {status === 'done' && (
              <>
                <Typography variant="h6">You&apos;re in!</Typography>
                <Typography color="text.secondary">
                  You&apos;ve joined <strong>{wsName}</strong>.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => router.push('/workspaces')}
                >
                  Go to workspace
                </Button>
              </>
            )}
            {status === 'error' && (
              <>
                <Typography variant="h6">Invite issue</Typography>
                <Alert
                  severity="error"
                  sx={{ textAlign: 'left', width: '100%' }}
                >
                  {message}
                </Alert>
                {message.includes('sign in') ? (
                  <Button
                    variant="contained"
                    href={`/login?next=/workspaces/join/${token}`}
                  >
                    Sign in
                  </Button>
                ) : (
                  <Button variant="outlined" href="/">
                    Go home
                  </Button>
                )}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}
