import type { Metadata } from 'next'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import { brand } from '../../brand'
import OfflineReloadButton from '../../components/OfflineReloadButton'

export const metadata: Metadata = {
  title: 'Offline',
  robots: { index: false },
}

export default function OfflinePage(): React.ReactElement {
  return (
    <Container
      maxWidth="sm"
      sx={{ py: { xs: 8, md: 14 }, textAlign: 'center' }}
    >
      <Stack spacing={3} sx={{ alignItems: 'center' }}>
        <WifiOffIcon sx={{ fontSize: 72, color: 'text.secondary' }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          You&apos;re offline
        </Typography>
        <Typography color="text.secondary">
          {brand.name} needs an internet connection to upload and download
          files. Check your connection and try again.
        </Typography>
        <OfflineReloadButton />
      </Stack>
    </Container>
  )
}
