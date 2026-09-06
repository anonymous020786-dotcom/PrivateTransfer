'use client'

import * as React from 'react'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import ShareIcon from '@mui/icons-material/Share'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import EmailIcon from '@mui/icons-material/Email'
import { brand } from '../brand'

// Quick share actions for a generated transfer link: native OS share sheet
// (mobile), WhatsApp, and email. Falls back gracefully when the Web Share API
// isn't available.
export default function ShareButtons({
  url,
}: {
  url: string
}): React.ReactElement {
  const [canNativeShare, setCanNativeShare] = React.useState(false)
  React.useEffect(() => {
    setCanNativeShare(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    )
  }, [])

  const text = `I'm sharing a file with you via ${brand.name}: ${url}`
  const nativeShare = () =>
    navigator
      .share({
        title: `${brand.name} file transfer`,
        text: `Download the file I sent you on ${brand.name}.`,
        url,
      })
      .catch(() => {})

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
      {canNativeShare && (
        <Tooltip title="Share via your device">
          <Button
            variant="contained"
            size="small"
            startIcon={<ShareIcon />}
            onClick={nativeShare}
          >
            Share
          </Button>
        </Tooltip>
      )}
      <Button
        variant="outlined"
        size="small"
        startIcon={<WhatsAppIcon />}
        sx={{ color: '#1ebe5b', borderColor: '#1ebe5b' }}
        component="a"
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp
      </Button>
      <Button
        variant="outlined"
        size="small"
        startIcon={<EmailIcon />}
        component="a"
        href={`mailto:?subject=${encodeURIComponent(`A file for you via ${brand.name}`)}&body=${encodeURIComponent(text)}`}
      >
        Email
      </Button>
    </Stack>
  )
}
