'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import SaveIcon from '@mui/icons-material/Save'
import { getSupabaseBrowserClient } from '../../supabase/client'
import {
  PROFILE_FIELDS,
  PROFILE_GROUPS,
  type ProfileField,
} from './profileFields'

export default function ProfileForm({
  initial,
}: {
  initial: Record<string, string>
}): React.ReactElement {
  const [values, setValues] = React.useState<Record<string, string>>(initial)
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }))

  const save = async () => {
    setBusy(true)
    setMsg(null)
    const supabase = getSupabaseBrowserClient()
    const { error } = (await supabase?.auth.updateUser({ data: values })) || {}
    setBusy(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: 'Profile saved.' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderField = (f: ProfileField) => {
    const common = {
      label: f.label,
      value: values[f.key] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        set(f.key, e.target.value),
      fullWidth: true,
      size: 'small' as const,
    }
    if (f.type === 'select') {
      return (
        <TextField select {...common}>
          {(f.options ?? []).map((o) => (
            <MenuItem key={o} value={o}>
              {o || '—'}
            </MenuItem>
          ))}
        </TextField>
      )
    }
    return (
      <TextField
        {...common}
        type={f.type === 'textarea' ? 'text' : f.type}
        multiline={f.type === 'textarea'}
        minRows={f.type === 'textarea' ? 3 : undefined}
      />
    )
  }

  return (
    <Box>
      {msg && (
        <Alert severity={msg.type} sx={{ mb: 3 }}>
          {msg.text}
        </Alert>
      )}

      {PROFILE_GROUPS.map((group) => (
        <Card variant="outlined" key={group} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              {group}
            </Typography>
            <Grid container spacing={2}>
              {PROFILE_FIELDS.filter((f) => f.group === group).map((f) => (
                <Grid size={{ xs: 12, sm: f.half ? 6 : 12 }} key={f.key}>
                  {renderField(f)}
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      ))}

      <Stack
        direction="row"
        sx={{ justifyContent: 'flex-end', position: 'sticky', bottom: 16 }}
      >
        <Button
          variant="contained"
          size="large"
          onClick={save}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={18} /> : <SaveIcon />}
        >
          Save profile
        </Button>
      </Stack>
    </Box>
  )
}
