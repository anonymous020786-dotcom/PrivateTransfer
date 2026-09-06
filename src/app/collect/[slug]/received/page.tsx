import * as React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import {
  requireUserOrRedirect,
  getSupabaseServerClient,
} from '../../../../supabase/server'
import { getCollect } from '../../../../lib/collect'
import { getStorageClient, getStorageBucket } from '../../../../lib/storage'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { brand } from '../../../../brand'

export const metadata: Metadata = { title: `Received files · ${brand.name}` }

function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${n} B`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Props = { params: Promise<{ slug: string }> }

export default async function CollectReceivedPage({
  params,
}: Props): Promise<React.ReactElement> {
  await requireUserOrRedirect('/collect')
  const { slug } = await params

  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  const collect = await getCollect(slug)

  if (!collect || !user || collect.ownerId !== user.id) {
    redirect('/collect')
  }

  // Generate presigned download URLs for all received files
  type FileWithUrl = (typeof collect.files)[0] & { downloadUrl?: string }
  const filesWithUrls: FileWithUrl[] = []
  try {
    const storage = await getStorageClient()
    const bucket = await getStorageBucket()
    for (const f of collect.files) {
      const cmd = new GetObjectCommand({ Bucket: bucket, Key: f.key })
      const url = await getSignedUrl(storage, cmd, { expiresIn: 3600 })
      filesWithUrls.push({ ...f, downloadUrl: url })
    }
  } catch {
    filesWithUrls.push(...collect.files.map((f) => ({ ...f })))
  }

  const daysLeft = Math.ceil(
    (new Date(collect.expiresAt).getTime() - Date.now()) / 86400000,
  )

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={3}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Received files
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {collect.title}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" href="/collect">
              My requests
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Chip
            label={daysLeft > 0 ? `${daysLeft}d remaining` : 'Expired'}
            size="small"
            color={daysLeft <= 2 ? 'warning' : 'default'}
          />
          <Chip
            label={`${collect.files.length}/${collect.maxFiles} files received`}
            size="small"
            color={collect.files.length > 0 ? 'success' : 'default'}
          />
          <Chip
            label={collect.active ? 'Accepting uploads' : 'Closed'}
            size="small"
            color={collect.active ? 'success' : 'default'}
            variant="outlined"
          />
        </Stack>

        {collect.description && (
          <Alert severity="info">{collect.description}</Alert>
        )}

        {filesWithUrls.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2} sx={{ alignItems: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  No files received yet.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Share your collect link:{' '}
                  <Box
                    component="span"
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: 'action.hover',
                      px: 0.5,
                      borderRadius: 0.5,
                    }}
                  >
                    {`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/collect/${slug}`}
                  </Box>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {filesWithUrls.map((f, i) => (
              <Card key={i} variant="outlined">
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      sx={{
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 1,
                      }}
                    >
                      <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700 }}
                          noWrap
                        >
                          {f.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatBytes(f.size)} · Uploaded{' '}
                          {formatDate(f.uploadedAt)}
                          {f.uploaderName ? ` · from ${f.uploaderName}` : ''}
                        </Typography>
                      </Stack>
                      {f.downloadUrl && (
                        <Button
                          size="small"
                          variant="outlined"
                          component="a"
                          href={f.downloadUrl}
                          download={f.name}
                          sx={{ flexShrink: 0 }}
                        >
                          Download
                        </Button>
                      )}
                    </Stack>
                    {f.uploaderNote && (
                      <>
                        <Divider />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontStyle: 'italic' }}
                        >
                          Note: {f.uploaderNote}
                        </Typography>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
