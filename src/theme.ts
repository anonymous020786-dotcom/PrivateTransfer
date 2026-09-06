'use client'

import { createTheme, type Theme } from '@mui/material/styles'
import {
  PRIMARY_PRESETS,
  FONT_FAMILIES,
  type Settings,
} from './components/settings/SettingsContext'

// Builds a MUI theme from user settings (primary color, font, scale, radius,
// density). Color mode itself is handled by MUI's CSS-variable color schemes.
export function buildTheme(settings: Settings): Theme {
  const primary = PRIMARY_PRESETS[settings.primary] ?? PRIMARY_PRESETS.indigo
  const fontFamily = FONT_FAMILIES[settings.fontFamily] ?? FONT_FAMILIES.system
  const compact = settings.density === 'compact'

  return createTheme({
    cssVariables: { colorSchemeSelector: 'class' },
    direction: settings.direction,
    colorSchemes: {
      light: {
        palette: {
          primary: { main: primary },
          secondary: { main: '#a855f7' },
          success: { main: '#16a34a' },
          background: { default: '#f8fafc', paper: '#ffffff' },
          text: { primary: '#0f172a', secondary: '#475569' },
        },
      },
      dark: {
        palette: {
          primary: { main: primary },
          secondary: { main: '#c084fc' },
          success: { main: '#22c55e' },
          background: { default: '#0b1120', paper: '#111827' },
          text: { primary: '#f8fafc', secondary: '#94a3b8' },
        },
      },
    },
    shape: { borderRadius: settings.radius },
    spacing: compact ? 6 : 8,
    typography: {
      fontFamily,
      fontSize: 14 * settings.fontScale,
      button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
      MuiButton: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    },
  })
}
