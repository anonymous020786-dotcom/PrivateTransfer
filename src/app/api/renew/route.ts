import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateChannelRepo } from '../../../channel'
import { heartbeatUploader } from '../../../presence'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { slug, secret } = await request.json()

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  if (!secret) {
    return NextResponse.json({ error: 'Secret is required' }, { status: 400 })
  }

  const success = await getOrCreateChannelRepo().renewChannel(slug, secret)

  // A successful renew doubles as an uploader heartbeat for live presence.
  if (success) {
    await heartbeatUploader(slug)
  }

  return NextResponse.json({ success })
}
