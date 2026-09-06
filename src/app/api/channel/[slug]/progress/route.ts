import { NextRequest, NextResponse } from 'next/server'
import { saveProgress, getProgress } from '../../../../../progress'

// Resumable-transfer offsets for a (channel, downloader).
// GET  ?downloaderId=...           -> { progress: { [fileName]: offset } }
// POST { downloaderId, fileName, offset } -> persists last received offset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const downloaderId = request.nextUrl.searchParams.get('downloaderId')
  if (!downloaderId) {
    return NextResponse.json(
      { error: 'downloaderId is required' },
      { status: 400 },
    )
  }
  const progress = await getProgress(slug, downloaderId)
  return NextResponse.json({ progress })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const { downloaderId, fileName, offset } = await request
    .json()
    .catch(() => ({}))

  if (
    !downloaderId ||
    typeof fileName !== 'string' ||
    !Number.isFinite(offset)
  ) {
    return NextResponse.json(
      { error: 'downloaderId, fileName and offset are required' },
      { status: 400 },
    )
  }

  await saveProgress(slug, downloaderId, fileName, Math.max(0, offset))
  return NextResponse.json({ ok: true })
}
