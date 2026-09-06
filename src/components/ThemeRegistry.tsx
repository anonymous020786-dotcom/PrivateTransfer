'use client'

import * as React from 'react'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import GlobalStyles from '@mui/material/GlobalStyles'
import { buildTheme } from '../theme'
import { SettingsProvider, useSettings } from './settings/SettingsContext'

function a11yGlobalStyles() {
  return {
    ':root': {
      '--zync-letter-spacing': '0em',
      '--zync-line-height': '1.5',
      '--zync-word-spacing': '0px',
    },
    'html, body': { height: '100dvh' },
    body: {
      minHeight: '100dvh',
      letterSpacing: 'var(--zync-letter-spacing)',
      wordSpacing: 'var(--zync-word-spacing)',
    },
    p: { lineHeight: 'var(--zync-line-height)' },
    '@keyframes filepizza-spin': {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    '.filepizza-spin-slow': { animation: 'filepizza-spin 16s linear infinite' },

    // Accessibility preference hooks (driven by <html data-*> attributes)
    'html[data-contrast="high"]': { filter: 'contrast(1.25)' },
    'html[data-saturation="muted"]': { filter: 'saturate(0.6)' },
    'html[data-saturation="grayscale"]': { filter: 'grayscale(1)' },
    'html[data-motion="reduced"] *': {
      animationDuration: '0.001ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.001ms !important',
      scrollBehavior: 'auto !important',
    },
    'html[data-underline-links="true"] a': { textDecoration: 'underline' },
    'html[data-highlight-links="true"] a': {
      outline: '2px solid #f59e0b',
      outlineOffset: '2px',
      borderRadius: '2px',
    },
    'html[data-highlight-headings="true"] :is(h1,h2,h3,h4,h5,h6)': {
      backgroundColor: 'rgba(245,158,11,0.18)',
    },
    'html[data-big-cursor="true"], html[data-big-cursor="true"] *': {
      cursor:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M6 2l30 18-13 3 8 16-6 3-8-16-11 9z' fill='black' stroke='white' stroke-width='2'/%3E%3C/svg%3E\") 4 2, auto",
    },
    'html[data-focus-ring="true"] :focus-visible': {
      outline: '3px solid #6366f1 !important',
      outlineOffset: '2px !important',
    },
    'html[data-hide-images="true"] img': { visibility: 'hidden' },
    'html[data-text-align="left"] p': { textAlign: 'left' },
    'html[data-text-align="justify"] p': { textAlign: 'justify' },
    'html[data-dyslexia-spacing="true"] body': {
      letterSpacing: '0.06em',
      wordSpacing: '0.16em',
      lineHeight: 1.8,
    },
    'html[data-invert="true"]': { filter: 'invert(1) hue-rotate(180deg)' },
    'html[data-invert="true"] img, html[data-invert="true"] video': {
      filter: 'invert(1) hue-rotate(180deg)',
    },
    'html[data-bigger-targets="true"] :is(button, a, [role="button"], .MuiIconButton-root)':
      {
        minHeight: '44px',
        minWidth: '44px',
      },
    'html[data-highlight-hover="true"] :is(a, button, [role="button"]):hover': {
      outline: '2px solid #6366f1',
      outlineOffset: '2px',
    },
    'html[data-hide-backgrounds="true"] *': {
      backgroundImage: 'none !important',
    },
  }
}

function DynamicTheme({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  const { settings } = useSettings()
  const theme = React.useMemo(() => buildTheme(settings), [settings])
  return (
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <GlobalStyles styles={a11yGlobalStyles()} />
      {children}
    </ThemeProvider>
  )
}

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <SettingsProvider>
        <DynamicTheme>{children}</DynamicTheme>
      </SettingsProvider>
    </AppRouterCacheProvider>
  )
}
