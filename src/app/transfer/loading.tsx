import * as React from 'react'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Skeleton from '@mui/material/Skeleton'

export default function TransferLoading(): React.ReactElement {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={1} sx={{ mb: 3, alignItems: 'center' }}>
        <Skeleton variant="text" width={160} height={48} />
        <Skeleton variant="text" width={300} height={24} />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
          {[100, 80, 90, 140].map((w, i) => (
            <Skeleton key={i} variant="rounded" width={w} height={24} />
          ))}
        </Stack>
      </Stack>
      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Stack spacing={3}>
            {/* Upload zone skeleton */}
            <Skeleton variant="rounded" height={180} />
            <Skeleton variant="rounded" height={56} />
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}
