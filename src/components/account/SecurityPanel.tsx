'use client'
/* eslint-disable @typescript-eslint/no-use-before-define */

import * as React from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import { getSupabaseBrowserClient } from '../../supabase/client'

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  )
}

export default function SecurityPanel({
  email,
  initialBackupEmail,
}: {
  email: string
  initialBackupEmail: string
}): React.ReactElement {
  return (
    <Box>
      <ChangePassword />
      <BackupEmail initial={initialBackupEmail} />
      <TotpSection />
      <DangerZone email={email} />
    </Box>
  )
}

function ChangePassword(): React.ReactElement {
  const supabase = getSupabaseBrowserClient()
  const [pw, setPw] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const save = async () => {
    if (pw !== confirm)
      return setMsg({ type: 'error', text: 'Passwords do not match.' })
    if (pw.length < 8)
      return setMsg({ type: 'error', text: 'Use at least 8 characters.' })
    setBusy(true)
    setMsg(null)
    const { error } = (await supabase?.auth.updateUser({ password: pw })) || {}
    setBusy(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else {
      setMsg({ type: 'success', text: 'Password updated.' })
      setPw('')
      setConfirm('')
    }
  }

  return (
    <SectionCard title="Change password">
      {msg && (
        <Alert severity={msg.type} sx={{ mb: 2 }}>
          {msg.text}
        </Alert>
      )}
      <Stack spacing={2}>
        <TextField
          label="New password"
          type="password"
          size="small"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <TextField
          label="Confirm password"
          type="password"
          size="small"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Box>
          <Button variant="contained" onClick={save} disabled={busy}>
            {busy ? <CircularProgress size={20} /> : 'Update password'}
          </Button>
        </Box>
      </Stack>
    </SectionCard>
  )
}

function BackupEmail({ initial }: { initial: string }): React.ReactElement {
  const supabase = getSupabaseBrowserClient()
  const [val, setVal] = React.useState(initial)
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const save = async () => {
    setBusy(true)
    setMsg(null)
    const { error } =
      (await supabase?.auth.updateUser({ data: { backup_email: val } })) || {}
    setBusy(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: 'Backup email saved.' })
  }

  return (
    <SectionCard title="Backup (recovery) email">
      {msg && (
        <Alert severity={msg.type} sx={{ mb: 2 }}>
          {msg.text}
        </Alert>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        A secondary email we can use to help you recover access.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label="Backup email"
          type="email"
          size="small"
          fullWidth
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <Button variant="contained" onClick={save} disabled={busy}>
          Save
        </Button>
      </Stack>
    </SectionCard>
  )
}

type Factor = { id: string; status: string }

function TotpSection(): React.ReactElement {
  const supabase = getSupabaseBrowserClient()
  const [factors, setFactors] = React.useState<Factor[]>([])
  const [enroll, setEnroll] = React.useState<{
    id: string
    qr: string
    secret: string
  } | null>(null)
  const [code, setCode] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const refresh = React.useCallback(async () => {
    const { data } = (await supabase?.auth.mfa.listFactors()) || { data: null }
    setFactors((data?.totp as Factor[]) || [])
  }, [supabase])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const startEnroll = async () => {
    setBusy(true)
    setMsg(null)
    const { data, error } = (await supabase!.auth.mfa.enroll({
      factorType: 'totp',
    })) as {
      data: { id: string; totp: { qr_code: string; secret: string } } | null
      error: { message: string } | null
    }
    setBusy(false)
    if (error || !data)
      return setMsg({
        type: 'error',
        text: error?.message || 'Could not start enrollment.',
      })
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
  }

  const verify = async () => {
    if (!enroll) return
    setBusy(true)
    setMsg(null)
    const ch = await supabase!.auth.mfa.challenge({ factorId: enroll.id })
    if (ch.error) {
      setBusy(false)
      return setMsg({ type: 'error', text: ch.error.message })
    }
    const v = await supabase!.auth.mfa.verify({
      factorId: enroll.id,
      challengeId: ch.data.id,
      code,
    })
    setBusy(false)
    if (v.error) setMsg({ type: 'error', text: v.error.message })
    else {
      setEnroll(null)
      setCode('')
      setMsg({ type: 'success', text: 'Two-factor authentication enabled.' })
      refresh()
    }
  }

  const disable = async (id: string) => {
    setBusy(true)
    setMsg(null)
    const { error } = await supabase!.auth.mfa.unenroll({ factorId: id })
    setBusy(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else {
      setMsg({ type: 'success', text: 'Two-factor disabled.' })
      refresh()
    }
  }

  const active = factors.filter((f) => f.status === 'verified')

  return (
    <SectionCard title="Two-factor authentication (TOTP)">
      {msg && (
        <Alert severity={msg.type} sx={{ mb: 2 }}>
          {msg.text}
        </Alert>
      )}
      {active.length > 0 ? (
        <Stack spacing={2}>
          <Chip
            color="success"
            label="2FA is enabled"
            sx={{ alignSelf: 'flex-start' }}
          />
          {active.map((f) => (
            <Box key={f.id}>
              <Button
                color="error"
                variant="outlined"
                onClick={() => disable(f.id)}
                disabled={busy}
              >
                Disable 2FA
              </Button>
            </Box>
          ))}
        </Stack>
      ) : enroll ? (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography variant="body2" color="text.secondary">
            Scan this QR code with your authenticator app, then enter the
            6-digit code.
          </Typography>
          {/* qr_code is an SVG data URI from Supabase */}
          <Box
            component="img"
            src={enroll.qr}
            alt="TOTP QR code"
            sx={{ width: 180, height: 180 }}
          />
          <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
            Secret: {enroll.secret}
          </Typography>
          <TextField
            label="6-digit code"
            size="small"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
          />
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" onClick={verify} disabled={busy}>
              Verify & enable
            </Button>
            <Button onClick={() => setEnroll(null)}>Cancel</Button>
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography variant="body2" color="text.secondary">
            Add a second layer of security using an authenticator app.
          </Typography>
          <Button variant="contained" onClick={startEnroll} disabled={busy}>
            {busy ? <CircularProgress size={20} /> : 'Enable 2FA'}
          </Button>
        </Stack>
      )}
    </SectionCard>
  )
}

function DangerZone({ email }: { email: string }): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [confirm, setConfirm] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const del = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not delete account.')
      window.location.href = '/'
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Card variant="outlined" sx={{ borderColor: 'error.main' }}>
      <CardContent>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, mb: 1, color: 'error.main' }}
        >
          Delete account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Permanently delete your account and profile. This cannot be undone.
        </Typography>
        <Button color="error" variant="outlined" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      </CardContent>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Delete your account?</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography variant="body2" sx={{ mb: 2 }}>
            This permanently deletes your account. Type your email{' '}
            <strong>{email}</strong> to confirm.
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={email}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy || confirm !== email}
            onClick={del}
          >
            {busy ? <CircularProgress size={20} /> : 'Permanently delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
