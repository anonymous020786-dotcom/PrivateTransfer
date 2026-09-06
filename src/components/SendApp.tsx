'use client'

import React, { JSX, useCallback, useState, useMemo, useEffect } from 'react'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import HistoryIcon from '@mui/icons-material/History'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import WebRTCPeerProvider from './WebRTCProvider'
import DropZone from './DropZone'
import UploadFileList from './UploadFileList'
import Uploader from './Uploader'
import PasswordField from './PasswordField'
import StartButton from './StartButton'
import { UploadedFile } from '../types'
import TransferSpinner from './TransferSpinner'
import CancelButton from './CancelButton'
import { getFileName } from '../fs'
import TitleText from './TitleText'
import SubtitleText from './SubtitleText'
import { pluralize } from '../utils/pluralize'
import TermsAcceptance from './TermsAcceptance'
import AddFilesButton from './AddFilesButton'
import { brand } from '../brand'

const TTL_OPTIONS = [
  { label: '1 hour', value: 3600 },
  { label: '6 hours', value: 21600 },
  { label: '24 hours', value: 86400 },
  { label: '3 days', value: 259200 },
  { label: '7 days', value: 604800 },
]

type RecentEntry = { url: string; files: string[]; date: string }

function RecentTransfers(): JSX.Element | null {
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem('zync_recent_transfers') ?? '[]',
      ) as RecentEntry[]
      setRecent(data)
      // eslint-disable-next-line no-empty
    } catch {}
  }, [])

  if (!recent.length) return null

  const copy = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(url)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 448 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <HistoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Recent transfers
        </Typography>
      </Stack>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {recent.map((r, i) => (
          <React.Fragment key={r.url}>
            {i > 0 && <Divider />}
            <Stack
              direction="row"
              spacing={1}
              sx={{ p: 1.5, alignItems: 'center' }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ display: 'block', fontWeight: 500 }}
                >
                  {r.files.join(', ')}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ display: 'block', fontSize: 11 }}
                >
                  {new Date(r.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>
              <Tooltip title={copied === r.url ? 'Copied!' : 'Copy link'}>
                <IconButton size="small" onClick={() => copy(r.url)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </React.Fragment>
        ))}
      </Paper>
    </Box>
  )
}

function PageWrapper({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <Stack
      spacing={2.5}
      sx={{
        alignItems: 'center',
        py: 5,
        px: 2,
        maxWidth: 672,
        mx: 'auto',
        width: '100%',
      }}
    >
      <TransferSpinner direction="up" />
      {children}
    </Stack>
  )
}

function InitialState({
  onDrop,
}: {
  onDrop: (files: UploadedFile[]) => void
}): JSX.Element {
  return (
    <PageWrapper>
      <Stack sx={{ alignItems: 'center', maxWidth: 448 }}>
        <TitleText>
          Drop a file to beam it straight to another browser.
        </TitleText>
      </Stack>
      <DropZone onDrop={onDrop} />
      <TermsAcceptance />
      <RecentTransfers />
    </PageWrapper>
  )
}

function useUploaderFileListData(uploadedFiles: UploadedFile[]) {
  return useMemo(() => {
    return uploadedFiles.map((item) => ({
      fileName: getFileName(item),
      type: item.type,
    }))
  }, [uploadedFiles])
}

