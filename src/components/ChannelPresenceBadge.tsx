'use client'

import * as React from 'react'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DownloadIcon from '@mui/icons-material/Download'
import { useChannelPresence } from '../hooks/useChannelPresence'

export default function ChannelPresenceBadge({
  slug,
}: {
  slug: string
}): React.ReactElement | null {
  const presence = useChannelPresence(slug)
  if (!presence) return null

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}
    >
      <Chip
        size="small"
        variant="outlined"
        color={presence.uploaderOnline ? 'success' : 'default'}
        label={presence.uploaderOnline ? 'Uploader online' : 'Uploader offline'}
        icon={
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              ml: 1,
              bgcolor: presence.uploaderOnline
                ? 'success.main'
                : 'text.disabled',
            }}
          />
        }
      />
      <Chip
        size="small"
        variant="outlined"
        icon={<VisibilityIcon sx={{ fontSize: 16 }} />}
        label={`${presence.viewers} viewing`}
      />
      <Chip
        size="small"
        variant="outlined"
        icon={<DownloadIcon sx={{ fontSize: 16 }} />}
        label={`${presence.downloads} downloads`}
      />
    </Stack>
  )
}
