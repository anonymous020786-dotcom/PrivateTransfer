import * as React from 'react'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Consistent header + content container for marketing/legal pages.
export default function PageShell({
  title,
  subtitle,
  maxWidth = 'md',
  updated,
  children,
}: {
  title: string
  subtitle?: string
  maxWidth?: 'sm' | 'md' | 'lg'
  updated?: string
  children?: React.ReactNode
}): React.ReactElement {
  return (
    <Box>
      <Box
        sx={{
          background:
            'radial-gradient(900px 300px at 50% -20%, rgba(99,102,241,0.15), transparent)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container
          maxWidth={maxWidth}
          sx={{ py: { xs: 6, md: 8 }, textAlign: 'center' }}
        >
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mt: 1.5, fontWeight: 400 }}
            >
              {subtitle}
            </Typography>
          )}
          {updated && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Last updated: {updated}
            </Typography>
          )}
        </Container>
      </Box>
      <Container
        maxWidth={maxWidth}
        sx={{
          py: { xs: 5, md: 7 },
          '& h2': { fontSize: '1.5rem', fontWeight: 700, mt: 4, mb: 1.5 },
          '& h3': { fontSize: '1.15rem', fontWeight: 700, mt: 3, mb: 1 },
          '& p': { color: 'text.secondary', mb: 2, lineHeight: 1.7 },
          '& ul': { color: 'text.secondary', mb: 2, pl: 3, lineHeight: 1.7 },
          '& li': { mb: 0.5 },
          '& a': { color: 'primary.main' },
        }}
      >
        {children}
      </Container>
    </Box>
  )
}
