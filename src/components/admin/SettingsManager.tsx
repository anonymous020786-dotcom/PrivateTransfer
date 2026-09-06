'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'

type Settings = {
  smtp_host?: string
  smtp_port?: string
  smtp_user?: string
  smtp_pass?: string
  smtp_from?: string
  storage_provider?: string
  r2_account_id?: string
  r2_access_key_id?: string
  r2_secret_access_key?: string
  r2_bucket_name?: string
  s3_access_key_id?: string
  s3_secret_access_key?: string
  s3_region?: string
  s3_bucket?: string
  s3_storage_class?: string
  feature_email_notifications?: string
  feature_transfer_tracking?: string
  feature_recaptcha?: string
  feature_guest_uploads?: string
  feature_registration?: string
  feature_cloud_transfers?: string
  feature_white_label_emails?: string
  feature_virus_scan?: string
  virustotal_api_key?: string
}

function SecretField({
  label,
  value,
  onChange,
  helperText,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  helperText?: string
}) {
  const [show, setShow] = React.useState(false)
  return (
    <TextField
      label={label}
      type={show ? 'text' : 'password'}
      fullWidth
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      helperText={helperText}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setShow((s) => !s)}>
                {show ? (
                  <VisibilityOffOutlinedIcon fontSize="small" />
                ) : (
                  <VisibilityOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}

function FeatureToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: string | undefined
  onChange: (v: 'true' | 'false') => void
}) {
  const checked = value !== 'false'
  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={checked}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          />
        }
        label={
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
        }
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', ml: 6.5, mt: -0.5 }}
      >
        {description}
      </Typography>
    </Box>
  )
}

