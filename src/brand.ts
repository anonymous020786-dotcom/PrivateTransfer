// Single source of truth for brand identity, contact details and credits.
// Used across metadata, header, footer, structured data and pages.

export const brand = {
  name: 'Zync',
  tagline:
    'Unlimited peer-to-peer file transfers, beamed securely in your browser.',
  shortDescription:
    'Zync is a free, private, peer-to-peer file transfer tool with no file-size caps and no upload or download limits. Files stream directly between browsers over encrypted WebRTC — never stored on a server.',
  domain: 'zync.app',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://zync.app',
  themeColor: '#6366f1',
  locale: 'en_US',

  contact: {
    email: 'contact@zestcommere.in',
    whatsapp: '7492068998',
    whatsappIntl: '917492068998', // India country code + number
    whatsappLink: 'https://wa.me/917492068998',
  },

  social: {
    github: 'https://github.com/',
    twitter: 'https://twitter.com/',
  },

  credits: {
    author: 'Naushad Alam',
    authorRole: 'Founder & Engineer',
    builtWith: 'Claude',
  },

  org: {
    legalName: 'ZestCommerce',
    foundingYear: 2024,
  },
} as const

export type Brand = typeof brand
