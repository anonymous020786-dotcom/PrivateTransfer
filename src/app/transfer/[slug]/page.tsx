import * as React from 'react'
import type { Metadata } from 'next'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import { ZyncIcon } from '../../../components/Logo'
import DownloadCard from '../../../components/transfer/DownloadCard'
import { BackgroundSetter } from '../../../components/transfer/BackgroundSetter'
import PageViewPing from '../../../components/transfer/PageViewPing'
import OwnerActions from '../../../components/transfer/OwnerActions'
import { getTransfer } from '../../../lib/transfer'
import { getSupabaseServerClient } from '../../../supabase/server'
import { brand } from '../../../brand'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ direct?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const t = await getTransfer(slug)
  if (!t || !t.completed) return { title: 'Transfer not found' }
  const label =
    t.title || `${t.files.length} file${t.files.length !== 1 ? 's' : ''}`
  const ogImageUrl = `${brand.url}/api/og/transfer/${slug}`
  return {
    title: `Download ${label} · ${brand.name}`,
    description:
      t.message || `${t.files.length} file(s) shared via ${brand.name}`,
    openGraph: {
      title: label,
      description:
        t.message || `${t.files.length} file(s) shared via ${brand.name}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: label,
      description:
        t.message || `${t.files.length} file(s) shared via ${brand.name}`,
      images: [ogImageUrl],
    },
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function TransferDownloadPage({
  params,
  searchParams,
}: Props): Promise<React.ReactElement> {
  const { slug } = await params
  const { direct } = await searchParams
  const autoDownload = direct === '1' || direct === 'true'
  const transfer = await getTransfer(slug)
  const expired = transfer && new Date(transfer.expiresAt) < new Date()

  // Check if the current user is the owner for tracking display
  let isOwner = false
  try {
    const supabase = await getSupabaseServerClient()
    if (supabase && transfer?.ownerId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      isOwner = !!user && user.id === transfer.ownerId
    }
  } catch {
    /* non-fatal */
  }

  // Per-recipient status for owner view
  const recipientList = isOwner
    ? Object.values(transfer?.recipientTokens ?? {}).map((r) => ({
        email: r.email,
        downloadedAt: r.downloadedAt ?? null,
      }))
    : []

  // Reviews + comments for owner view
  const reviews = isOwner ? (transfer?.reviews ?? []) : []
  const comments = isOwner ? (transfer?.comments ?? []) : []
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null

  // Country breakdown
  const countryMap: Record<string, number> = {}
  if (isOwner) {
    for (const ev of transfer?.downloadEvents ?? []) {
      const c = ev.country === 'XX' ? 'Unknown' : ev.country
      countryMap[c] = (countryMap[c] ?? 0) + 1
    }
  }
  const topCountries = Object.entries(countryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return (
    <>
      {transfer?.backgroundImageUrl && (
        <BackgroundSetter
          background={`url(${transfer.backgroundImageUrl}) center/cover no-repeat fixed`}
        />
      )}
      {!transfer?.backgroundImageUrl && transfer?.background && (
        <BackgroundSetter background={transfer.background} />
      )}
      <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
        {/* Custom logo for branded pages */}
        {transfer?.logoUrl && (
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="img"
              src={transfer.logoUrl}
              alt="Logo"
              sx={{ maxHeight: 64, maxWidth: 240, objectFit: 'contain' }}
            />
          </Box>
        )}

        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <Stack spacing={3}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center' }}
              >
                <ZyncIcon size={40} />
                <Stack>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 800, lineHeight: 1 }}
                  >
                    Secure file transfer
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Powered by {brand.name}
                  </Typography>
                </Stack>
              </Stack>

              {!transfer || !transfer.completed || expired ? (
                <Alert severity="error">
                  This transfer link is invalid or has expired.
                </Alert>
              ) : (
                <>
                  <PageViewPing slug={transfer.slug} />
                  <DownloadCard
                    slug={transfer.slug}
                    files={transfer.files.map(({ name, size, type, path }) => ({
                      name,
                      size,
                      type,
                      ...(path ? { path } : {}),
                    }))}
                    totalSize={transfer.totalSize}
                    expiresAt={transfer.expiresAt}
                    title={transfer.title}
                    message={transfer.message}
                    downloadCount={transfer.downloadCount}
                    maxDownloads={transfer.maxDownloads}
                    passwordProtected={!!transfer.passwordHash}
                    burnAfterRead={!!transfer.burnAfterRead}
                    autoDownload={autoDownload}
                    encrypted={!!transfer.encrypted}
                    scanStatus={transfer.scanStatus}
                    passwordHint={transfer.passwordHint ?? null}
                  />

                  {/* Transfer tracking — only visible to the owner */}
                  {isOwner && (
                    <>
                      <Divider />
                      <Stack spacing={2.5}>
                        {/* Header */}
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'center' }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700 }}
                          >
                            Transfer tracking
                          </Typography>
                          <Chip
                            label={`${transfer.pageViewCount ?? 0} view${(transfer.pageViewCount ?? 0) !== 1 ? 's' : ''}`}
                            size="small"
                          />
                          {transfer.recipientEmails.length > 0 && (
                            <Chip
                              label={`${transfer.emailOpenCount ?? 0} email open${(transfer.emailOpenCount ?? 0) !== 1 ? 's' : ''}`}
                              size="small"
                              color={
                                (transfer.emailOpenCount ?? 0) > 0
                                  ? 'info'
                                  : 'default'
                              }
                            />
                          )}
                          <Chip
                            label={`${transfer.downloadCount} download${transfer.downloadCount !== 1 ? 's' : ''}`}
                            size="small"
                            color={
                              transfer.downloadCount > 0 ? 'success' : 'default'
                            }
                          />
                          {avgRating !== null && (
                            <Chip
                              label={`★ ${avgRating.toFixed(1)} (${reviews.length})`}
                              size="small"
                              color="warning"
                            />
                          )}
                        </Stack>

                        {/* Per-recipient status */}
                        {recipientList.length > 0 && (
                          <Stack spacing={0.75}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            >
                              Recipients
                            </Typography>
                            {recipientList.map((r) => (
                              <Stack
                                key={r.email}
                                direction="row"
                                spacing={1}
                                sx={{
                                  alignItems: 'center',
                                  py: 0.75,
                                  px: 1,
                                  borderRadius: 1,
                                  bgcolor: 'action.hover',
                                }}
                              >
                                <Typography variant="caption" sx={{ flex: 1 }}>
                                  {r.email}
                                </Typography>
                                <Chip
                                  label={
                                    r.downloadedAt
                                      ? `Downloaded ${formatDate(r.downloadedAt)}`
                                      : 'Not yet downloaded'
                                  }
                                  size="small"
                                  color={r.downloadedAt ? 'success' : 'default'}
                                  variant={
                                    r.downloadedAt ? 'filled' : 'outlined'
                                  }
                                />
                              </Stack>
                            ))}
                          </Stack>
                        )}

                        {/* Download events log */}
                        {transfer.downloadEvents.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            No downloads yet. Share your link to get started.
                          </Typography>
                        ) : (
                          <Stack spacing={0.75}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            >
                              Download log
                            </Typography>
                            {transfer.downloadEvents
                              .slice()
                              .reverse()
                              .map((ev, i) => (
                                <Stack
                                  key={i}
                                  direction="row"
                                  spacing={1}
                                  sx={{
                                    alignItems: 'center',
                                    py: 0.75,
                                    px: 1,
                                    borderRadius: 1,
                                    bgcolor: 'action.hover',
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontFamily: 'monospace',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {ev.country !== 'XX' ? ev.country : '??'}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ flex: 1 }}
                                  >
                                    {formatDate(ev.at)}
                                  </Typography>
                                </Stack>
                              ))}
                            {transfer.downloadEvents.length === 500 && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Showing first 500 events.
                              </Typography>
                            )}
                          </Stack>
                        )}

                        {/* Reviews */}
                        {reviews.length > 0 && (
                          <Stack spacing={0.75}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            >
                              Feedback ({reviews.length})
                            </Typography>
                            {reviews.map((rv, i) => (
                              <Stack
                                key={i}
                                spacing={0.25}
                                sx={{
                                  py: 1,
                                  px: 1.5,
                                  borderRadius: 1,
                                  bgcolor: 'action.hover',
                                }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  sx={{ alignItems: 'center' }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{ color: 'warning.main' }}
                                  >
                                    {'★'.repeat(rv.rating)}
                                    {'☆'.repeat(5 - rv.rating)}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {formatDate(rv.at)} ·{' '}
                                    {rv.country !== 'XX'
                                      ? rv.country
                                      : 'Unknown'}
                                  </Typography>
                                </Stack>
                                {rv.comment && (
                                  <Typography
                                    variant="caption"
                                    sx={{ fontStyle: 'italic' }}
                                  >
                                    &ldquo;{rv.comment}&rdquo;
                                  </Typography>
                                )}
                              </Stack>
                            ))}
                          </Stack>
                        )}

                        {/* Recipient messages/comments */}
                        {comments.length > 0 && (
                          <Stack spacing={0.75}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            >
                              Messages from recipients ({comments.length})
                            </Typography>
                            {comments.map((c, i) => (
                              <Stack
                                key={i}
                                spacing={0.25}
                                sx={{
                                  py: 1,
                                  px: 1.5,
                                  borderRadius: 1,
                                  bgcolor: 'action.hover',
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{ fontStyle: 'italic' }}
                                >
                                  &ldquo;{c.text}&rdquo;
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {formatDate(c.at)} ·{' '}
                                  {c.country !== 'XX' ? c.country : 'Unknown'}
                                </Typography>
                              </Stack>
                            ))}
                          </Stack>
                        )}

                        {/* Country breakdown bar chart */}
                        {topCountries.length > 0 && (
                          <Stack spacing={0.75}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            >
                              Downloads by country
                            </Typography>
                            {topCountries.map(([country, count]) => (
                              <Stack
                                key={country}
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: 'center' }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    width: 32,
                                    flexShrink: 0,
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {country}
                                </Typography>
                                <Box
                                  sx={{
                                    flex: 1,
                                    height: 8,
                                    borderRadius: 1,
                                    bgcolor: 'action.hover',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      height: '100%',
                                      width: `${(count / topCountries[0][1]) * 100}%`,
                                      bgcolor: 'primary.main',
                                      borderRadius: 1,
                                    }}
                                  />
                                </Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    width: 24,
                                    textAlign: 'right',
                                    flexShrink: 0,
                                  }}
                                >
                                  {count}
                                </Typography>
                              </Stack>
                            ))}
                          </Stack>
                        )}

                        {/* Owner actions: static links */}
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ flexWrap: 'wrap', pt: 1 }}
                        >
                          <Chip
                            component="a"
                            href={`/api/transfer/${transfer.slug}/analytics/export`}
                            label="Export CSV"
                            size="small"
                            variant="outlined"
                            clickable
                          />
                          <Chip
                            component="a"
                            href={`/transfer?duplicate=${transfer.slug}`}
                            label="Duplicate settings"
                            size="small"
                            variant="outlined"
                            clickable
                          />
                        </Stack>
                        {/* Owner actions: interactive (resend, add to board) */}
                        <OwnerActions
                          slug={transfer.slug}
                          recipientCount={transfer.recipientEmails.length}
                        />

                        {/* Scheduled sending info */}
                        {transfer.scheduledAt && !transfer.notificationSent && (
                          <Alert severity="info" sx={{ py: 0.5 }}>
                            Recipient emails scheduled for{' '}
                            <strong>{formatDate(transfer.scheduledAt)}</strong>
                          </Alert>
                        )}
                      </Stack>
                    </>
                  )}
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </>
  )
}
