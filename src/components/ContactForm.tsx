'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import SendIcon from '@mui/icons-material/Send'
import { useRecaptcha } from '../hooks/useRecaptcha'

export default function ContactForm(): React.ReactElement {
  const { getToken } = useRecaptcha()
  const [status, setStatus] = React.useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle')
  const [errorMsg, setErrorMsg] = React.useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    const form = e.currentTarget
    const data = new FormData(form)
    const recaptchaToken = await getToken('contact')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          subject: data.get('subject'),
          message: data.get('message'),
          website: data.get('website'),
          recaptchaToken,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Something went wrong.')
      }
      setStatus('sent')
      form.reset()
    } catch (err) {
      setStatus('error')
      setErrorMsg((err as Error).message)
    }
  }

  if (status === 'sent') {
    return (
      <Alert severity="success" sx={{ mt: 2 }}>
        Thanks for reaching out! We’ll get back to you at the email you
        provided.
      </Alert>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {status === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField name="name" label="Your name" fullWidth required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            name="email"
            label="Email"
            type="email"
            fullWidth
            required
          />
        </Grid>
        <Grid size={12}>
          <TextField name="subject" label="Subject" fullWidth />
        </Grid>
        <Grid size={12}>
          <TextField
            name="message"
            label="Message"
            fullWidth
            required
            multiline
            minRows={5}
          />
        </Grid>
      </Grid>

      {/* Honeypot field (hidden from humans) */}
      <Box
        component="input"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        sx={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }}
      />

      <Stack direction="row" sx={{ mt: 2, alignItems: 'center', gap: 2 }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={status === 'sending'}
          startIcon={
            status === 'sending' ? <CircularProgress size={18} /> : <SendIcon />
          }
        >
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </Button>
      </Stack>
    </Box>
  )
}
