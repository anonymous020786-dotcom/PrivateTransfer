'use client'

import * as React from 'react'

// Registers /sw.js site-wide so the installed PWA can receive files from the
// OS share sheet. It is the same worker StreamSaver registers for P2P
// downloads, so registering it here is idempotent.
export default function ServiceWorkerRegistrar(): null {
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production' && !window.isSecureContext) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  }, [])
  return null
}
