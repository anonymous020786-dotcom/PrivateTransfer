'use client'

import * as React from 'react'

export type Consent = {
  necessary: true
  analytics: boolean
}

type ConsentState = {
  consent: Consent | null // null until the user decides
  decided: boolean
  analyticsAllowed: boolean
  save: (analytics: boolean) => void
  reopen: () => void
  bannerOpen: boolean
}

const STORAGE_KEY = 'zync.consent.v1'
const ConsentContext = React.createContext<ConsentState | null>(null)

export function useConsent(): ConsentState {
  const ctx = React.useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider')
  return ctx
}

export function ConsentProvider({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  const [consent, setConsent] = React.useState<Consent | null>(null)
  const [hydrated, setHydrated] = React.useState(false)
  const [bannerOpen, setBannerOpen] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setConsent(JSON.parse(raw))
      else setBannerOpen(true)
    } catch {
      setBannerOpen(true)
    }
    setHydrated(true)
  }, [])

  const save = React.useCallback((analytics: boolean) => {
    const next: Consent = { necessary: true, analytics }
    setConsent(next)
    setBannerOpen(false)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }, [])

  const reopen = React.useCallback(() => setBannerOpen(true), [])

  const value = React.useMemo<ConsentState>(
    () => ({
      consent,
      decided: hydrated && consent !== null,
      analyticsAllowed: consent?.analytics === true,
      save,
      reopen,
      bannerOpen: hydrated && bannerOpen,
    }),
    [consent, hydrated, bannerOpen, save, reopen],
  )

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  )
}
