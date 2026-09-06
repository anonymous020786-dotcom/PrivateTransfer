import * as React from 'react'
import type { Metadata } from 'next'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LockIcon from '@mui/icons-material/Lock'
import BoltIcon from '@mui/icons-material/Bolt'
import CloudOffIcon from '@mui/icons-material/CloudOff'
import DevicesIcon from '@mui/icons-material/Devices'
import PublicIcon from '@mui/icons-material/Public'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AllInclusiveIcon from '@mui/icons-material/AllInclusive'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import ReplayIcon from '@mui/icons-material/Replay'
import SensorsIcon from '@mui/icons-material/Sensors'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import AutoDeleteIcon from '@mui/icons-material/AutoDelete'
import Divider from '@mui/material/Divider'
import { Link as ViewTransitionLink } from 'next-view-transitions'
import { ZyncIcon } from '../components/Logo'
import AnimatedBackground from '../components/AnimatedBackground'
import FeatureSlider from '../components/FeatureSlider'
import { brand } from '../brand'

export const metadata: Metadata = {
  title: `${brand.name} • ${brand.tagline}`,
  description: brand.shortDescription,
  alternates: { canonical: '/' },
}

const FEATURES = [
  {
    icon: CloudOffIcon,
    title: 'No server storage (P2P)',
    body: 'Files stream directly browser-to-browser over WebRTC. They never touch our servers, so there is nothing to leak, subpoena, or breach.',
  },
  {
    icon: LockIcon,
    title: 'Encrypted end-to-end',
    body: 'P2P transfers use WebRTC’s mandatory DTLS encryption. Cloud transfers support optional AES-256-GCM in-browser encryption — files are encrypted before upload so the server only ever stores ciphertext.',
  },
  {
    icon: BoltIcon,
    title: 'Blazing fast',
    body: 'P2P transfers move at full network speed with no round trip. Cloud transfers go browser → R2 → browser via presigned URLs — the VPS never touches your file bytes.',
  },
  {
    icon: DevicesIcon,
    title: 'Any device, any size',
    body: 'Works in any modern browser on desktop or mobile. P2P has no size cap. Cloud transfers support up to 200 GB per transfer across up to 20 files.',
  },
  {
    icon: PublicIcon,
    title: 'Share with a link or QR',
    body: 'Every transfer — P2P or cloud — gets a short link and scannable QR code. Add recipient emails and we’ll notify them the moment your transfer is ready.',
  },
  {
    icon: VpnKeyIcon,
    title: 'You stay in control',
    body: 'Password-protect, set a download cap, burn-after-read, webhooks, or save transfer templates. Edit any setting after upload. API keys for programmatic access. Cloud links up to 1 year.',
  },
  {
    icon: AllInclusiveIcon,
    title: '200 GB cloud transfers',
    body: 'Cloud transfers (WeTransfer-style) support up to 200 GB per transfer and up to 1 year expiry for registered users — full WeTransfer Pro parity, for free.',
  },
  {
    icon: SensorsIcon,
    title: 'Live presence & status',
    body: 'See in real time when the uploader is online, how many people are viewing, and how many downloads have started — streamed over Server-Sent Events.',
  },
  {
    icon: QrCode2Icon,
    title: 'Email & download alerts',
    body: 'Send a transfer link directly to recipient emails. Get notified the moment your file is downloaded. All powered by transactional email via SMTP.',
  },
  {
    icon: ReplayIcon,
    title: 'Resumable transfers',
    body: 'Dropped connection? Zync remembers the last acknowledged byte and resumes from there instead of starting over. Works for both P2P and cloud modes.',
  },
  {
    icon: AutoDeleteIcon,
    title: 'Automatic cleanup',
    body: 'Expired cloud transfers are batch-deleted every 5 minutes via a cron container. Burn-after-read links are wiped within 30 seconds of first download.',
  },
  {
    icon: CloudUploadIcon,
    title: 'Flexible cloud storage',
    body: 'Store files on Cloudflare R2 (zero egress fees) or AWS S3 with Intelligent-Tiering, Standard-IA, or Glacier IR for up to 68% cost savings. Switch providers from the admin panel.',
  },
]

const HIGHLIGHTS: Array<{ stat: string; label: string }> = [
  { stat: '∞', label: 'P2P file size limit' },
  { stat: '200 GB', label: 'Cloud transfer cap' },
  { stat: 'E2E', label: 'Encrypted by default' },
  { stat: '1 yr', label: 'Max link lifetime' },
]

