import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateChannelRepo } from '../../../../../channel'
import { getStatsStore } from '../../../../../stats'
import {
  registerViewer,
  removeViewer,
  recordDownload,
  getPresence,
} from '../../../../../presence'

// Viewer/download lifecycle for a channel ("room").
// action: 'view'     — register/heartbeat a viewer on the download page
//         'leave'    — viewer left
//         'download' — a download has started (enforces maxDownloads cap)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const { viewerId, action = 'view' } = await request.json().catch(() => ({}))

  if (!viewerId || typeof viewerId !== 'string') {
    return NextResponse.json({ error: 'viewerId is required' }, { status: 400 })
  }

  const channel = await getOrCreateChannelRepo().fetchChannel(slug)
  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  if (action === 'leave') {
    await removeViewer(channel.shortSlug, viewerId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'download') {
    const presence = await getPresence(channel.shortSlug)
    if (channel.maxDownloads && presence.downloads >= channel.maxDownloads) {
      return NextResponse.json(
        { error: 'This room has reached its download limit.', capped: true },
        { status: 423 },
      )
    }
    const downloads = await recordDownload(channel.shortSlug)
    await getStatsStore().recordDownloadStarted()
    return NextResponse.json({ ok: true, downloads })
  }

  // Default: register/heartbeat a viewer.
  await registerViewer(channel.shortSlug, viewerId)
  const presence = await getPresence(channel.shortSlug)
  return NextResponse.json({ ok: true, presence })
}
