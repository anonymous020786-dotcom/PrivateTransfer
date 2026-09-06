import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateChannelRepo } from '../../../channel'
import { getStatsStore } from '../../../stats'
import { heartbeatUploader } from '../../../presence'
import { rateLimit, getClientIp, rateLimitHeaders } from '../../../rateLimit'
import {
  SESSION_COOKIE,
  parseSession,
  createSession,
  buildSessionCookie,
} from '../../../auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Per-IP rate limiting to curb abuse / automated channel spam.
  const ip = getClientIp(request)
  const limit = await rateLimit(`create:${ip}`, {
    limit: 20,
    windowSeconds: 60,
  })
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many channels created. Please slow down.' },
      { status: 429, headers: rateLimitHeaders(limit) },
    )
  }

  const body = await request.json().catch(() => ({}))
  const { uploaderPeerID, title, note, maxDownloads, ttl } = body

  if (!uploaderPeerID || typeof uploaderPeerID !== 'string') {
    return NextResponse.json(
      { error: 'Uploader peer ID is required' },
      { status: 400 },
    )
  }

  // Resolve (or mint) the anonymous session — foundation for optional accounts.
  let session = parseSession(request.cookies.get(SESSION_COOKIE)?.value)
  const isNewSession = !session
  if (!session) session = createSession()

  // Clamp TTL to 1h–7d range.
  const VALID_TTLS = [3600, 21600, 86400, 259200, 604800]
  const resolvedTtl = VALID_TTLS.includes(Number(ttl)) ? Number(ttl) : undefined

  const channel = await getOrCreateChannelRepo().createChannel(uploaderPeerID, {
    title: typeof title === 'string' ? title.slice(0, 120) : undefined,
    note: typeof note === 'string' ? note.slice(0, 500) : undefined,
    maxDownloads:
      Number.isInteger(maxDownloads) && maxDownloads > 0
        ? maxDownloads
        : undefined,
    ttl: resolvedTtl,
    ownerSessionId: session.id,
  })

  // Record stats + mark the uploader online for live presence.
  await Promise.all([
    getStatsStore().recordChannelCreated(),
    heartbeatUploader(channel.shortSlug),
  ])

  const response = NextResponse.json(channel, {
    headers: rateLimitHeaders(limit),
  })
  if (isNewSession) {
    const cookie = buildSessionCookie(session)
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}