const TECH: Array<{ name: string; role: string }> = [
  {
    name: 'Next.js 16',
    role: 'App Router + Turbopack — fast, SEO-ready frontend & API',
  },
  {
    name: 'React 19',
    role: 'Modern UI with Server Components & Server Actions',
  },
  { name: 'TypeScript 5', role: 'End-to-end type safety across all layers' },
  {
    name: 'Material UI v9',
    role: 'Accessible, themeable design system with dark mode',
  },
  {
    name: 'WebRTC + PeerJS',
    role: 'Encrypted peer-to-peer data channels with STUN/TURN',
  },
  {
    name: 'Server-Sent Events',
    role: 'Real-time live presence, download counts & stats',
  },
  {
    name: 'Redis 7',
    role: 'Rate limiting, cleanup queue, presence coordination',
  },
  {
    name: 'Cloudflare R2 / AWS S3',
    role: 'Cloud file storage — zero R2 egress, S3 Intelligent-Tiering',
  },
  {
    name: 'Supabase',
    role: 'Auth (Google OAuth, TOTP 2FA), DB for history & runtime settings',
  },
  {
    name: 'Nodemailer',
    role: 'Transactional email — transfer notifications, download alerts',
  },
  { name: 'Zod', role: 'Runtime schema validation at all API boundaries' },
  {
    name: 'fflate',
    role: 'Client-side ZIP of multi-file transfers — no server needed',
  },
  {
    name: 'Docker + Watchtower',
    role: 'Containerised VPS deploy with zero-downtime auto-updates',
  },
  {
    name: 'GitHub Actions',
    role: 'CI/CD — build, type-check, test, push to GHCR on every commit',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Drop your file',
    body: 'Open the sender, drag in a file (or several). Nothing uploads yet — your browser just gets ready to serve it.',
  },
  {
    n: '02',
    title: 'Share the link',
    body: 'Zync mints a short link and QR code. Send it to whoever needs the file, however you like.',
  },
  {
    n: '03',
    title: 'They download direct',
    body: 'The recipient’s browser connects straight to yours and the bytes flow peer-to-peer until it’s done.',
  },
]

