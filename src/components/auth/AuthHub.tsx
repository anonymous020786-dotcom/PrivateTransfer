'use client'
/* eslint-disable @typescript-eslint/no-use-before-define */

import * as React from 'react'
import Card from '@mui/material/Card'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import CircularProgress from '@mui/material/CircularProgress'
import GoogleIcon from '@mui/icons-material/Google'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined'
import { ZyncIcon } from '../Logo'
import { getSupabaseBrowserClient } from '../../supabase/client'
import { brand } from '../../brand'
import { useRecaptcha } from '../../hooks/useRecaptcha'

type Mode = 'signin' | 'signup'

const FEATURES = [
  {
    icon: <LockOutlinedIcon />,
    title: 'End-to-end encrypted',
    text: 'Files stream peer-to-peer over WebRTC DTLS — never stored on a server.',
  },
  {
    icon: <BoltOutlinedIcon />,
    title: 'No size limits',
    text: 'Send files of any size, straight from your browser.',
  },
  {
    icon: <VisibilityOffOutlinedIcon />,
    title: 'Private by design',
    text: 'No file scanning, no tracking, nothing retained after a transfer.',
  },
]

export default function AuthHub(): React.ReactElement {
  const supabase = getSupabaseBrowserClient()
  const [mode, setMode] = React.useState<Mode>('signin')
  const [next, setNext] = React.useState('/account')

  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const n = p.get('next')
    if (n) setNext(n)
    if (p.get('mode') === 'signup') setMode('signup')
  }, [])

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        px: 2,
        py: { xs: 4, md: 8 },
      }}
    >
      <Card
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 940,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          borderRadius: 4,
        }}
      >
        {/* Brand / value panel */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 5,
            color: '#fff',
            background:
              'linear-gradient(160deg, #4f46e5 0%, #7c3aed 55%, #9333ea 100%)',
          }}
        >
          <Stack spacing={1.5}>
            <ZyncIcon size={44} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {brand.name}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {brand.tagline}
            </Typography>
          </Stack>

          <Stack spacing={2.5} sx={{ my: 4 }}>
            {FEATURES.map((f) => (
              <Stack
                key={f.title}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'flex-start' }}
              >
                <Box sx={{ mt: 0.3, opacity: 0.95 }}>{f.icon}</Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {f.title}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>
                    {f.text}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', opacity: 0.9 }}
          >
            <VerifiedUserOutlinedIcon fontSize="small" />
            <Typography variant="caption">
              Trusted, encrypted, and ad-free.
            </Typography>
          </Stack>
        </Box>

        {/* Auth panel */}
        <Box sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                justifyContent: 'center',
                mb: 1,
              }}
            >
              <ZyncIcon size={44} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {mode === 'signin' ? 'Welcome back' : `Create your account`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {mode === 'signin'
                ? `Sign in to continue to ${brand.name}.`
                : 'Free forever — unlock unlimited private transfers.'}
            </Typography>
          </Stack>

          {!supabase ? (
            <Alert severity="info">
              Authentication isn’t configured yet. Add your Supabase keys to
              enable sign-in.
            </Alert>
          ) : (
            <>
              <Tabs
                value={mode}
                onChange={(_, v) => setMode(v)}
                variant="fullWidth"
                sx={{ mb: 3 }}
              >
                <Tab value="signin" label="Sign in" />
                <Tab value="signup" label="Create account" />
              </Tabs>

              {mode === 'signin' ? (
                <SignInForm next={next} />
              ) : (
                <SignUpForm next={next} />
              )}

              <Divider sx={{ my: 3 }}>or</Divider>
              <GoogleButton next={next} />
            </>
          )}
        </Box>
      </Card>
    </Box>
  )
}

function GoogleButton({ next }: { next: string }): React.ReactElement {
  const supabase = getSupabaseBrowserClient()
  return (
    <Button
      fullWidth
      variant="outlined"
      size="large"
      startIcon={<GoogleIcon />}
      onClick={() =>
        supabase?.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        })
      }
    >
      Continue with Google
    </Button>
  )
}

function passwordScore(pw: string): {
  score: number
  label: string
  color: 'error' | 'warning' | 'info' | 'success'
} {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const score = Math.min(s, 4)
  const map = {
    0: { label: 'Too weak', color: 'error' as const },
    1: { label: 'Weak', color: 'error' as const },
    2: { label: 'Fair', color: 'warning' as const },
    3: { label: 'Good', color: 'info' as const },
    4: { label: 'Strong', color: 'success' as const },
  }
  return { score, ...map[score as 0 | 1 | 2 | 3 | 4] }
}

