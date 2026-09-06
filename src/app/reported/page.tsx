import { JSX } from 'react'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { Link as ViewTransitionLink } from 'next-view-transitions'
import TransferSpinner from '../../components/TransferSpinner'
import TitleText from '../../components/TitleText'
import { brand } from '../../brand'

export const metadata = {
  title: 'Transfer halted',
  description: 'This transfer has been halted pending review.',
}

export default function ReportedPage(): JSX.Element {
  return (
    <Stack
      spacing={2.5}
      sx={{
        alignItems: 'center',
        py: 8,
        px: 2,
        maxWidth: 480,
        mx: 'auto',
        width: '100%',
      }}
    >
      <TransferSpinner direction="down" />
      <TitleText>This transfer has been halted.</TitleText>
      <Paper variant="outlined" sx={{ px: 4, py: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Message from the team
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This transfer has been paused for a potential violation of our
          Acceptable Use Policy. Our team is reviewing it to keep {brand.name}{' '}
          safe for everyone.
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontStyle: 'italic' }}
        >
          — The {brand.name} Team
        </Typography>
      </Paper>
      <Button component={ViewTransitionLink} href="/" variant="contained">
        Back to home
      </Button>
    </Stack>
  )
}
