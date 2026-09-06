'use client'

import React, { JSX, useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { UploadedFile, UploaderConnectionStatus } from '../types'
import { useWebRTCPeer } from './WebRTCProvider'
import QRCode from 'react-qr-code'
import Loading from './Loading'
import StopButton from './StopButton'
import { useUploaderChannel } from '../hooks/useUploaderChannel'
import { useUploaderConnections } from '../hooks/useUploaderConnections'
import { CopyableInput } from './CopyableInput'
import ShareButtons from './ShareButtons'
import { ConnectionListItem } from './ConnectionListItem'
import { ErrorMessage } from './ErrorMessage'
import { setRotating } from '../hooks/useRotatingSpinner'

const QR_CODE_SIZE = 128

function useExpiryCountdown(expiresAt?: number): string {
  const [label, setLabel] = useState('')
  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const rem = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      if (rem === 0) {
        setLabel('Expired')
        return
      }
      const h = Math.floor(rem / 3600)
      const m = Math.floor((rem % 3600) / 60)
      const s = rem % 60
      setLabel(
        h > 0 ? `${h}h ${m}m left` : m > 0 ? `${m}m ${s}s left` : `${s}s left`,
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return label
}

export default function Uploader({
  files,
  password,
  note,
  ttl,
  onStop,
}: {
  files: UploadedFile[]
  password: string
  note?: string
  ttl?: number
  onStop: () => void
}): JSX.Element {
  const { peer, stop } = useWebRTCPeer()
  const {
    isLoading,
    error,
    longSlug,
    shortSlug,
    longURL,
    shortURL,
    expiresAt,
  } = useUploaderChannel(peer.id, 60_000, { note, ttl })
  const connections = useUploaderConnections(peer, files, password)
  const [notifEnabled, setNotifEnabled] = useState(false)
  const expiryLabel = useExpiryCountdown(expiresAt)

  const handleStop = useCallback(() => {
    stop()
    onStop()
  }, [stop, onStop])

  const activeDownloaders = connections.filter(
    (conn) => conn.status === UploaderConnectionStatus.Uploading,
  ).length

  const doneDownloaders = connections.filter(
    (conn) => conn.status === UploaderConnectionStatus.Done,
  ).length

  useEffect(() => {
    setRotating(activeDownloaders > 0)
  }, [activeDownloaders])

  // Browser notifications when download starts or completes.
  const prevActive = React.useRef(0)
  const prevDone = React.useRef(0)
  useEffect(() => {
    if (!notifEnabled) return
    if (activeDownloaders > prevActive.current) {
      new Notification('Zync — Download started', {
        body: 'Someone started downloading your file.',
        icon: '/icon.svg',
      })
    }
    if (doneDownloaders > prevDone.current) {
      new Notification('Zync — Download complete', {
        body: 'A recipient finished downloading.',
        icon: '/icon.svg',
      })
    }
    prevActive.current = activeDownloaders
    prevDone.current = doneDownloaders
  }, [activeDownloaders, doneDownloaders, notifEnabled])

  const enableNotifications = useCallback(async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm === 'granted') setNotifEnabled(true)
  }, [])

  // Save to recent transfers in localStorage.
  const savedRecent = React.useRef(false)
  useEffect(() => {
    if (savedRecent.current || !shortURL || !longSlug) return
    savedRecent.current = true
    try {
      const key = 'zync_recent_transfers'
      const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{
        url: string
        files: string[]
        date: string
      }>
      const entry = {
        url: shortURL,
        files: files.map((f) => f.name),
        date: new Date().toISOString(),
      }
      localStorage.setItem(
        key,
        JSON.stringify([entry, ...existing].slice(0, 5)),
      )
      // eslint-disable-next-line no-empty
    } catch {}
  }, [shortURL, longSlug, files])

  // Record this transfer to the signed-in user's history (best-effort, once).
  const recorded = React.useRef(false)
  useEffect(() => {
    if (recorded.current || !longSlug) return
    recorded.current = true
    const names = files.map((f) => f.name)
    const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0)
    fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: longSlug,
        title: names[0] || 'Transfer',
        files: names,
        totalBytes,
      }),
    }).catch(() => {})
  }, [longSlug, files])

  if (isLoading || !longSlug || !shortSlug) {
    return <Loading text="Creating channel..." />
  }

  if (error) {
    return <ErrorMessage message={error.message} />
  }

  const emailUrl = shortURL ?? longURL ?? ''
  const emailSubject = encodeURIComponent('Your file is ready on Zync')
  const emailBody = encodeURIComponent(
    `Here's your secure download link:\n\n${emailUrl}\n\nThis link is valid for a limited time and transfers directly between browsers — no files stored on any server.`,
  )

  return (
    <Box sx={{ width: '100%' }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', width: '100%' }}
      >
        <Box sx={{ flex: 'none', bgcolor: '#fff', p: 1, borderRadius: 1 }}>
          <QRCode value={shortURL ?? ''} size={QR_CODE_SIZE} />
        </Box>
        <Stack spacing={1} sx={{ justifyContent: 'center', flex: 'auto' }}>
          <CopyableInput label="Long URL" value={longURL ?? ''} />
          <CopyableInput label="Short URL" value={shortURL ?? ''} />
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
          >
            <ShareButtons url={emailUrl} />
            <Tooltip title="Email this link">
              <IconButton
                size="small"
                component="a"
                href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
              >
                <EmailOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip
              title={
                notifEnabled
                  ? 'Notifications on'
                  : 'Enable desktop notifications'
              }
            >
              <IconButton
                size="small"
                onClick={enableNotifications}
                color={notifEnabled ? 'primary' : 'default'}
              >
                {notifEnabled ? (
                  <NotificationsActiveIcon fontSize="small" />
                ) : (
                  <NotificationsNoneIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>

      {expiryLabel && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Chip
            icon={<AccessTimeIcon />}
            label={expiryLabel}
            size="small"
            variant="outlined"
            color={expiryLabel === 'Expired' ? 'error' : 'default'}
          />
        </Stack>
      )}

      <Divider sx={{ mt: 3, mb: 2 }} />

      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, color: 'text.secondary' }}
        >
          {activeDownloaders} Downloading · {doneDownloaders} Done ·{' '}
          {connections.length} Total
        </Typography>
        <StopButton onClick={handleStop} />
      </Stack>

      {connections.map((conn, i) => (
        <ConnectionListItem key={i} conn={conn} />
      ))}
    </Box>
  )
}
