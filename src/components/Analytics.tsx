'use client'

import * as React from 'react'
import Script from 'next/script'
import { useConsent } from './consent/ConsentContext'

// Google Analytics 4 loader. Renders nothing unless NEXT_PUBLIC_GA_ID is set
// AND the visitor has granted analytics consent — so the app runs cleanly in
// development and respects the cookie banner.
export default function Analytics(): React.ReactElement | null {
  const { analyticsAllowed } = useConsent()
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  if (!gaId || !analyticsAllowed) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  )
}
