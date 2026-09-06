'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import IconButton from '@mui/material/IconButton'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import InboxIcon from '@mui/icons-material/Inbox'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { ZyncIcon } from '../../../components/Logo'
import { brand } from '../../../brand'

function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${n} B`
}

type CollectInfo = {
  slug: string
  title: string
  description: string
  expiresAt: string
  maxFiles: number
  fileCount: number
  active: boolean
}

export default function CollectUploaderPage(): React.ReactElement {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''

  const [info, setInfo] = React.useState<CollectInfo | null>(null)
  const [infoError, setInfoError] = React.useState<string | null>(null)
  const [files, setFiles] = React.useState<File[]>([])
  const [uploaderName, setUploaderName] = React.useState('')
  const [note, setNote] = React.useState('')
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [stage, setStage] = React.useState<
    'idle' | 'uploading' | 'done' | 'error'
  >('idle')
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!slug) return
    fetch(`/api/collect/${slug}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setInfoError(j.error)
        else setInfo(j)
      })
      .catch(() => setInfoError('Failed to load request.'))
  }, [slug])

  const addFiles = (list: FileList | null) => {
    if (!list) return
    setFiles((prev) => {
      const merged = [...prev]
      for (const f of Array.from(list)) {
        if (
          merged.length < 20 &&
          !merged.find((e) => e.name === f.name && e.size === f.size)
        )
          merged.push(f)
      }
      return merged
    })
  }

  const upload = async () => {
    if (files.length === 0 || !info) return
    setStage('uploading')
    setError(null)
    setProgress(0)
    try {
      const res = await fetch(`/api/collect/${slug}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
          })),
          note: note || undefined,
          uploaderName: uploaderName.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to start upload.')
        setStage('error')
        return
      }

      const { uploadUrls, fileKeys } = json as {
        uploadUrls: string[]
        fileKeys: string[]
      }
      let done = 0
      await Promise.all(
        files.map(
          (file, i) =>
            new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest()
              xhr.open('PUT', uploadUrls[i])
              xhr.setRequestHeader(
                'Content-Type',
                file.type || 'application/octet-stream',
              )
              xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                  const pct = ((done + e.loaded / e.total) / files.length) * 100
                  setProgress(Math.round(pct))
                }
              })
              xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  done++
                  setProgress(Math.round((done / files.length) * 100))
                  resolve()
                } else reject(new Error(`Upload failed for ${file.name}`))
              })
              xhr.addEventListener('error', () =>
                reject(new Error(`Network error uploading ${file.name}`)),
              )
              xhr.send(file)
            }),
        ),
      )

      // Notify owner
      await fetch(`/api/collect/${slug}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map((f, i) => ({
            key: fileKeys[i],
            name: f.name,
            size: f.size,
            type: f.type,
          })),
          note: note || undefined,
          uploaderName: uploaderName.trim() || undefined,
        }),
      })

      setStage('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setStage('error')
    }
  }

  const daysLeft = info
    ? Math.ceil((new Date(info.expiresAt).getTime() - Date.now()) / 86400000)
    : null

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Stack spacing={3}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <ZyncIcon size={40} />
              <Stack>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, lineHeight: 1 }}
                >
                  File request
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Powered by {brand.name}
                </Typography>
              </Stack>
            </Stack>

            {infoError && <Alert severity="error">{infoError}</Alert>}

            {!info && !infoError && (
              <CircularProgress sx={{ alignSelf: 'center' }} />
            )}

            {info && (
              <>
                {!info.active ? (
                  <Alert severity="info">
                    This file request is closed and no longer accepting uploads.
                  </Alert>
                ) : stage === 'done' ? (
                  <Stack spacing={2} sx={{ alignItems: 'center', py: 2 }}>
                    <CheckIcon sx={{ fontSize: 56, color: 'success.main' }} />
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, textAlign: 'center' }}
                    >
                      Files sent!
                    </Typography>
                    <Typography
                      color="text.secondary"
                      sx={{ textAlign: 'center' }}
                    >
                      Your {files.length} file{files.length !== 1 ? 's' : ''}{' '}
                      have been uploaded successfully. The requester will be
                      notified.
                    </Typography>
                  </Stack>
                ) : (
                  <>
                    <Stack spacing={0.75}>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>
                        {info.title}
                      </Typography>
                      {info.description && (
                        <Typography variant="body2" color="text.secondary">
                          {info.description}
                        </Typography>
                      )}
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ flexWrap: 'wrap' }}
                      >
                        {daysLeft !== null && (
                          <Chip
                            icon={<AccessTimeIcon />}
                            label={`${daysLeft}d left`}
                            size="small"
                            color={daysLeft <= 2 ? 'warning' : 'default'}
                          />
                        )}
                        <Chip
                          icon={<InboxIcon />}
                          label={`${info.fileCount}/${info.maxFiles} files received`}
                          size="small"
                        />
                      </Stack>
                    </Stack>

                    {error && <Alert severity="error">{error}</Alert>}

                    {stage === 'uploading' ? (
                      <Stack spacing={1}>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ textAlign: 'center' }}
                        >
                          Uploading… {progress}%
                        </Typography>
                      </Stack>
                    ) : (
                      <>
                        {/* Drop zone */}
                        <Box
                          onDragOver={(e) => {
                            e.preventDefault()
                            setDragging(true)
                          }}
                          onDragLeave={() => setDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault()
                            setDragging(false)
                            addFiles(e.dataTransfer.files)
                          }}
                          onClick={() => inputRef.current?.click()}
                          sx={{
                            border: '2px dashed',
                            borderColor: dragging ? 'primary.main' : 'divider',
                            borderRadius: 2,
                            p: 4,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: dragging
                              ? 'action.hover'
                              : 'background.paper',
                            transition: 'border-color .2s, background .2s',
                            '&:hover': {
                              borderColor: 'primary.main',
                              bgcolor: 'action.hover',
                            },
                          }}
                        >
                          <UploadFileIcon
                            sx={{
                              fontSize: 48,
                              color: 'text.secondary',
                              mb: 1,
                            }}
                          />
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {files.length === 0
                              ? 'Drop files here or click to browse'
                              : `${files.length} file${files.length !== 1 ? 's' : ''} selected`}
                          </Typography>
                          <Box
                            component="input"
                            ref={inputRef}
                            type="file"
                            multiple
                            sx={{
                              position: 'absolute',
                              width: 1,
                              height: 1,
                              opacity: 0,
                              pointerEvents: 'none',
                            }}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) => {
                              addFiles(e.target.files)
                              e.target.value = ''
                            }}
                          />
                        </Box>

                        {files.length > 0 && (
                          <List dense disablePadding>
                            {files.map((f, i) => (
                              <ListItem
                                key={i}
                                disableGutters
                                secondaryAction={
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      setFiles((p) =>
                                        p.filter((_, j) => j !== i),
                                      )
                                    }
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                }
                              >
                                <ListItemText
                                  primary={f.name}
                                  secondary={formatBytes(f.size)}
                                  slotProps={{
                                    primary: {
                                      noWrap: true,
                                      sx: { maxWidth: '80%' },
                                    },
                                  }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}

                        <TextField
                          label="Your name (optional)"
                          value={uploaderName}
                          onChange={(e) => setUploaderName(e.target.value)}
                          size="small"
                          fullWidth
                          slotProps={{ htmlInput: { maxLength: 100 } }}
                          placeholder="So the requester knows who sent these files"
                        />
                        <TextField
                          label="Note to requester (optional)"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          size="small"
                          fullWidth
                          slotProps={{ htmlInput: { maxLength: 500 } }}
                          placeholder="Any context or message you'd like to add…"
                        />

                        <Button
                          variant="contained"
                          size="large"
                          onClick={upload}
                          disabled={files.length === 0}
                          fullWidth
                        >
                          Send{' '}
                          {files.length > 0
                            ? `${files.length} file${files.length !== 1 ? 's' : ''}`
                            : 'files'}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}
