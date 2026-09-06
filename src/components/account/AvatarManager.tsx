'use client'

import * as React from 'react'
import Stack from '@mui/material/Stack'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import { getSupabaseBrowserClient } from '../../supabase/client'

export default function AvatarManager({
  initialUrl,
  name,
}: {
  initialUrl: string | null
  name: string
}): React.ReactElement {
  const [url, setUrl] = React.useState(initialUrl)
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setMsg(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed.')
      setUrl(data.url)
      setMsg({ type: 'success', text: 'Photo updated.' })
    } catch (err) {
      setMsg({ type: 'error', text: (err as Error).message })
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const remove = async () => {
    setBusy(true)
    setMsg(null)
    const supabase = getSupabaseBrowserClient()
    const { error } =
      (await supabase?.auth.updateUser({ data: { avatar_url: null } })) || {}
    setBusy(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else {
      setUrl(null)
      setMsg({ type: 'success', text: 'Photo removed.' })
    }
  }

  return (
    <Stack spacing={2} sx={{ alignItems: 'center' }}>
      <Avatar
        src={url || undefined}
        sx={{ width: 110, height: 110, fontSize: 40 }}
      >
        {name?.[0]?.toUpperCase()}
      </Avatar>
      {msg && (
        <Alert severity={msg.type} sx={{ width: '100%' }}>
          {msg.text}
        </Alert>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={upload}
      />
      <Stack direction="row" spacing={1.5}>
        <Button
          variant="contained"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          startIcon={
            busy ? <CircularProgress size={18} /> : <PhotoCameraIcon />
          }
        >
          {url ? 'Change photo' : 'Upload photo'}
        </Button>
        {url && (
          <Button
            variant="outlined"
            color="error"
            onClick={remove}
            disabled={busy}
            startIcon={<DeleteOutlineIcon />}
          >
            Remove
          </Button>
        )}
      </Stack>
    </Stack>
  )
}
