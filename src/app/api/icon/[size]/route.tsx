import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> },
): Promise<Response> {
  const { size } = await params
  const px = size === '512' ? 512 : size === 'maskable' ? 512 : 192

  return new ImageResponse(
    <div
      style={{
        width: px,
        height: px,
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: px * 0.2,
      }}
    >
      <div
        style={{
          color: 'white',
          fontSize: Math.round(px * 0.55),
          fontWeight: 900,
          fontFamily: 'sans-serif',
          letterSpacing: '-0.04em',
        }}
      >
        Z
      </div>
    </div>,
    { width: px, height: px },
  )
}
