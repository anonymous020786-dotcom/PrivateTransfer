import type { MetadataRoute } from 'next'
import { brand } from '../brand'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: brand.shortDescription,
    start_url: '/transfer',
    display: 'standalone',
    background_color: '#0b1120',
    theme_color: brand.themeColor,
    orientation: 'portrait-primary',
    categories: ['utilities', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      {
        src: '/api/icon/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/icon/maskable',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Send files',
        short_name: 'Send',
        description: 'Upload files and get a shareable link',
        url: '/transfer',
        icons: [{ src: '/api/icon/192', sizes: '192x192' }],
      },
      {
        name: 'My transfers',
        short_name: 'History',
        description: 'View your active file transfers',
        url: '/transfer/history',
        icons: [{ src: '/api/icon/192', sizes: '192x192' }],
      },
      {
        name: 'Request files (Collect)',
        short_name: 'Collect',
        description: 'Create a file request link so others can upload to you',
        url: '/collect',
        icons: [{ src: '/api/icon/192', sizes: '192x192' }],
      },
      {
        name: 'Tools',
        short_name: 'Tools',
        description: 'In-browser file tools — image, PDF, text, video',
        url: '/tools',
        icons: [{ src: '/api/icon/192', sizes: '192x192' }],
      },
    ],
    screenshots: [],
    share_target: {
      action: '/transfer',
      method: 'GET',
      params: { title: 'title', text: 'text', url: 'url' },
    },
    protocol_handlers: [],
    prefer_related_applications: false,
    related_applications: [],
  }
}
