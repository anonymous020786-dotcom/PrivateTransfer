import { ImageResponse } from 'next/og'
import { brand } from '../brand'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = `${brand.name} — ${brand.tagline}`

export default function OgImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        background:
          'linear-gradient(135deg, #0b1120 0%, #1e1b4b 60%, #4c1d95 100%)',
        color: '#fff',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: 'linear-gradient(135deg,#6366f1,#a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 64,
            fontWeight: 800,
          }}
        >
          Z
        </div>
        <div style={{ fontSize: 64, fontWeight: 800 }}>{brand.name}</div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: 60,
          fontWeight: 800,
          marginTop: 48,
          lineHeight: 1.15,
        }}
      >
        <span>Send files straight from</span>
        <span>browser to browser.</span>
      </div>
      <div style={{ fontSize: 30, marginTop: 32, color: '#c7d2fe' }}>
        Private · Encrypted · No uploads · No size limits
      </div>
    </div>,
    size,
  )
}
