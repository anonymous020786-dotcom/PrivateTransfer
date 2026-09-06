import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { setTurnCredentials } from '../../../coturn'

const turnHost = process.env.TURN_HOST || '127.0.0.1'
const stunServer = process.env.STUN_SERVER || 'stun:stun.l.google.com:19302'
const peerjsHost = process.env.PEERJS_HOST || '0.peerjs.com'
const peerjsPath = process.env.PEERJS_PATH || '/'

type IceServer = {
  urls: string | string[]
  username?: string
  credential?: string
}

// A few reliable public STUN servers for redundancy.
const PUBLIC_STUN: IceServer[] = [
  { urls: stunServer },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

// Metered "Open Relay" free public TURN (published for free use). Gives working
// NAT traversal out of the box with no account/credit card. Disable with
// DISABLE_FREE_TURN=true, or override with your own TURN_URLS.
const FREE_OPEN_RELAY: IceServer[] = [
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

export async function POST(): Promise<NextResponse> {
  const iceServers: IceServer[] = [...PUBLIC_STUN]

  // Mode 1 — Custom static TURN (e.g. your own Metered key, Twilio, Cloudflare).
  const staticUrls = process.env.TURN_URLS
  if (staticUrls) {
    iceServers.push({
      urls: staticUrls
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean),
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    })
    return NextResponse.json({ host: peerjsHost, path: peerjsPath, iceServers })
  }

  // Mode 2 — Self-hosted coturn with ephemeral credentials stored in Redis.
  if (process.env.COTURN_ENABLED) {
    const username = crypto.randomBytes(8).toString('hex')
    const password = crypto.randomBytes(8).toString('hex')
    const ttl = 86400 // 24 hours
    await setTurnCredentials(username, password, ttl)
    iceServers.push({
      urls: [`turn:${turnHost}:3478`, `turns:${turnHost}:5349`],
      username,
      credential: password,
    })
    return NextResponse.json({ host: peerjsHost, path: peerjsPath, iceServers })
  }

  // Mode 3 — Default: free public TURN (Open Relay) + STUN. Works with no setup.
  if (process.env.DISABLE_FREE_TURN !== 'true') {
    iceServers.push(...FREE_OPEN_RELAY)
  }
  return NextResponse.json({ host: peerjsHost, path: peerjsPath, iceServers })
}
