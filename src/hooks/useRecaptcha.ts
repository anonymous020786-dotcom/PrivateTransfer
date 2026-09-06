'use client'
import * as React from 'react'

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, opts: { action: string }) => Promise<string>
    }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

export function useRecaptcha() {
  React.useEffect(() => {
    if (!SITE_KEY || document.getElementById('recaptcha-v3')) return
    const s = document.createElement('script')
    s.id = 'recaptcha-v3'
    s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`
    s.async = true
    document.body.appendChild(s)
  }, [])

  const getToken = React.useCallback(
    async (action: string): Promise<string | undefined> => {
      if (!SITE_KEY || !window.grecaptcha) return undefined
      return new Promise((resolve) => {
        window.grecaptcha!.ready(() => {
          window
            .grecaptcha!.execute(SITE_KEY, { action })
            .then(resolve)
            .catch(() => resolve(undefined))
        })
      })
    },
    [],
  )

  return { getToken }
}