export default function SettingsManager(): React.ReactElement {
  const [tab, setTab] = React.useState(0)
  const [settings, setSettings] = React.useState<Settings>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load settings.')
      setSettings(data.settings ?? {})
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const patch = (updates: Partial<Settings>) =>
    setSettings((s) => ({ ...s, ...updates }))

  const save = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed.')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error.')
    } finally {
      setSaving(false)
    }
  }

  const s = settings

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Settings
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Reload from database">
            <span>
              <IconButton onClick={load} disabled={loading} size="small">
                <RefreshOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            onClick={save}
            disabled={saving || loading}
            startIcon={
              saving ? <CircularProgress size={16} /> : <SaveOutlinedIcon />
            }
            variant="contained"
            size="small"
          >
            Save all
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings saved. Changes take effect within 30 seconds.
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
            <Tab label="Email / SMTP" />
            <Tab label="Storage (R2)" />
            <Tab label="Features" />
          </Tabs>

          {tab === 0 && (
            <Stack spacing={2} sx={{ maxWidth: 520 }}>
              <Typography variant="body2" color="text.secondary">
                SMTP credentials for transfer notifications. DB values override
                env vars — no redeploy needed.
              </Typography>
              <Divider />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="SMTP Host"
                  fullWidth
                  size="small"
                  value={s.smtp_host ?? ''}
                  onChange={(e) => patch({ smtp_host: e.target.value })}
                  placeholder="smtp.hostinger.com"
                />
                <TextField
                  label="Port"
                  size="small"
                  sx={{ maxWidth: 100 }}
                  value={s.smtp_port ?? ''}
                  onChange={(e) => patch({ smtp_port: e.target.value })}
                  placeholder="465"
                />
              </Stack>
              <TextField
                label="SMTP User"
                fullWidth
                size="small"
                value={s.smtp_user ?? ''}
                onChange={(e) => patch({ smtp_user: e.target.value })}
                placeholder="admin@example.com"
              />
              <SecretField
                label="SMTP Password"
                value={s.smtp_pass ?? ''}
                onChange={(v) => patch({ smtp_pass: v })}
                helperText="Leave blank (or keep '••••') to keep the current password."
              />
              <TextField
                label="From Address"
                fullWidth
                size="small"
                value={s.smtp_from ?? ''}
                onChange={(e) => patch({ smtp_from: e.target.value })}
                placeholder="Zync <noreply@example.com>"
              />
              <Divider />
              <SecretField
                label="VirusTotal API Key"
                value={s.virustotal_api_key ?? ''}
                onChange={(v) => patch({ virustotal_api_key: v })}
                helperText="Required for virus scanning. Get a free key at virustotal.com."
              />
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={2} sx={{ maxWidth: 560 }}>
              <Typography variant="body2" color="text.secondary">
                Choose your storage provider. Changes apply within 30 seconds —
                no redeploy needed.
              </Typography>
              <Divider />

              {/* Provider selector */}
              <Stack direction="row" spacing={1}>
                {(['r2', 's3'] as const).map((p) => (
                  <Button
                    key={p}
                    variant={
                      s.storage_provider === p ? 'contained' : 'outlined'
                    }
                    size="small"
                    onClick={() => patch({ storage_provider: p })}
                  >
                    {p === 'r2' ? 'Cloudflare R2' : 'AWS S3'}
                  </Button>
                ))}
              </Stack>

              {/* R2 fields */}
              {(s.storage_provider === 'r2' || !s.storage_provider) && (
                <Stack spacing={2}>
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    R2 has <strong>zero egress fees</strong> and flat storage
                    pricing (~$0.015/GB/mo). Best choice for most deployments.
                  </Alert>
                  <TextField
                    label="R2 Account ID"
                    fullWidth
                    size="small"
                    value={s.r2_account_id ?? ''}
                    onChange={(e) => patch({ r2_account_id: e.target.value })}
                  />
                  <TextField
                    label="R2 Access Key ID"
                    fullWidth
                    size="small"
                    value={s.r2_access_key_id ?? ''}
                    onChange={(e) =>
                      patch({ r2_access_key_id: e.target.value })
                    }
                  />
                  <SecretField
                    label="R2 Secret Access Key"
                    value={s.r2_secret_access_key ?? ''}
                    onChange={(v) => patch({ r2_secret_access_key: v })}
                  />
                  <TextField
                    label="Bucket Name"
                    fullWidth
                    size="small"
                    placeholder="zync-transfers"
                    value={s.r2_bucket_name ?? ''}
                    onChange={(e) => patch({ r2_bucket_name: e.target.value })}
                  />
                </Stack>
              )}

              {/* S3 fields */}
              {s.storage_provider === 's3' && (
                <Stack spacing={2}>
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    S3 charges egress fees. Use{' '}
                    <strong>Intelligent-Tiering</strong> to auto-move objects to
                    cheaper tiers after 30/90 days. <strong>Standard-IA</strong>{' '}
                    saves ~45% for files accessed rarely.{' '}
                    <strong>Glacier IR</strong> saves ~68% with instant
                    retrieval.
                  </Alert>
                  <TextField
                    label="AWS Access Key ID"
                    fullWidth
                    size="small"
                    value={s.s3_access_key_id ?? ''}
                    onChange={(e) =>
                      patch({ s3_access_key_id: e.target.value })
                    }
                  />
                  <SecretField
                    label="AWS Secret Access Key"
                    value={s.s3_secret_access_key ?? ''}
                    onChange={(v) => patch({ s3_secret_access_key: v })}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Region"
                      fullWidth
                      size="small"
                      placeholder="us-east-1"
                      value={s.s3_region ?? ''}
                      onChange={(e) => patch({ s3_region: e.target.value })}
                    />
                    <TextField
                      label="Bucket Name"
                      fullWidth
                      size="small"
                      placeholder="zync-transfers"
                      value={s.s3_bucket ?? ''}
                      onChange={(e) => patch({ s3_bucket: e.target.value })}
                    />
                  </Stack>

                  {/* Storage class picker with cost context */}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, mt: 1 }}
                  >
                    Storage Class (cost savings)
                  </Typography>
                  <Stack spacing={1}>
                    {(
                      [
                        {
                          value: 'STANDARD',
                          label: 'Standard',
                          desc: 'Full price. Use for frequently accessed files only.',
                        },
                        {
                          value: 'INTELLIGENT_TIERING',
                          label: 'Intelligent-Tiering (recommended)',
                          desc: 'Auto-tiers to Infrequent Access after 30 days, Archive after 90 days. ~$0.023→$0.0125/GB.',
                        },
                        {
                          value: 'STANDARD_IA',
                          label: 'Standard-IA',
                          desc: '~45% cheaper than Standard. Best for files accessed < once/month. Min 30-day charge.',
                        },
                        {
                          value: 'GLACIER_IR',
                          label: 'Glacier Instant Retrieval',
                          desc: '~68% cheaper. 1–5ms retrieval. Best for archive transfers rarely downloaded.',
                        },
                      ] as const
                    ).map((opt) => (
                      <Box
                        key={opt.value}
                        onClick={() => patch({ s3_storage_class: opt.value })}
                        sx={{
                          border: 1,
                          borderColor:
                            s.s3_storage_class === opt.value
                              ? 'primary.main'
                              : 'divider',
                          borderRadius: 1,
                          px: 1.5,
                          py: 1,
                          cursor: 'pointer',
                          bgcolor:
                            s.s3_storage_class === opt.value
                              ? 'primary.50'
                              : 'transparent',
                          '&:hover': { borderColor: 'primary.main' },
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {opt.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {opt.desc}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              )}
            </Stack>
          )}

          {tab === 2 && (
            <Stack spacing={2.5} sx={{ maxWidth: 480 }}>
              <Typography variant="body2" color="text.secondary">
                Enable or disable features without redeploying. Takes effect
                within 30 seconds.
              </Typography>
              <Divider />
              <FeatureToggle
                label="Cloud transfers (upload)"
                description="Allow users to upload files to cloud storage (R2/S3). When disabled, the transfer page shows a maintenance notice and uploads are blocked."
                value={s.feature_cloud_transfers}
                onChange={(v) => patch({ feature_cloud_transfers: v })}
              />
              <FeatureToggle
                label="White-label emails"
                description="Hide the Zync branding footer in all outgoing transfer emails. Senders see only the copyright line."
                value={s.feature_white_label_emails}
                onChange={(v) => patch({ feature_white_label_emails: v })}
              />
              <FeatureToggle
                label="Email notifications"
                description="Send transfer-sent, downloaded, and sign-in alert emails."
                value={s.feature_email_notifications}
                onChange={(v) => patch({ feature_email_notifications: v })}
              />
              <FeatureToggle
                label="Transfer tracking"
                description="Record download events (country, timestamp, hashed IP) per transfer."
                value={s.feature_transfer_tracking}
                onChange={(v) => patch({ feature_transfer_tracking: v })}
              />
              <FeatureToggle
                label="reCAPTCHA"
                description="Require reCAPTCHA v3 on upload. Disable for testing."
                value={s.feature_recaptcha}
                onChange={(v) => patch({ feature_recaptcha: v })}
              />
              <FeatureToggle
                label="Guest uploads"
                description="Allow unauthenticated users to create transfers."
                value={s.feature_guest_uploads}
                onChange={(v) => patch({ feature_guest_uploads: v })}
              />
              <FeatureToggle
                label="New registrations"
                description="Allow new users to sign up. Disable to make the site invite-only."
                value={s.feature_registration}
                onChange={(v) => patch({ feature_registration: v })}
              />
              <FeatureToggle
                label="Virus scanning"
                description="Scan uploaded files with VirusTotal before allowing downloads. Requires a VirusTotal API key."
                value={s.feature_virus_scan}
                onChange={(v) => patch({ feature_virus_scan: v })}
              />
            </Stack>
          )}
        </Box>
      )}
    </Box>
  )
}
