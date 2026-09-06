'use client'

import * as React from 'react'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'

import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { ZyncIcon } from '../../components/Logo'
import { getSupabaseBrowserClient } from '../../supabase/client'
import { useRecaptcha } from '../../hooks/useRecaptcha'

type Step = 'email' | 'code' | 'password' | 'done'

export default function ResetPasswordPage(): React.ReactElement {
  const supabase = getSupabaseBrowserClient()
  const { getToken } = useRecaptcha()
  const [step, setStep] = React.useState<Step>('email')
  const [email, setEmail] = React.useState('')
  const [otp, setOtp] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [showPw, setShowPw] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    await getToken('reset_password')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: undefined,
    })
    setBusy(false)
    if (error) setError(error.message)
    else setStep('code')
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: 'recovery',
    })
    setBusy(false)
    if (error) setError(error.message)
    else setStep('password')
  }

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.message)
    else setStep('done')
  }

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 8, md: 12 } }}>
      <Card variant="outlined">
        <CardContent sx={{ p: 4 }}>
          <Stack
            spacing={2.5}
            sx={{ alignItems: 'center', textAlign: 'center' }}
          >
            <ZyncIcon size={52} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Reset your password
            </Typography>

            {!supabase ? (
              <Alert severity="info" sx={{ width: '100%' }}>
                Authentication isn't configured.
              </Alert>
            ) : step === 'done' ? (
              <>
                <Alert
                  severity="success"
                  sx={{ width: '100%', textAlign: 'left' }}
                >
                  Password updated successfully.
                </Alert>
                <Button href="/login" variant="contained" fullWidth>
                  Sign in
                </Button>
              </>
            ) : step === 'email' ? (
              <Stack
                component="form"
                onSubmit={sendCode}
                spacing={2}
                sx={{ width: '100%' }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: 'left' }}
                >
                  Enter your email and we'll send you an 8-digit code to reset
                  your password.
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  label="Email"
                  type="email"
                  required
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={busy}
                  fullWidth
                >
                  {busy ? <CircularProgress size={22} /> : 'Send reset code'}
                </Button>
                <Link
                  href="/login"
                  variant="body2"
                  sx={{ textAlign: 'center' }}
                >
                  ← Back to sign in
                </Link>
              </Stack>
            ) : step === 'code' ? (
              <Stack
                component="form"
                onSubmit={verifyCode}
                spacing={2}
                sx={{ width: '100%' }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: 'left' }}
                >
                  We sent an 8-digit code to <strong>{email}</strong>. Enter it
                  below.
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  label="8-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  slotProps={{
                    htmlInput: { inputMode: 'numeric', maxLength: 8 },
                  }}
                  fullWidth
                  autoFocus
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={busy || otp.trim().length !== 8}
                  fullWidth
                >
                  {busy ? <CircularProgress size={22} /> : 'Verify code'}
                </Button>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={() => {
                      setStep('email')
                      setOtp('')
                      setError(null)
                    }}
                  >
                    ← Different email
                  </Link>
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={async () => {
                      setOtp('')
                      setError(null)
                      await supabase!.auth.resetPasswordForEmail(email, {
                        redirectTo: undefined,
                      })
                      setError(null)
                    }}
                  >
                    Resend code
                  </Link>
                </Stack>
              </Stack>
            ) : (
              <Stack
                component="form"
                onSubmit={updatePassword}
                spacing={2}
                sx={{ width: '100%' }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: 'left' }}
                >
                  Choose a new password for your account.
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  label="New password"
                  type={showPw ? 'text' : 'password'}
                  required
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPw((s) => !s)}
                            edge="end"
                          >
                            {showPw ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  label="Confirm password"
                  type={showPw ? 'text' : 'password'}
                  required
                  fullWidth
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={busy}
                  fullWidth
                >
                  {busy ? <CircularProgress size={22} /> : 'Update password'}
                </Button>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}
