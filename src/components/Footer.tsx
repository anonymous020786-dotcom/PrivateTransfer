'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import EmailIcon from '@mui/icons-material/Email'
import GitHubIcon from '@mui/icons-material/GitHub'
import { Link as ViewTransitionLink } from 'next-view-transitions'
import Logo from './Logo'
import BuildInfo from './BuildInfo'
import { brand } from '../brand'

const COLUMNS: Array<{
  title: string
  links: Array<{ label: string; href: string }>
}> = [
  {
    title: 'Product',
    links: [
      { label: 'Send a file', href: '/send' },
      { label: 'Transfer files', href: '/transfer' },
      { label: 'Free tools', href: '/tools' },
      { label: 'Features', href: '/#features' },
      { label: 'Welcome', href: '/welcome' },
      { label: 'Live stats', href: '/stats' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Acceptable Use', href: '/acceptable-use' },
      { label: 'DMCA', href: '/dmca' },
    ],
  },
]

export default function Footer(): React.ReactElement {
  const year = new Date().getFullYear()
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Logo size={32} />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2, maxWidth: 320 }}
            >
              {brand.shortDescription}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <IconButton
                component="a"
                href={brand.contact.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
                color="success"
              >
                <WhatsAppIcon />
              </IconButton>
              <IconButton
                component="a"
                href={`mailto:${brand.contact.email}`}
                aria-label="Email us"
                color="primary"
              >
                <EmailIcon />
              </IconButton>
              <IconButton
                component="a"
                href={brand.social.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <GitHubIcon />
              </IconButton>
            </Stack>
          </Grid>

          {COLUMNS.map((col) => (
            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={col.title}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                {col.title}
              </Typography>
              <Stack spacing={1}>
                {col.links.map((l) => (
                  <Link
                    key={l.href}
                    component={ViewTransitionLink}
                    href={l.href}
                    underline="hover"
                    color="text.secondary"
                    variant="body2"
                  >
                    {l.label}
                  </Link>
                ))}
              </Stack>
            </Grid>
          ))}

          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Get in touch
            </Typography>
            <Stack spacing={1}>
              <Link
                href={`mailto:${brand.contact.email}`}
                underline="hover"
                color="text.secondary"
                variant="body2"
              >
                {brand.contact.email}
              </Link>
              <Link
                href={brand.contact.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                color="text.secondary"
                variant="body2"
              >
                WhatsApp: +91 {brand.contact.whatsapp}
              </Link>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mb: 2 }}>
          <BuildInfo />
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="body2" color="text.secondary">
            © {year} {brand.name} by {brand.org.legalName}. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crafted by{' '}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {brand.credits.author}
            </Box>{' '}
            · built with {brand.credits.builtWith}
          </Typography>
        </Stack>
      </Container>
    </Box>
  )
}
