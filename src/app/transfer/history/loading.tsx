import * as React from 'react'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Skeleton from '@mui/material/Skeleton'
import Divider from '@mui/material/Divider'

function TransferCardSkeleton(): React.ReactElement {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Stack spacing={0.5} sx={{ flex: 1 }}>
              <Skeleton variant="text" width="50%" height={24} />
              <Skeleton variant="text" width="70%" height={18} />
            </Stack>
            <Stack direction="row" spacing={0.5}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="circular" width={32} height={32} />
              ))}
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1}>
            {[70, 110, 90, 70].map((w, i) => (
              <Skeleton key={i} variant="rounded" width={w} height={24} />
            ))}
          </Stack>
          <Divider />
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Skeleton variant="text" width="55%" height={16} />
            <Skeleton variant="rounded" width={70} height={32} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function HistoryLoading(): React.ReactElement {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          mb: 4,
          alignItems: 'flex-start',
        }}
      >
        <Stack spacing={0.5}>
          <Skeleton variant="text" width={200} height={48} />
          <Skeleton variant="text" width={360} height={24} />
        </Stack>
        <Skeleton variant="rounded" width={130} height={40} />
      </Stack>
      <Stack spacing={2}>
        {[1, 2, 3].map((i) => (
          <TransferCardSkeleton key={i} />
        ))}
      </Stack>
    </Container>
  )
}