function PasswordField({
  label,
  value,
  onChange,
  helperText,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  helperText?: string
}): React.ReactElement {
  const [show, setShow] = React.useState(false)
  return (
    <TextField
      label={label}
      type={show ? 'text' : 'password'}
      required
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      helperText={helperText}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShow((s) => !s)}
                edge="end"
                aria-label="Toggle password visibility"
              >
                {show ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}

function SignInForm({ next }: { next: string }): React.ReactElement {
  const supabase = getSupabaseBrowserClient()!
  const { getToken } = useRecaptcha()
  const [useOtp, setUseOtp] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [otpSent, setOtpSent] = React.useState(false)
  const [otp, setOtp] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<string | null>(null)

  const go = () => (window.location.href = next)

  const passwordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    await getToken('signin')
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setBusy(false)
    if (error) setError(error.message)
    else go()
  }

  const sendOtp = async () => {
    setBusy(true)
    setError(null)
    await getToken('otp_request')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: undefined,
      },
    })
    setBusy(false)
    if (error) setError(error.message)
    else {
      setOtpSent(true)
      setInfo('We emailed you an 8-digit code. Check your inbox.')
    }
  }

  const verifyOtp = async () => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: 'email',
    })
    setBusy(false)
    if (error) setError(error.message)
    else go()
  }

  return (
    <Box component="form" onSubmit={passwordSignIn}>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {info && <Alert severity="success">{info}</Alert>}

        <TextField
          label="Email"
          type="email"
          required
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {!useOtp && (
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
          />
        )}

        {useOtp && otpSent && (
          <TextField
            label="8-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
            fullWidth
          />
        )}

        {!useOtp ? (
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={busy}
          >
            {busy ? <CircularProgress size={22} /> : 'Sign in'}
          </Button>
        ) : otpSent ? (
          <>
            <Button
              onClick={verifyOtp}
              variant="contained"
              size="large"
              disabled={busy}
            >
              {busy ? <CircularProgress size={22} /> : 'Verify code'}
            </Button>
            <Link
              component="button"
              type="button"
              variant="body2"
              sx={{ textAlign: 'center' }}
              onClick={() => {
                setOtp('')
                setError(null)
                sendOtp()
              }}
            >
              Resend code
            </Link>
          </>
        ) : (
          <Button
            onClick={sendOtp}
            variant="contained"
            size="large"
            disabled={busy || !email}
          >
            {busy ? <CircularProgress size={22} /> : 'Email me a code'}
          </Button>
        )}

        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={() => {
              setUseOtp(!useOtp)
              setOtpSent(false)
              setError(null)
              setInfo(null)
            }}
          >
            {useOtp ? 'Use password instead' : 'Use a one-time code'}
          </Link>
          {!useOtp && (
            <Link href="/reset-password" variant="body2">
              Forgot password?
            </Link>
          )}
        </Stack>
      </Stack>
    </Box>
  )
}

function SignUpForm({ next }: { next: string }): React.ReactElement {
  const supabase = getSupabaseBrowserClient()!
  const { getToken } = useRecaptcha()
  const [fullName, setFullName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [photo, setPhoto] = React.useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<string | null>(null)
  const [otpSent, setOtpSent] = React.useState(false)
  const [otp, setOtp] = React.useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)
  const strength = passwordScore(password)

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  const verifyAndFinish = async () => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: 'signup',
    })
    if (error) {
      setBusy(false)
      setError(error.message)
      return
    }
    if (photo) {
      const form = new FormData()
      form.append('file', photo)
      await fetch('/api/profile/avatar', { method: 'POST', body: form }).catch(
        () => {},
      )
    }
    window.location.href = next
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpSent) {
      verifyAndFinish()
      return
    }
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
    await getToken('signup')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: undefined,
      },
    })
    if (error) {
      setBusy(false)
      setError(error.message)
      return
    }

    if (data.session) {
      // Email confirmations disabled — signed in immediately.
      if (photo) {
        const form = new FormData()
        form.append('file', photo)
        await fetch('/api/profile/avatar', {
          method: 'POST',
          body: form,
        }).catch(() => {})
      }
      window.location.href = next
      return
    }

    setBusy(false)
    setOtpSent(true)
    setInfo('We emailed you an 8-digit confirmation code. Enter it below.')
  }

  if (otpSent) {
    return (
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {info && <Alert severity="success">{info}</Alert>}
        <TextField
          label="8-digit confirmation code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
          fullWidth
          autoFocus
        />
        <Button
          onClick={verifyAndFinish}
          variant="contained"
          size="large"
          disabled={busy || otp.trim().length !== 8}
        >
          {busy ? <CircularProgress size={22} /> : 'Confirm & create account'}
        </Button>
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={() => {
              setOtpSent(false)
              setOtp('')
              setInfo(null)
              setError(null)
            }}
          >
            ← Back
          </Link>
          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={async () => {
              setOtp('')
              setError(null)
              await supabase.auth.signUp({
                email,
                password,
                options: {
                  data: { full_name: fullName },
                  emailRedirectTo: undefined,
                },
              })
              setInfo('New code sent — check your inbox.')
            }}
          >
            Resend code
          </Link>
        </Stack>
      </Stack>
    )
  }

  return (
    <Box component="form" onSubmit={submit}>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {info && <Alert severity="success">{info}</Alert>}

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar
            src={photoPreview || undefined}
            sx={{ width: 64, height: 64 }}
          >
            {fullName?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onPhoto}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              onClick={() => fileRef.current?.click()}
            >
              {photo ? 'Change photo' : 'Add photo'}
            </Button>
            {photo && (
              <IconButton
                size="small"
                onClick={() => {
                  setPhoto(null)
                  setPhotoPreview(null)
                }}
                aria-label="Remove photo"
              >
                ✕
              </IconButton>
            )}
          </Box>
        </Stack>

        <TextField
          label="Full name"
          required
          fullWidth
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <TextField
          label="Email"
          type="email"
          required
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Box>
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            helperText="At least 8 characters"
          />
          {password.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={(strength.score / 4) * 100}
                color={strength.color}
                sx={{ height: 6, borderRadius: 3 }}
              />
              <Typography
                variant="caption"
                color={`${strength.color}.main`}
                sx={{ fontWeight: 600 }}
              >
                {strength.label}
              </Typography>
            </Box>
          )}
        </Box>
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
        />

        <Button type="submit" variant="contained" size="large" disabled={busy}>
          {busy ? <CircularProgress size={22} /> : 'Create account'}
        </Button>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: 'center' }}
        >
          By creating an account you agree to our{' '}
          <Link href="/terms">Terms</Link> and{' '}
          <Link href="/privacy">Privacy Policy</Link>.
        </Typography>
      </Stack>
    </Box>
  )
}
