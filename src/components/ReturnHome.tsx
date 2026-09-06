import { Link as ViewTransitionLink } from 'next-view-transitions'
import { JSX } from 'react'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'

export default function ReturnHome(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Link
        component={ViewTransitionLink}
        href="/"
        underline="hover"
        sx={{ color: 'text.secondary' }}
      >
        Back to home &raquo;
      </Link>
    </Box>
  )
}
