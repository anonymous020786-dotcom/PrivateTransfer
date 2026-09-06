import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateChannelRepo } from '../../../channel'
import { getStatsStore } from '../../../stats'
import { setUploaderOffline } from '../../../presence'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { slug, reason } = await request.json().catch(() => ({}))

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  // Anyone can destroy a channel if they know the slug. This enables a terms
  // violation reporter to destroy the channel after they report it.
  try {
    const repo = getOrCreateChannelRepo()
    const channel = await repo.fetchChannel(slug)
    await repo.destroyChannel(slug)

    await Promise.all([
      getStatsStore().recordChannelDestroyed(reason === 'reported'),
      channel ? setUploaderOffline(channel.shortSlug) : Promise.resolve(),
    ])

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to destroy channel' },
      { status: 500 },
    )
  }
}
