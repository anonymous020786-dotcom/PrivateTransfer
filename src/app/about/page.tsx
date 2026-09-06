import type { Metadata } from 'next'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import PageShell from '../../components/PageShell'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: 'About',
  description: `Learn about ${brand.name} — a privacy-first, peer-to-peer and cloud file transfer platform built by ${brand.credits.author}.`,
  alternates: { canonical: '/about' },
}

const VALUES = [
  {
    title: 'Privacy first',
    body: "We can't lose what we never hold. P2P files travel directly between browsers — zero bytes on our servers. Cloud transfers are stored encrypted on Cloudflare R2 and auto-deleted at expiry.",
  },
  {
    title: 'Radically simple',
    body: 'One free account, no installs, no dark patterns. Sign in once, drop a file, share a link. Guest uploads also work — no account needed for basic use.',
  },
  {
    title: 'Open & honest',
    body: 'Transparent about how transfers work, what we store (almost nothing), and how we keep the service safe. Credentials and feature flags are manageable from the admin panel — no VPS access required.',
  },
]

const CAPABILITIES = [
  { label: '200 GB', desc: 'Max cloud transfer size (WeTransfer Pro parity)' },
  { label: '1 year', desc: 'Max link lifetime for signed-in users' },
  { label: '20 files', desc: 'Max files per cloud transfer' },
  { label: '∞', desc: 'P2P transfer size — no cap, ever' },
  { label: '5 min', desc: 'Worst-case cleanup window for expired transfers' },
  { label: '30 s', desc: 'Burn-after-read deletion window' },
]

const FEATURES = [
  {
    section: 'Cloud transfers',
    items: [
      'Drag-drop or folder upload up to 200 GB across 20 files',
      'Persistent shareable link — up to 1 year for registered users',
      'Email notification to recipient(s) on upload complete',
      'Download alert email to sender on first download',
      'Optional AES-256-GCM client-side encryption — key in URL fragment, server stores only ciphertext',
      'Password protection (SHA-256, rate-limited verify endpoint)',
      'Per-link download cap and burn-after-read mode',
      'Inline image / video / PDF preview without downloading',
      'Download all files as a client-side ZIP (fflate — no server)',
      'Social share: WhatsApp · Telegram · X · Email · Web Share API',
      'Transfer history with copy/delete/open — signed-in users only',
    ],
  },
  {
    section: 'Peer-to-peer transfers',
    items: [
      'True browser-to-browser via WebRTC DataChannels (PeerJS)',
      'End-to-end encrypted by default (DTLS — mandatory)',
      'No file-size cap — backpressure streaming to disk',
      'Resumable on flaky networks (per-downloader byte offset)',
      'Live presence and download count via Server-Sent Events',
      'QR code + short link — multiple recipients from one room',
    ],
  },
  {
    section: 'Storage & infrastructure',
    items: [
      'Cloudflare R2 — zero egress fees; file bytes bypass the VPS entirely',
      'AWS S3 — Intelligent-Tiering, Standard-IA, or Glacier IR (up to 68% savings)',
      'Switch storage provider from the admin panel — no redeploy needed',
      'Cron cleanup every 5 min via Alpine container (batch S3 DeleteObjects)',
      'Redis — rate limiting, cleanup queue, presence coordination',
      'Watchtower — zero-downtime auto-updates from GHCR on every push',
    ],
  },
  {
    section: 'Transfer management',
    items: [
      'Transfer history with bulk delete, inline edit, and storage usage bar',
      'Edit title, message, password, expiry, and download cap after upload',
      'Per-download email notifications (first download or every download)',
      'Webhook callbacks — POST JSON payload to any URL on every download',
      'Transfer templates / presets — save and reapply common settings',
      'File request inbox (Collect) — receive files from anyone via link or QR',
      'API keys — Bearer token auth for programmatic transfer creation',
      'Storage dashboard — total bytes, file count, transfer count',
      'OpenGraph image per transfer link for rich social previews',
    ],
  },
  {
    section: 'Accounts & admin',
    items: [
      'Supabase auth — Google OAuth, magic link, TOTP 2FA',
      'Profile with avatar, display name, and security panel',
      'Admin panel at /admin — stats, blog manager, runtime settings',
      'Runtime settings panel — change SMTP, R2/S3 keys, feature flags without touching the VPS',
      'Feature flags: email notifications, transfer tracking, reCAPTCHA, guest uploads, registration',
      'Admin email allowlist via ADMIN_EMAILS env var',
    ],
  },
  {
    section: 'Platform & UX',
    items: [
      '15 in-browser tools (image, PDF, text, video) — all client-side',
      '140+ article blog with dynamic CMS from admin panel',
      '13 accent colors, 6 fonts, 8 theme presets, density and radius controls',
      'Accessibility suite: high contrast, grayscale, dyslexia spacing, reduced motion, reading guide, big cursor, RTL',
      'Google Analytics + reCAPTCHA v3 (env-gated, toggleable from admin)',
      'GDPR cookie consent banner, full compliance pages',
      'Dynamic sitemap, JSON-LD, OpenGraph, canonical URLs',
    ],
  },
]

