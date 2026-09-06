import React from 'react'
import type { Metadata, Viewport } from 'next'
import Box from '@mui/material/Box'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ThemeRegistry from '../components/ThemeRegistry'
import FilePizzaQueryClientProvider from '../components/QueryClientProvider'
import { ViewTransitions } from 'next-view-transitions'
import { brand } from '../brand'
import Analytics from '../components/Analytics'
import SettingsPanel from '../components/settings/SettingsPanel'
import BackToTop from '../components/BackToTop'
import WhatsAppFab from '../components/WhatsAppFab'
import CookieConsent from '../components/consent/CookieConsent'
import { ConsentProvider } from '../components/consent/ConsentContext'
import WelcomeDialog from '../components/WelcomeDialog'

// Pre-hydration color-scheme init. Mirrors MUI's class-based color scheme
// (storage key: mui-mode; classes: light / dark) and runs before paint to
// prevent a flash of the wrong theme.
const THEME_INIT = `(function(){try{var m=localStorage.getItem('mui-mode')||'system';var d=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;var c=document.documentElement.classList;c.remove('light','dark');c.add(d);}catch(e){}})();`

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: {
    default: `${brand.name} • ${brand.tagline}`,
    template: `%s • ${brand.name}`,
  },
  description: brand.shortDescription,
  applicationName: brand.name,
  authors: [{ name: brand.credits.author }],
  keywords: [
    'file transfer',
    'peer to peer',
    'p2p',
    'webrtc',
    'send files',
    'private file sharing',
    'encrypted file transfer',
    brand.name,
  ],
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
  openGraph: {
    type: 'website',
    url: brand.url,
    siteName: brand.name,
    title: `${brand.name} • ${brand.tagline}`,
    description: brand.shortDescription,
    locale: brand.locale,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${brand.name} • ${brand.tagline}`,
    description: brand.shortDescription,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: brand.themeColor,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <ViewTransitions>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/*
            Pre-hydration color-scheme init (prevents a flash of the wrong
            theme). Inlined via dangerouslySetInnerHTML in <head> — the
            next-themes pattern. React 19 only warns about EXTERNAL `<script
            src>` rendered in a component; an inline script is injected into the
            initial HTML and runs before hydration with no warning.
          */}
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
          {/*
            Manifest is emitted manually (not via metadata.manifest) so we can
            set crossOrigin="use-credentials". Behind Cloudflare the credential-
            less manifest fetch can't run CF's JS challenge and gets a 403;
            requesting it with credentials sends the CF clearance cookie.
          */}
          <link
            rel="manifest"
            href="/manifest.webmanifest"
            crossOrigin="use-credentials"
          />
        </head>
        <body>
          <ThemeRegistry>
            <ConsentProvider>
              <FilePizzaQueryClientProvider>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100dvh',
                  }}
                >
                  <Header />
                  <Box
                    component="main"
                    sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                  >
                    {children}
                  </Box>
                  <Footer />
                </Box>
                <SettingsPanel />
                <WhatsAppFab />
                <BackToTop />
                <CookieConsent />
                <WelcomeDialog />
              </FilePizzaQueryClientProvider>
              <Analytics />
            </ConsentProvider>
          </ThemeRegistry>
        </body>
      </html>
    </ViewTransitions>
  )
}
