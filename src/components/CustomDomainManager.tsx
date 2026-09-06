'use client'

import * as React from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Box from '@mui/material/Box'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingIcon from '@mui/icons-material/Pending'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import StepContent from '@mui/material/StepContent'
import Divider from '@mui/material/Divider'

type DomainRecord = {
  userId: string
  domain: string
  verificationToken: string
  verified: boolean
  verifiedAt: string | null
  createdAt: string
}

function DnsRecord({
  rows,
  copyValue,
  onCopy,
}: {
  rows: { label: string; value: string; mono?: boolean }[]
  copyValue: string
  onCopy: (v: string) => void
}): React.ReactElement {
  return (
    <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={0.75}>
          {rows.map(({ label, value, mono }) => (
            <Stack
              key={label}
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ width: 110, flexShrink: 0 }}
              >
                {label}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: mono ? 'monospace' : 'inherit',
                  flex: 1,
                  wordBreak: 'break-all',
                }}
              >
                {value}
              </Typography>
              {label === 'Value' && (
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon sx={{ fontSize: 13 }} />}
                  onClick={() => onCopy(copyValue)}
                  sx={{ flexShrink: 0 }}
                >
                  Copy
                </Button>
              )}
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function CustomDomainManager(): React.ReactElement {
  const [record, setRecord] = React.useState<DomainRecord | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [domain, setDomain] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [snack, setSnack] = React.useState('')

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/custom-domain')
        if (res.ok) {
          const json = await res.json()
          setRecord(json.domain)
          if (json.domain) setDomain(json.domain.domain)
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const save = async () => {
    const cleaned = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
    if (!cleaned) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/custom-domain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleaned }),
      })
      const json = await res.json()
      if (res.ok) {
        setRecord(json.domain)
        setSnack('Domain saved. Add the TXT record and click Verify.')
      } else {
        setError(json.error ?? 'Failed to save domain.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const verify = async () => {
    setVerifying(true)
    setError(null)
    try {
      const res = await fetch('/api/custom-domain/verify', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setRecord(json.domain)
        if (json.verified) {
          setSnack('Domain verified!')
        } else {
          setError(
            'TXT record not found yet. DNS propagation can take up to 24 hours. Try again shortly.',
          )
        }
      } else {
        setError(json.error ?? 'Verification failed.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setVerifying(false)
    }
  }

  const remove = async () => {
    setRemoving(true)
    try {
      const res = await fetch('/api/custom-domain', { method: 'DELETE' })
      if (res.ok) {
        setRecord(null)
        setDomain('')
        setSnack('Custom domain removed.')
      } else {
        const json = await res.json()
        setSnack(json.error ?? 'Failed to remove.')
      }
    } catch {
      setSnack('Network error.')
    } finally {
      setRemoving(false)
    }
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setSnack('Copied.')
  }

  if (loading) return <CircularProgress size={24} />

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Custom Domain
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Use your own domain for transfer links (e.g.,{' '}
          <Box
            component="code"
            sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}
          >
            files.yourcompany.com
          </Box>
          ).
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Domain input */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          label="Your domain"
          placeholder="files.yourcompany.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
          slotProps={{ htmlInput: { maxLength: 253 } }}
        />
        <Button
          variant="contained"
          onClick={save}
          disabled={saving || !domain.trim()}
          sx={{ flexShrink: 0 }}
        >
          {saving ? (
            <CircularProgress size={18} />
          ) : record ? (
            'Update'
          ) : (
            'Add domain'
          )}
        </Button>
      </Stack>

      {/* Setup guide + verification */}
      {record && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              {/* Domain + status header */}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, fontFamily: 'monospace' }}
                >
                  {record.domain}
                </Typography>
                {record.verified ? (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Active"
                    size="small"
                    color="success"
                  />
                ) : (
                  <Chip
                    icon={<PendingIcon />}
                    label="Pending"
                    size="small"
                    color="warning"
                  />
                )}
              </Stack>

              {record.verified && (
                <Alert severity="success" sx={{ py: 0.5 }}>
                  Your domain is live. Transfer links are now served from{' '}
                  <Box
                    component="code"
                    sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}
                  >
                    {record.domain}
                  </Box>
                  . SSL is handled automatically.
                </Alert>
              )}

              <Divider />

              {/* Step-by-step guide — always visible so users know what to do */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Setup guide
              </Typography>

              <Stepper
                orientation="vertical"
                activeStep={record.verified ? 3 : -1}
                nonLinear
              >
                {/* Step 1 — A record */}
                <Step completed={record.verified} expanded={!record.verified}>
                  <StepLabel>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Point your domain to Zync
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1, display: 'block' }}
                    >
                      Log in to your domain registrar (Hostinger, GoDaddy,
                      Namecheap, Cloudflare…) and add this DNS record:
                    </Typography>
                    <DnsRecord
                      rows={[
                        { label: 'Type', value: 'A' },
                        {
                          label: 'Name / Host',
                          value: '@  (or your subdomain)',
                        },
                        { label: 'Value', value: '187.127.182.5' },
                        { label: 'TTL', value: '3600' },
                      ]}
                      copyValue="187.127.182.5"
                      onCopy={copy}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: 'block' }}
                    >
                      Using a subdomain like{' '}
                      <Box
                        component="code"
                        sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}
                      >
                        files.yourdomain.com
                      </Box>
                      ? Set Name to{' '}
                      <Box
                        component="code"
                        sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}
                      >
                        files
                      </Box>{' '}
                      instead of{' '}
                      <Box
                        component="code"
                        sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}
                      >
                        @
                      </Box>
                      .
                    </Typography>
                  </StepContent>
                </Step>

                {/* Step 2 — TXT record */}
                <Step completed={record.verified} expanded={!record.verified}>
                  <StepLabel>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Verify domain ownership
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1, display: 'block' }}
                    >
                      In the same DNS panel, add a second record:
                    </Typography>
                    <DnsRecord
                      rows={[
                        { label: 'Type', value: 'TXT' },
                        { label: 'Name / Host', value: '@  (same as above)' },
                        {
                          label: 'Value',
                          value: record.verificationToken,
                          mono: true,
                        },
                        { label: 'TTL', value: '3600' },
                      ]}
                      copyValue={record.verificationToken}
                      onCopy={copy}
                    />
                    <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                      DNS changes can take up to 24 hours to propagate. Usually
                      it&apos;s under 10 minutes.
                    </Alert>
                  </StepContent>
                </Step>

                {/* Step 3 — Verify */}
                <Step completed={record.verified} expanded={!record.verified}>
                  <StepLabel>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Click Verify
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1.5, display: 'block' }}
                    >
                      Once both DNS records are saved, click the button below.
                      Zync will check for the TXT record and activate your
                      domain. SSL is provisioned automatically — no extra steps.
                    </Typography>
                    {!record.verified && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={verify}
                        disabled={verifying}
                        startIcon={
                          verifying ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <CheckCircleIcon fontSize="small" />
                          )
                        }
                      >
                        {verifying ? 'Checking DNS…' : 'Verify domain'}
                      </Button>
                    )}
                  </StepContent>
                </Step>
              </Stepper>

              <Divider />

              <Button
                size="small"
                color="error"
                onClick={remove}
                disabled={removing}
                sx={{ alignSelf: 'flex-start' }}
              >
                {removing && (
                  <CircularProgress
                    size={14}
                    sx={{ mr: 0.5 }}
                    color="inherit"
                  />
                )}
                Remove domain
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Stack>
  )
}