function JsonLd(): React.ReactElement {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: brand.org.legalName,
        url: brand.url,
        logo: `${brand.url}/icon.svg`,
        email: brand.contact.email,
        foundingDate: String(brand.org.foundingYear),
      },
      {
        '@type': 'WebSite',
        name: brand.name,
        url: brand.url,
        description: brand.shortDescription,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${brand.url}/blog?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'SoftwareApplication',
        name: brand.name,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any (web browser)',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export default function LandingPage(): React.ReactElement {
  return (
    <Box>
      <JsonLd />

      {/* Hero */}
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        <AnimatedBackground />
        <Container
          maxWidth="md"
          sx={{
            py: { xs: 8, md: 12 },
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Stack spacing={3} sx={{ alignItems: 'center' }}>
            <ZyncIcon size={72} />
            <Chip
              icon={<AllInclusiveIcon />}
              label="Unlimited size • Free • Private • One-time sign-up"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.03em',
                fontSize: { xs: '2.25rem', md: '3.5rem' },
                lineHeight: 1.1,
              }}
            >
              Send files straight from{' '}
              <Box
                component="span"
                sx={{
                  background: 'linear-gradient(135deg,#6366f1,#a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                browser to browser
              </Box>
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: 'text.secondary', maxWidth: 640, fontWeight: 400 }}
            >
              {brand.name} beams your files directly to the recipient over an
              encrypted peer-to-peer connection.{' '}
              <strong>
                No file-size caps and no upload or download limits
              </strong>{' '}
              — and nothing is stored on a server. Your files are gone the
              moment you close the tab.
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ pt: 1 }}
            >
              <Button
                component={ViewTransitionLink}
                href="/send"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
              >
                Send a file now
              </Button>
              <Button
                component={ViewTransitionLink}
                href="/#how-it-works"
                variant="outlined"
                size="large"
              >
                How it works
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Highlights band */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Grid container spacing={2}>
            {HIGHLIGHTS.map((h) => (
              <Grid size={{ xs: 6, md: 3 }} key={h.label}>
                <Stack sx={{ alignItems: 'center', textAlign: 'center' }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      background: 'linear-gradient(135deg,#6366f1,#a855f7)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {h.stat}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {h.label}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features */}
      <Container
        maxWidth="lg"
        id="features"
        sx={{ py: { xs: 8, md: 10 }, scrollMarginTop: 80 }}
      >
        <Stack
          spacing={1}
          sx={{ alignItems: 'center', textAlign: 'center', mb: 6 }}
        >
          <Typography
            variant="overline"
            color="primary"
            sx={{ fontWeight: 700 }}
          >
            Why Zync
          </Typography>
          <Typography variant="h3" component="h2" sx={{ fontWeight: 800 }}>
            Private by design, fast by default
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 640 }}
          >
            Most “file sharing” tools upload your data to a server you don’t
            control. Zync skips the middleman entirely.
          </Typography>
        </Stack>
        <Grid container spacing={3}>
          {FEATURES.map((f) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.title}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      mb: 2,
                    }}
                  >
                    <f.icon />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {f.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {f.body}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Rotating highlight slider */}
      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 8 } }}>
        <FeatureSlider />
      </Container>

      {/* How it works */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container
          maxWidth="lg"
          id="how-it-works"
          sx={{ py: { xs: 8, md: 10 }, scrollMarginTop: 80 }}
        >
          <Stack
            spacing={1}
            sx={{ alignItems: 'center', textAlign: 'center', mb: 6 }}
          >
            <Typography
              variant="overline"
              color="primary"
              sx={{ fontWeight: 700 }}
            >
              How it works
            </Typography>
            <Typography variant="h3" component="h2" sx={{ fontWeight: 800 }}>
              Three steps, zero friction
            </Typography>
          </Stack>
          <Grid container spacing={4}>
            {STEPS.map((s) => (
              <Grid size={{ xs: 12, md: 4 }} key={s.n}>
                <Stack spacing={1.5}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 800,
                      color: 'primary.main',
                      opacity: 0.25,
                    }}
                  >
                    {s.n}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {s.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.body}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* P2P vs Cloud comparison */}
      <Container
        maxWidth="lg"
        id="compare"
        sx={{ py: { xs: 8, md: 10 }, scrollMarginTop: 80 }}
      >
        <Stack
          spacing={1}
          sx={{ alignItems: 'center', textAlign: 'center', mb: 6 }}
        >
          <Typography
            variant="overline"
            color="primary"
            sx={{ fontWeight: 700 }}
          >
            Two ways to transfer
          </Typography>
          <Typography variant="h3" component="h2" sx={{ fontWeight: 800 }}>
            P2P vs Cloud — pick what fits
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 620 }}
          >
            Zync gives you both modes. Use P2P when both sides are online and
            privacy is paramount. Use Cloud when you need a shareable link that
            works anytime.
          </Typography>
        </Stack>

        <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
          {/* P2P card */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderColor: 'primary.main',
                borderWidth: 2,
                position: 'relative',
                overflow: 'visible',
              }}
            >
              <Chip
                label="WebRTC · P2P"
                color="primary"
                size="small"
                icon={<SensorsIcon />}
                sx={{
                  position: 'absolute',
                  top: -14,
                  left: 20,
                  fontWeight: 700,
                }}
              />
              <CardContent sx={{ p: 3, pt: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Peer-to-Peer Transfer
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Files go straight from your browser to theirs — server sees
                  zero bytes.
                </Typography>
                <Stack spacing={1.5}>
                  {[
                    { ok: true, text: 'Unlimited file size — no cap ever' },
                    {
                      ok: true,
                      text: 'End-to-end encrypted (DTLS, mandatory)',
                    },
                    {
                      ok: true,
                      text: 'Zero server storage — nothing to delete',
                    },
                    { ok: true, text: 'Resumable on flaky networks' },
                    {
                      ok: true,
                      text: 'Live presence & download count via SSE',
                    },
                    { ok: true, text: 'QR code + short link sharing' },
                    {
                      ok: false,
                      text: 'Recipient must be online at the same time',
                    },
                    { ok: false, text: 'Link dies when sender closes the tab' },
                    { ok: false, text: 'No persistent download history' },
                  ].map(({ ok, text }) => (
                    <Stack
                      key={text}
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'flex-start' }}
                    >
                      {ok ? (
                        <CheckCircleIcon
                          fontSize="small"
                          color="success"
                          sx={{ mt: 0.15, flexShrink: 0 }}
                        />
                      ) : (
                        <CancelIcon
                          fontSize="small"
                          color="disabled"
                          sx={{ mt: 0.15, flexShrink: 0 }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        color={ok ? 'text.primary' : 'text.disabled'}
                      >
                        {text}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Button
                  component={ViewTransitionLink}
                  href="/send"
                  variant="contained"
                  fullWidth
                  endIcon={<ArrowForwardIcon />}
                >
                  Start P2P transfer
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Cloud card */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderColor: 'secondary.main',
                borderWidth: 2,
                position: 'relative',
                overflow: 'visible',
              }}
            >
              <Chip
                label="R2 / S3 · Cloud"
                color="secondary"
                size="small"
                icon={<CloudUploadIcon />}
                sx={{
                  position: 'absolute',
                  top: -14,
                  left: 20,
                  fontWeight: 700,
                }}
              />
              <CardContent sx={{ p: 3, pt: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Cloud Transfer (WeTransfer Pro-style)
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Files stored on Cloudflare R2 or AWS S3 for the link lifetime,
                  then automatically deleted.
                </Typography>
                <Stack spacing={1.5}>
                  {[
                    {
                      ok: true,
                      text: 'Works asynchronously — recipient downloads any time',
                    },
                    {
                      ok: true,
                      text: 'Up to 200 GB per transfer across up to 20 files',
                    },
                    {
                      ok: true,
                      text: 'Link valid up to 1 year (signed-in) · 7 days (guest)',
                    },
                    {
                      ok: true,
                      text: 'Send to recipient emails — they get notified instantly',
                    },
                    {
                      ok: true,
                      text: 'Download alert email on first download',
                    },
                    {
                      ok: true,
                      text: 'Password protection & per-link download cap',
                    },
                    {
                      ok: true,
                      text: 'Burn-after-read: auto-deleted 30 s after first download',
                    },
                    {
                      ok: true,
                      text: 'Inline preview (images, video, PDF) + download-all ZIP',
                    },
                    {
                      ok: true,
                      text: 'Social share: WhatsApp · Telegram · X · Email · Web Share',
                    },
                    {
                      ok: false,
                      text: 'Files transiently stored on cloud storage (encrypted)',
                    },
                  ].map(({ ok, text }) => (
                    <Stack
                      key={text}
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'flex-start' }}
                    >
                      {ok ? (
                        <CheckCircleIcon
                          fontSize="small"
                          color="success"
                          sx={{ mt: 0.15, flexShrink: 0 }}
                        />
                      ) : (
                        <CancelIcon
                          fontSize="small"
                          color="disabled"
                          sx={{ mt: 0.15, flexShrink: 0 }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        color={ok ? 'text.primary' : 'text.disabled'}
                      >
                        {text}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', mb: 2 }}
                >
                  <AutoDeleteIcon fontSize="small" color="warning" />
                  <Typography variant="caption" color="text.secondary">
                    Storage auto-cleans via Alpine cron container every 5 min.
                    Zero R2 egress fees — presigned URLs bypass the VPS.
                  </Typography>
                </Stack>
                <Button
                  component={ViewTransitionLink}
                  href="/transfer"
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  endIcon={<ArrowForwardIcon />}
                >
                  Start cloud transfer
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Tech stack */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
        <Stack
          spacing={1}
          sx={{ alignItems: 'center', textAlign: 'center', mb: 6 }}
        >
          <Typography
            variant="overline"
            color="primary"
            sx={{ fontWeight: 700 }}
          >
            Under the hood
          </Typography>
          <Typography variant="h3" component="h2" sx={{ fontWeight: 800 }}>
            Built with a modern, secure stack
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 640 }}
          >
            {brand.name} is engineered for speed, privacy and scale — every
            piece chosen to keep your data on the edge and out of a database.
          </Typography>
        </Stack>
        <Grid container spacing={2}>
          {TECH.map((t) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.name}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>{t.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t.role}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA */}
      <Container
        maxWidth="md"
        sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}
      >
        <Typography variant="h3" component="h2" sx={{ fontWeight: 800, mb: 2 }}>
          Ready to share something?
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 560, mx: 'auto' }}
        >
          Create your free account once, then send unlimited files in seconds —
          no installs, no catch.
        </Typography>
        <Button
          component={ViewTransitionLink}
          href="/send"
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
        >
          Start a transfer
        </Button>
      </Container>
    </Box>
  )
}
