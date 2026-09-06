'use client'

import * as React from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Container from '@mui/material/Container'
import MenuIcon from '@mui/icons-material/Menu'
import TuneIcon from '@mui/icons-material/Tune'
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew'
import Tooltip from '@mui/material/Tooltip'
import { Link as ViewTransitionLink } from 'next-view-transitions'
import Logo from './Logo'
import ModeToggle from './ModeToggle'
import AccountButton from './AccountButton'
import { useSettings } from './settings/SettingsContext'

const NAV: Array<{ label: string; href: string }> = [
  { label: 'Send', href: '/send' },
  { label: 'Transfer', href: '/transfer' },
  { label: 'My Transfers', href: '/transfer/history' },
  { label: 'Collect', href: '/collect' },
  { label: 'Boards', href: '/boards' },
  { label: 'Workspaces', href: '/workspaces' },
  { label: 'Tools', href: '/tools' },
  { label: 'Features', href: '/#features' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function Header(): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const { openPanel } = useSettings()

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="default"
      sx={{
        backdropFilter: 'blur(10px)',
        bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.8)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 1 }}>
          <Box
            component={ViewTransitionLink}
            href="/"
            sx={{ display: 'flex', textDecoration: 'none' }}
            aria-label="Zync home"
          >
            <Logo size={34} />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
            {NAV.map((item) => (
              <Button
                key={item.href}
                component={ViewTransitionLink}
                href={item.href}
                color="inherit"
                sx={{ fontWeight: 600 }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <Tooltip title="Appearance & themes">
            <IconButton
              size="small"
              aria-label="Open appearance settings"
              onClick={() => openPanel(0)}
            >
              <TuneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Accessibility">
            <IconButton
              size="small"
              aria-label="Open accessibility settings"
              onClick={() => openPanel(1)}
            >
              <AccessibilityNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <ModeToggle />
          <AccountButton />

          <Button
            component={ViewTransitionLink}
            href="/send"
            variant="contained"
            sx={{ display: { xs: 'none', sm: 'inline-flex' }, ml: 1 }}
          >
            Send a file
          </Button>

          <IconButton
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </Container>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation">
          <Box sx={{ p: 2 }}>
            <Logo size={30} />
          </Box>
          <List>
            {NAV.map((item) => (
              <ListItem key={item.href} disablePadding>
                <ListItemButton
                  component={ViewTransitionLink}
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  )
}