function ConfirmUploadState({
  uploadedFiles,
  password,
  note,
  ttl,
  onChangePassword,
  onChangeNote,
  onChangeTtl,
  onCancel,
  onStart,
  onRemoveFile,
  onAddFiles,
}: {
  uploadedFiles: UploadedFile[]
  password: string
  note: string
  ttl: number
  onChangePassword: (pw: string) => void
  onChangeNote: (n: string) => void
  onChangeTtl: (t: number) => void
  onCancel: () => void
  onStart: () => void
  onRemoveFile: (index: number) => void
  onAddFiles: (files: UploadedFile[]) => void
}): JSX.Element {
  const fileListData = useUploaderFileListData(uploadedFiles)
  return (
    <PageWrapper>
      <TitleText>
        You are about to start uploading{' '}
        {pluralize(uploadedFiles.length, 'file', 'files')}.{' '}
        <AddFilesButton onAdd={onAddFiles} />
      </TitleText>
      <UploadFileList files={fileListData} onRemove={onRemoveFile} />
      <PasswordField value={password} onChange={onChangePassword} />
      <TextField
        label="Message to recipient (optional)"
        placeholder="Add a note that the downloader will see before downloading…"
        multiline
        minRows={2}
        fullWidth
        value={note}
        onChange={(e) => onChangeNote(e.target.value)}
        slotProps={{ htmlInput: { maxLength: 500 } }}
        helperText={`${note.length}/500`}
        sx={{ maxWidth: 448 }}
      />
      <FormControl sx={{ maxWidth: 448, width: '100%' }}>
        <InputLabel>Link expires after</InputLabel>
        <Select
          value={ttl}
          label="Link expires after"
          onChange={(e) => onChangeTtl(Number(e.target.value))}
          startAdornment={
            <AccessTimeIcon
              sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }}
            />
          }
        >
          {TTL_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Stack direction="row" spacing={2}>
        <CancelButton onClick={onCancel} />
        <StartButton onClick={onStart} />
      </Stack>
    </PageWrapper>
  )
}

function UploadingState({
  uploadedFiles,
  password,
  note,
  ttl,
  onStop,
}: {
  uploadedFiles: UploadedFile[]
  password: string
  note: string
  ttl: number
  onStop: () => void
}): JSX.Element {
  const fileListData = useUploaderFileListData(uploadedFiles)
  return (
    <PageWrapper>
      <TitleText>
        You are uploading {pluralize(uploadedFiles.length, 'file', 'files')}.
      </TitleText>
      <SubtitleText>
        Leave this tab open. {brand.name} never stores your files.
      </SubtitleText>
      <UploadFileList files={fileListData} />
      <WebRTCPeerProvider>
        <Uploader
          files={uploadedFiles}
          password={password}
          note={note}
          ttl={ttl}
          onStop={onStop}
        />
      </WebRTCPeerProvider>
    </PageWrapper>
  )
}

export default function SendApp(): JSX.Element {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [password, setPassword] = useState('')
  const [note, setNote] = useState('')
  const [ttl, setTtl] = useState(86400)
  const [uploading, setUploading] = useState(false)

  const handleDrop = useCallback((files: UploadedFile[]): void => {
    setUploadedFiles(files)
  }, [])
  const handleChangePassword = useCallback((pw: string) => setPassword(pw), [])
  const handleStart = useCallback(() => setUploading(true), [])
  const handleStop = useCallback(() => setUploading(false), [])
  const handleCancel = useCallback(() => {
    setUploadedFiles([])
    setUploading(false)
  }, [])
  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles((fs) => fs.filter((_, i) => i !== index))
  }, [])
  const handleAddFiles = useCallback((files: UploadedFile[]) => {
    setUploadedFiles((fs) => [...fs, ...files])
  }, [])

  if (!uploadedFiles.length) {
    return <InitialState onDrop={handleDrop} />
  }

  if (!uploading) {
    return (
      <ConfirmUploadState
        uploadedFiles={uploadedFiles}
        password={password}
        note={note}
        ttl={ttl}
        onChangePassword={handleChangePassword}
        onChangeNote={setNote}
        onChangeTtl={setTtl}
        onCancel={handleCancel}
        onStart={handleStart}
        onRemoveFile={handleRemoveFile}
        onAddFiles={handleAddFiles}
      />
    )
  }

  return (
    <UploadingState
      uploadedFiles={uploadedFiles}
      password={password}
      note={note}
      ttl={ttl}
      onStop={handleStop}
    />
  )
}
