import { JSX } from 'react'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import { Link as ViewTransitionLink } from 'next-view-transitions'
import TransferSpinner from '../components/TransferSpinner'
import TitleText from '../components/TitleText'
import { brand } from '../brand'

export const metadata = {
  title: '404 — Not found',
  description: `The page you are looking for could not be found on ${brand.name}.`,
}

export default function NotFound(): JSX.Element {
  return (
    <Stack
      spacing={2.5}
      sx={{
        alignItems: 'center',
        py: 8,
        px: 2,
        maxWidth: 672,
        mx: 'auto',
        width: '100%',
      }}
    >
      <TransferSpinner direction="down" />
      <TitleText>404 — this link has expired or never existed.</TitleText>
      <Button component={ViewTransitionLink} href="/" variant="contained">
        Back to home
      </Button>
    </Stack>
  )
}
