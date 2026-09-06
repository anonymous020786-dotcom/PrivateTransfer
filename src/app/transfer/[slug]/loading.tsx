import * as React from 'react'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Skeleton from '@mui/material/Skeleton'

export default function TransferSlugLoading(): React.ReactElement {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Stack spacing={3}>
            {/* Header */}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Stack spacing={0.5}>
                <Skeleton variant="text" width={160} height={24} />
                <Skeleton variant="text" width={120} height={16} />
              </Stack>
            </Stack>
            {/* Chips */}
            <Stack direction="row" spacing={1}>
              {[90, 70, 80, 100].map((w, i) => (
                <Skeleton key={i} variant="rounded" width={w} height={24} />
              ))}
            </Stack>
            {/* File list */}
            {[1, 2, 3].map((i) => (
              <Stack
                key={i}
                direction="row"
                spacing={2}
                sx={{ alignItems: 'center' }}
              >
                <Skeleton variant="circular" width={32} height={32} />
                <Stack spacing={0.5} sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="30%" height={16} />
                </Stack>
                <Skeleton variant="rounded" width={100} height={36} />
              </Stack>
            ))}
            <Skeleton variant="rounded" height={48} />
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}
