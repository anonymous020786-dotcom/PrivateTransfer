'use client'

import * as React from 'react'

// A comprehensive theme + accessibility preference store. Theme-affecting
// values feed the dynamic MUI theme; accessibility values are applied as
// data-attributes / CSS variables on <html> and styled globally. Everything is
// persisted to localStorage so preferences survive reloads.

export const PRIMARY_PRESETS: Record<string, string> = {
  indigo: '#6366f1',
  violet: '#8b5cf6',
  blue: '#3b82f6',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  emerald: '#10b981',
  green: '#22c55e',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  rose: '#f43f5e',
  pink: '#ec4899',
  slate: '#64748b',
}

export const FONT_FAMILIES: Record<string, string> = {
  system:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  inter: 'Inter, ui-sans-serif, system-ui, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  rounded: '"Segoe UI Rounded", "SF Pro Rounded", system-ui, sans-serif',
  dyslexic: '"Comic Sans MS", "OpenDyslexic", Verdana, sans-serif',
}

export type Settings = {
  // Theme
  mode: 'light' | 'dark' | 'system'
  primary: keyof typeof PRIMARY_PRESETS
  fontFamily: keyof typeof FONT_FAMILIES
  fontScale: number // 0.85 – 1.3
  radius: number // 0 – 24
  density: 'comfortable' | 'compact'
  // Accessibility
  contrast: 'normal' | 'high'
  saturation: 'normal' | 'muted' | 'grayscale'
  motion: 'normal' | 'reduced'
  letterSpacing: number // em
  lineHeight: number
  wordSpacing: number // px
  underlineLinks: boolean
  highlightLinks: boolean
  highlightHeadings: boolean
  bigCursor: boolean
  focusRing: boolean
  readingGuide: boolean
  hideImages: boolean
  textAlign: 'default' | 'left' | 'justify'
  dyslexiaSpacing: boolean
  pauseAnimations: boolean
  direction: 'ltr' | 'rtl'
  // Advanced accessibility
  invert: boolean
  biggerTargets: boolean
  highlightHover: boolean
  hideBackgrounds: boolean
}

// Curated theme presets — one click applies a coherent accent + shape + font.
export const THEME_PRESETS: Record<
  string,
  {
    label: string
    primary: keyof typeof PRIMARY_PRESETS
    radius: number
    fontFamily: keyof typeof FONT_FAMILIES
  }
> = {
  indigo: {
    label: 'Indigo',
    primary: 'indigo',
    radius: 12,
    fontFamily: 'system',
  },
  midnight: {
    label: 'Midnight',
    primary: 'violet',
    radius: 16,
    fontFamily: 'system',
  },
  ocean: { label: 'Ocean', primary: 'cyan', radius: 14, fontFamily: 'system' },
  emerald: {
    label: 'Emerald',
    primary: 'emerald',
    radius: 10,
    fontFamily: 'system',
  },
  sunset: {
    label: 'Sunset',
    primary: 'orange',
    radius: 18,
    fontFamily: 'rounded',
  },
  rose: { label: 'Rose', primary: 'rose', radius: 20, fontFamily: 'system' },
  slate: { label: 'Slate', primary: 'slate', radius: 8, fontFamily: 'system' },
  mono: { label: 'Mono', primary: 'slate', radius: 4, fontFamily: 'mono' },
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'system',
  primary: 'indigo',
  fontFamily: 'system',
  fontScale: 1,
  radius: 12,
  density: 'comfortable',
  contrast: 'normal',
  saturation: 'normal',
  motion: 'normal',
  letterSpacing: 0,
  lineHeight: 1.5,
  wordSpacing: 0,
  underlineLinks: false,
  highlightLinks: false,
  highlightHeadings: false,
  bigCursor: false,
  focusRing: false,
  readingGuide: false,
  hideImages: false,
  textAlign: 'default',
  dyslexiaSpacing: false,
  pauseAnimations: false,
  direction: 'ltr',
  invert: false,
  biggerTargets: false,
  highlightHover: false,
  hideBackgrounds: false,
}

const STORAGE_KEY = 'zync.settings.v1'

type SettingsContextValue = {
  settings: Settings
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  reset: () => void
  openPanel: (tab?: number) => void
  panelOpen: boolean
  setPanelOpen: (v: boolean) => void
  panelTab: number
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const ctx = React.useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export function SettingsProvider({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  const [settings, setSettings] = React.useState<Settings>(DEFAULT_SETTINGS)

  // Hydrate from localStorage once on mount.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
    } catch {
      // ignore
    }
  }, [])

  // Persist + apply accessibility prefs to <html> whenever settings change.
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // ignore
    }

    const el = document.documentElement
    el.dataset.contrast = settings.contrast
    el.dataset.saturation = settings.saturation
    el.dataset.motion = settings.pauseAnimations ? 'reduced' : settings.motion
    el.dataset.underlineLinks = String(settings.underlineLinks)
    el.dataset.highlightLinks = String(settings.highlightLinks)
    el.dataset.highlightHeadings = String(settings.highlightHeadings)
    el.dataset.bigCursor = String(settings.bigCursor)
    el.dataset.focusRing = String(settings.focusRing)
    el.dataset.hideImages = String(settings.hideImages)
    el.dataset.textAlign = settings.textAlign
    el.dataset.dyslexiaSpacing = String(settings.dyslexiaSpacing)
    el.dataset.invert = String(settings.invert)
    el.dataset.biggerTargets = String(settings.biggerTargets)
    el.dataset.highlightHover = String(settings.highlightHover)
    el.dataset.hideBackgrounds = String(settings.hideBackgrounds)
    el.setAttribute('dir', settings.direction)

    el.style.setProperty('--zync-letter-spacing', `${settings.letterSpacing}em`)
    el.style.setProperty('--zync-line-height', String(settings.lineHeight))
    el.style.setProperty('--zync-word-spacing', `${settings.wordSpacing}px`)
  }, [settings])

  const update = React.useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((s) => ({ ...s, [key]: value }))
    },
    [],
  )

  const reset = React.useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  const [panelOpen, setPanelOpen] = React.useState(false)
  const [panelTab, setPanelTab] = React.useState(0)
  const openPanel = React.useCallback((tab = 0) => {
    setPanelTab(tab)
    setPanelOpen(true)
  }, [])

  const value = React.useMemo(
    () => ({
      settings,
      update,
      reset,
      openPanel,
      panelOpen,
      setPanelOpen,
      panelTab,
    }),
    [settings, update, reset, openPanel, panelOpen, panelTab],
  )

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}
