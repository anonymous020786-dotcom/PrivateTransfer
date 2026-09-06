import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getTransfer } from '../../../../../lib/transfer'
import { brand } from '../../../../../brand'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${n} B`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params
  const transfer = await getTransfer(slug)

  const title = transfer?.title || 'Shared files'
  const fileCount = transfer?.files.length ?? 0
  const totalSize = transfer ? formatBytes(transfer.totalSize) : ''
  const label = `${fileCount} file${fileCount !== 1 ? 's' : ''}${totalSize ? ` · ${totalSize}` : ''}`

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        background:
          'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '72px 80px',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: 64,
          height: 64,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 40,
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: '-0.04em',
          }}
        >
          Z
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          color: 'white',
          fontSize: title.length > 40 ? 48 : 64,
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: 24,
          maxWidth: 900,
        }}
      >
        {title.length > 60 ? title.slice(0, 57) + '…' : title}
      </div>

      {/* File info */}
      <div
        style={{
          color: '#a5b4fc',
          fontSize: 32,
          fontWeight: 500,
          marginBottom: 48,
        }}
      >
        {label}
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 56,
          left: 80,
          right: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ color: '#818cf8', fontSize: 24, fontWeight: 600 }}>
          {brand.name}
        </div>
        <div
          style={{
            background: '#6366f1',
            color: 'white',
            fontSize: 22,
            fontWeight: 700,
            padding: '10px 28px',
            borderRadius: 40,
          }}
        >
          Download files
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}
