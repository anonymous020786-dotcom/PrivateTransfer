'use client'

import * as React from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'

export default function AdminTools(): React.ReactElement {
  const [slug, setSlug] = React.useState('')
  const [msg, setMsg] = React.useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [busy, setBusy] = React.useState(false)

  const destroy = async () => {
    if (!slug.trim()) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/destroy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug.trim(), reason: 'admin' }),
      })
      if (!res.ok) throw new Error('Failed to destroy channel')
      setMsg({ type: 'success', text: `Channel "${slug.trim()}" destroyed.` })
      setSlug('')
    } catch (e) {
      setMsg({ type: 'error', text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Channel moderation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Immediately halt a transfer by its slug (short or long).
        </Typography>
        {msg && (
          <Alert severity={msg.type} sx={{ mb: 2 }}>
            {msg.text}
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="Channel slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            size="small"
            fullWidth
          />
          <Button
            variant="contained"
            color="error"
            onClick={destroy}
            disabled={busy}
          >
            Destroy
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