export default function AboutPage(): React.ReactElement {
  return (
    <PageShell
      title={`About ${brand.name}`}
      subtitle="Private, fast file transfer — peer-to-peer and cloud, in one platform."
    >
      <Typography component="p">
        {brand.name} was born from a simple frustration: sharing a file
        shouldn't mean uploading your private data to someone else's cloud,
        waiting for it to process, and hoping it gets deleted. Most "file
        sharing" services keep a copy of everything you send. {brand.name} gives
        you the choice.
      </Typography>
      <Typography component="p">
        In <strong>P2P mode</strong>, {brand.name} uses WebRTC to open a direct,
        encrypted channel between the sender's browser and the recipient's
        browser. The bytes flow straight from one device to the other — no size
        cap, no server copy, gone the moment you close the tab.
      </Typography>
      <Typography component="p">
        In <strong>Cloud mode</strong>, files go browser → Cloudflare R2 →
        browser via presigned URLs. The VPS never touches your bytes. Links stay
        live for up to 1 year, support up to 200 GB per transfer, and are
        automatically deleted at expiry — every 5 minutes by a cron container,
        or within 30 seconds for burn-after-read links.
      </Typography>

      {/* Values */}
      <Box sx={{ my: 4 }}>
        <Grid container spacing={3}>
          {VALUES.map((v) => (
            <Grid size={{ xs: 12, md: 4 }} key={v.title}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {v.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {v.body}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Key numbers */}
      <Box sx={{ my: 4 }}>
        <Grid container spacing={2}>
          {CAPABILITIES.map((c) => (
            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={c.label}>
              <Card variant="outlined" sx={{ textAlign: 'center' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 800, color: 'primary.main' }}
                  >
                    {c.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Full feature list */}
      <Typography variant="h2" component="h2" sx={{ mt: 5, mb: 3 }}>
        Full feature list
      </Typography>
      <Stack spacing={4}>
        {FEATURES.map((group) => (
          <Box key={group.section}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', mb: 1.5 }}
            >
              <Chip
                label={group.section}
                color="primary"
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Stack>
            <Stack spacing={0.75}>
              {group.items.map((item) => (
                <Stack key={item} direction="row" spacing={1}>
                  <Typography
                    variant="body2"
                    color="primary.main"
                    sx={{ flexShrink: 0 }}
                  >
                    ✓
                  </Typography>
                  <Typography variant="body2">{item}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ my: 5 }} />

      <Typography variant="h2" component="h2">
        Who builds {brand.name}
      </Typography>
      <Typography component="p">
        {brand.name} is built and maintained by{' '}
        <strong>{brand.credits.author}</strong> ({brand.credits.authorRole}),
        with engineering assistance from{' '}
        <strong>{brand.credits.builtWith}</strong>. It's operated under{' '}
        {brand.org.legalName}.
      </Typography>
      <Typography component="p">
        Questions, feedback, or partnership ideas? Reach us at{' '}
        <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a> or
        on{' '}
        <a
          href={brand.contact.whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
        .
      </Typography>
    </PageShell>
  )
}
