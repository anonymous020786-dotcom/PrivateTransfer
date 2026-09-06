'use client'

import * as React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import SendIcon from '@mui/icons-material/Send'
import FolderZipIcon from '@mui/icons-material/FolderZip'
import LockIcon from '@mui/icons-material/Lock'
import BuildIcon from '@mui/icons-material/Build'
import AutoDeleteIcon from '@mui/icons-material/AutoDelete'
import ShareIcon from '@mui/icons-material/Share'
import InboxIcon from '@mui/icons-material/Inbox'
import StarIcon from '@mui/icons-material/Star'
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import { brand } from '../brand'

const STORAGE_KEY = 'zync.welcomed.v3'

const FEATURES = [
  {
    icon: <SendIcon fontSize="small" />,
    label: 'P2P & cloud transfers',
    desc: 'WebRTC real-time or Cloudflare R2 / AWS S3 cloud links up to 200 GB',
  },
  {
    icon: <LockIcon fontSize="small" />,
    label: 'End-to-end encryption',
    desc: 'AES-256-GCM in-browser — server stores only ciphertext, key in link only',
  },
  {
    icon: <TrackChangesIcon fontSize="small" />,
    label: 'Per-recipient tracking',
    desc: 'See exactly who downloaded and when — unique link per email recipient',
  },
  {
    icon: <StarIcon fontSize="small" />,
    label: 'Feedback & reviews',
    desc: 'Recipients leave a star rating after downloading — you see it in your dashboard',
  },
  {
    icon: <BrandingWatermarkIcon fontSize="small" />,
    label: 'Branded download pages',
    desc: 'Add your logo and background image to every transfer link you share',
  },
  {
    icon: <InboxIcon fontSize="small" />,
    label: 'File requests (Collect)',
    desc: 'Create an upload link or invite a specific person — they upload, you receive',
  },
  {
    icon: <AutoDeleteIcon fontSize="small" />,
    label: 'Burn after read',
    desc: 'Files permanently deleted from storage 30 s after the first download',
  },
  {
    icon: <FolderZipIcon fontSize="small" />,
    label: 'Download as ZIP',
    desc: 'All files bundled in a single ZIP, built in-browser with no server',
  },
  {
    icon: <ShareIcon fontSize="small" />,
    label: 'Share anywhere',
    desc: 'WhatsApp, Telegram, X, Email, QR code, webhooks & Web Share API',
  },
  {
    icon: <BuildIcon fontSize="small" />,
    label: '15 in-browser tools',
    desc: 'Image, PDF, text and video tools — no upload, fully client-side',
  },
]

export default function WelcomeDialog(): React.ReactElement | null {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
    } catch {
      /* ignore */
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <Dialog
      open={open}
      onClose={dismiss}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
    >
      {/* Hero */}
      <Box
        sx={{
          background:
            'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
          px: 4,
          py: 4,
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: 900, letterSpacing: '-0.5px', mb: 0.5 }}
        >
          Welcome to {brand.name} ⚡
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          {brand.tagline}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: 'center', mt: 2, flexWrap: 'wrap', gap: 0.5 }}
        >
          <Chip
            label="Always free"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,.2)', color: '#fff' }}
          />
          <Chip
            label="No size limit (P2P)"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,.2)', color: '#fff' }}
          />
          <Chip
            label="Up to 200 GB (cloud)"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,.2)', color: '#fff' }}
          />
          <Chip
            label="1-year links"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,.2)', color: '#fff' }}
          />
        </Stack>
      </Box>

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{
            mb: 2,
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Everything included, always
        </Typography>
        <Stack spacing={1.5}>
          {FEATURES.map(({ icon, label, desc }) => (
            <Stack
              key={label}
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'flex-start' }}
            >
              <Box sx={{ color: 'primary.main', mt: 0.25, flexShrink: 0 }}>
                {icon}
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, lineHeight: 1.3 }}
                >
                  {label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {desc}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center' }}
        >
          Sign in with Google to unlock 1-year links, transfer history,
          recipient tracking, reviews &amp; more.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button variant="outlined" onClick={dismiss} sx={{ flex: 1 }}>
          Maybe later
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<SendIcon />}
          onClick={dismiss}
          href="/transfer"
          sx={{ flex: 2, fontWeight: 700 }}
        >
          Get started free
        </Button>
      </DialogActions>
    </Dialog>
  )
}
