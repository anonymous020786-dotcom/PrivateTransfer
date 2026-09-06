'use client'

import React, { JSX, useState, useCallback, useEffect } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useDownloader } from '../hooks/useDownloader'
import PasswordField from './PasswordField'
import UnlockButton from './UnlockButton'
import Loading from './Loading'
import UploadFileList from './UploadFileList'
import DownloadButton from './DownloadButton'
import StopButton from './StopButton'
import ProgressBar from './ProgressBar'
import TitleText from './TitleText'
import ReturnHome from './ReturnHome'
import { pluralize } from '../utils/pluralize'
import { ErrorMessage } from './ErrorMessage'

interface FileInfo {
  fileName: string
  size: number
  type: string
}

const TROUBLESHOOTING: Array<{ icon: string; text: string }> = [
  {
    icon: '🚪',
    text: 'The uploader may have closed their browser, lost connectivity, or stopped the upload. Zync requires the uploader to stay online continuously because files are transferred directly between browsers.',
  },
  {
    icon: '🔒',
    text: 'Your network might have strict firewalls or NAT settings, such as having UPnP disabled.',
  },
  {
    icon: '🌐',
    text: 'Some corporate or school networks block peer-to-peer connections.',
  },
]

export function ConnectingToUploader({
  showTroubleshootingAfter = 3000,
}: {
  showTroubleshootingAfter?: number
}): JSX.Element {
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTroubleshooting(true)
    }, showTroubleshootingAfter)
    return () => clearTimeout(timer)
  }, [showTroubleshootingAfter])

  if (!showTroubleshooting) {
    return <Loading text="Connecting to uploader..." />
  }

  return (
    <>
      <Loading text="Connecting to uploader..." />
      <Paper variant="outlined" sx={{ p: 4, maxWidth: 448, width: '100%' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Having trouble connecting?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Zync uses direct peer-to-peer connections, but sometimes the
          connection can get stuck. Here are some possible reasons:
        </Typography>
        <List>
          {TROUBLESHOOTING.map((t) => (
            <ListItem
              key={t.icon}
              alignItems="flex-start"
              sx={{ bgcolor: 'action.hover', borderRadius: 2, mb: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{t.icon}</ListItemIcon>
              <ListItemText
                primary={t.text}
                slotProps={{ primary: { variant: 'body2' } }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
      <ReturnHome />
    </>
  )
}

export function DownloadComplete({
  filesInfo,
  bytesDownloaded,
  totalSize,
}: {
  filesInfo: FileInfo[]
  bytesDownloaded: number
  totalSize: number
}): JSX.Element {
  return (
    <>
      <TitleText>
        You downloaded {pluralize(filesInfo.length, 'file', 'files')}.
      </TitleText>
      <Stack spacing={2.5} sx={{ width: '100%' }}>
        <UploadFileList files={filesInfo} />
        <Box sx={{ width: '100%' }}>
          <ProgressBar value={bytesDownloaded} max={totalSize} />
        </Box>
        <ReturnHome />
      </Stack>
    </>
  )
}

function formatBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`
  if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`
  return `${b} B`
}

function formatEta(sec: number): string {
  if (sec < 60) return `${sec}s left`
  if (sec < 3600) return `${Math.ceil(sec / 60)}m left`
  return `${Math.ceil(sec / 3600)}h left`
}

export function DownloadInProgress({
  filesInfo,
  bytesDownloaded,
  totalSize,
  speedBps,
  etaSec,
  onStop,
}: {
  filesInfo: FileInfo[]
  bytesDownloaded: number
  totalSize: number
  speedBps: number
  etaSec: number | null
  onStop: () => void
}): JSX.Element {
  const pct =
    totalSize > 0 ? Math.round((bytesDownloaded / totalSize) * 100) : 0
  return (
    <>
      <TitleText>
        You are downloading {pluralize(filesInfo.length, 'file', 'files')}.
      </TitleText>
      <Stack spacing={2.5} sx={{ width: '100%' }}>
        <UploadFileList files={filesInfo} />
        <Box sx={{ width: '100%' }}>
          <ProgressBar value={bytesDownloaded} max={totalSize} />
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', mt: 0.5 }}
          >
            <Typography variant="caption" color="text.secondary">
              {formatBytes(bytesDownloaded)} / {formatBytes(totalSize)} ({pct}%)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {speedBps > 0 && `${formatBytes(speedBps)}/s`}
              {etaSec !== null && ` · ${formatEta(etaSec)}`}
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <StopButton onClick={onStop} isDownloading />
        </Box>
      </Stack>
    </>
  )
}

export function ReadyToDownload({
  filesInfo,
  note,
  onStart,
}: {
  filesInfo: FileInfo[]
  note?: string
  onStart: () => void
}): JSX.Element {
  return (
    <>
      <TitleText>
        You are about to start downloading{' '}
        {pluralize(filesInfo.length, 'file', 'files')}.
      </TitleText>
      <Stack spacing={2.5} sx={{ alignItems: 'center', width: '100%' }}>
        {note && (
          <Paper
            variant="outlined"
            sx={{
              width: '100%',
              p: 2,
              borderLeft: '3px solid',
              borderLeftColor: 'primary.main',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                mb: 0.5,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Message from sender
            </Typography>
            <Typography variant="body2">{note}</Typography>
          </Paper>
        )}
        <UploadFileList files={filesInfo} />
        <DownloadButton onClick={onStart} />
      </Stack>
    </>
  )
}

export function PasswordEntry({
  onSubmit,
  errorMessage,
}: {
  onSubmit: (password: string) => void
  errorMessage: string | null
}): JSX.Element {
  const [password, setPassword] = useState('')
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      onSubmit(password)
    },
    [onSubmit, password],
  )

  return (
    <>
      <TitleText>This download requires a password.</TitleText>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <Stack spacing={2.5} sx={{ width: '100%' }}>
          <PasswordField
            value={password}
            onChange={setPassword}
            isRequired
            isInvalid={Boolean(errorMessage)}
          />
          <UnlockButton />
        </Stack>
      </Box>
      {errorMessage && <ErrorMessage message={errorMessage} />}
    </>
  )
}

export default function Downloader({
  uploaderPeerID,
  slug,
  note,
}: {
  uploaderPeerID: string
  slug?: string
  note?: string
}): JSX.Element {
  const {
    filesInfo,
    isConnected,
    isPasswordRequired,
    isDownloading,
    isDone,
    errorMessage,
    submitPassword,
    startDownload,
    stopDownload,
    totalSize,
    bytesDownloaded,
    speedBps,
    etaSec,
  } = useDownloader(uploaderPeerID, slug)

  if (isDone && filesInfo) {
    return (
      <DownloadComplete
        filesInfo={filesInfo}
        bytesDownloaded={bytesDownloaded}
        totalSize={totalSize}
      />
    )
  }

  if (isPasswordRequired) {
    return (
      <PasswordEntry errorMessage={errorMessage} onSubmit={submitPassword} />
    )
  }

  if (errorMessage) {
    return (
      <>
        <ErrorMessage message={errorMessage} />
        <ReturnHome />
      </>
    )
  }

  if (isDownloading && filesInfo) {
    return (
      <DownloadInProgress
        filesInfo={filesInfo}
        bytesDownloaded={bytesDownloaded}
        totalSize={totalSize}
        speedBps={speedBps}
        etaSec={etaSec}
        onStop={stopDownload}
      />
    )
  }

  if (filesInfo) {
    return (
      <ReadyToDownload
        filesInfo={filesInfo}
        note={note}
        onStart={startDownload}
      />
    )
  }

  if (!isConnected) {
    return <ConnectingToUploader />
  }

  return <Loading text="Uh oh... Something went wrong." />
}
