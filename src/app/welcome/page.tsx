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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SendIcon from '@mui/icons-material/Send'
import LockIcon from '@mui/icons-material/Lock'
import InboxIcon from '@mui/icons-material/Inbox'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import StarIcon from '@mui/icons-material/Star'
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark'
import AutoDeleteIcon from '@mui/icons-material/AutoDelete'
import BuildIcon from '@mui/icons-material/Build'
import { Link as ViewTransitionLink } from 'next-view-transitions'
import { ZyncIcon } from '../../components/Logo'
import AnimatedBackground from '../../components/AnimatedBackground'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: 'Welcome',
  description: `Welcome to ${brand.name} — private, encrypted file transfer up to 200 GB with per-recipient tracking, reviews, branded pages and more.`,
  alternates: { canonical: '/welcome' },
}

const STEPS = [
  {
    n: '1',
    title: 'Create your free account',
    body: 'Sign up once with Google, magic link, or TOTP 2FA — unlocks 1-year links, history, and every pro feature.',
  },
  {
    n: '2',
    title: 'Drop your files',
    body: 'Drag in up to 20 files (200 GB total). Add a title, message, password, custom expiry, or E2E encryption.',
  },
  {
    n: '3',
    title: 'Share your personalised link',
    body: 'Add recipient emails — each gets a unique tracked link. Or share a QR code, WhatsApp, Telegram, X or email.',
  },
  {
    n: '4',
    title: 'Track, collect feedback',
    body: 'See who downloaded and when. Recipients leave a star rating. You get an email or webhook on every download.',
  },
]

const FEATURES = [
  {
    icon: <SendIcon />,
    label: 'P2P & cloud transfers',
    desc: 'WebRTC direct browser-to-browser or Cloudflare R2 / AWS S3 cloud links up to 200 GB — zero egress fees.',
  },
  {
    icon: <LockIcon />,
    label: 'AES-256-GCM encryption',
    desc: 'Files encrypted in-browser before upload. Decryption key travels only in the URL fragment — server never sees plaintext.',
  },
  {
    icon: <TrackChangesIcon />,
    label: 'Per-recipient tracking',
    desc: 'Each email recipient gets a unique download link. See exactly who opened it, and when, in your transfer dashboard.',
  },
  {
    icon: <StarIcon />,
    label: 'Feedback & reviews',
    desc: 'After downloading, recipients can leave a star rating and comment. Average rating shown in your analytics panel.',
  },
  {
    icon: <BrandingWatermarkIcon />,
    label: 'Branded download pages',
    desc: 'Add a custom logo and background image to your transfer links — make every share feel like yours.',
  },
  {
    icon: <InboxIcon />,
    label: 'File requests (Collect)',
    desc: 'Create an open upload inbox or invite a specific person by email — they upload, you get notified instantly.',
  },
  {
    icon: <AutoDeleteIcon />,
    label: 'Burn after read',
    desc: 'Files permanently deleted from storage 30 seconds after the first download begins.',
  },
  {
    icon: <BuildIcon />,
    label: '15 in-browser tools',
    desc: 'Image compress, PDF merge, video trim, text diff and more — all client-side, nothing uploaded.',
  },
]

const PERKS = [
  'Up to 200 GB per transfer',
  '1-year link lifetime',
  'End-to-end encrypted',
  'Per-recipient tracking',
  'Star ratings & feedback',
  'Branded pages',
  'File requests (Collect)',
  'Webhooks & API keys',
  'Transfer templates',
  '15 in-browser tools',
  'No size limit (P2P)',
]

export default function WelcomePage(): React.ReactElement {
  return (
    <Box>
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
              label="Welcome aboard 🎉"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Typography
              variant="h2"
              component="h1"
              sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '3rem' } }}
            >
              Welcome to{' '}
              <Box
                component="span"
                sx={{
                  background: 'linear-gradient(135deg,#6366f1,#a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {brand.name}
              </Box>
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ fontWeight: 400, maxWidth: 620 }}
            >
              Private, encrypted file transfer up to 200 GB — with per-recipient
              tracking, star ratings, branded pages, file requests and more.
              WeTransfer Pro features, free.
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ pt: 1 }}
            >
              <Button
                component={ViewTransitionLink}
                href="/login?mode=signup"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
              >
                Create your free account
              </Button>
              <Button
                component={ViewTransitionLink}
                href="/transfer"
                variant="outlined"
                size="large"
              >
                Send a file now
              </Button>
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'center', pt: 2 }}
            >
              {PERKS.map((p) => (
                <Chip key={p} label={p} size="small" variant="outlined" />
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* How it works */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography
          variant="h3"
          component="h2"
          sx={{ fontWeight: 800, textAlign: 'center', mb: 6 }}
        >
          Up and running in four steps
        </Typography>
        <Grid container spacing={3}>
          {STEPS.map((s) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={s.n}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      mb: 2,
                    }}
                  >
                    {s.n}
                  </Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, mb: 1 }}
                  >
                    {s.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.body}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Feature grid */}
      <Box sx={{ bgcolor: 'action.hover', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h2"
            sx={{ fontWeight: 800, textAlign: 'center', mb: 6 }}
          >
            Everything you need, nothing you don&apos;t
          </Typography>
          <Grid container spacing={3}>
            {FEATURES.map((f) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={f.label}>
                <Card
                  variant="outlined"
                  sx={{ height: '100%', bgcolor: 'background.paper' }}
                >
                  <CardContent>
                    <Box sx={{ color: 'primary.main', mb: 1.5 }}>{f.icon}</Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, mb: 0.5 }}
                    >
                      {f.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {f.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA */}
      <Container
        maxWidth="sm"
        sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Ready to send your first file?
          </Typography>
          <Typography color="text.secondary">
            No credit card. No install. Sign up in seconds with Google or email.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              component={ViewTransitionLink}
              href="/login?mode=signup"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
            >
              Create free account
            </Button>
            <Button
              component={ViewTransitionLink}
              href="/transfer"
              variant="outlined"
              size="large"
            >
              Try without signing in
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
