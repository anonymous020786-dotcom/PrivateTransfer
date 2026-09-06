'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import Typography from '@mui/material/Typography'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { brand } from '../brand'

// Professional floating WhatsApp button: pulsing halo + an expanding label
// that slides out on hover. Bottom-left so it never collides with the
// settings/accessibility FABs on the right.
export default function WhatsAppFab(): React.ReactElement | null {
  const [mounted, setMounted] = React.useState(false)
  const [hover, setHover] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        zIndex: (t) => t.zIndex.speedDial,
        display: 'flex',
        alignItems: 'center',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Fab
        component="a"
        href={brand.contact.whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        sx={{
          bgcolor: '#25D366',
          color: '#fff',
          '&:hover': { bgcolor: '#1ebe5b' },
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            boxShadow: '0 0 0 0 rgba(37,211,102,0.6)',
            animation: 'zync-wa-pulse 2.2s infinite',
          },
          '@keyframes zync-wa-pulse': {
            '0%': { boxShadow: '0 0 0 0 rgba(37,211,102,0.5)' },
            '70%': { boxShadow: '0 0 0 16px rgba(37,211,102,0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(37,211,102,0)' },
          },
        }}
      >
        <WhatsAppIcon />
        {/* Live "online" status dot */}
        <Box
          sx={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: '#22c55e',
            border: '2px solid #fff',
          }}
        />
      </Fab>
      <Box
        sx={{
          ml: 1,
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 3,
          whiteSpace: 'nowrap',
          maxWidth: hover ? 220 : 0,
          opacity: hover ? 1 : 0,
          overflow: 'hidden',
          transition: 'all .25s ease',
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, display: 'block' }}
        >
          Chat on WhatsApp
        </Typography>
        <Typography variant="caption" color="text.secondary">
          +91 {brand.contact.whatsapp}
        </Typography>
      </Box>
    </Box>
  )
}
