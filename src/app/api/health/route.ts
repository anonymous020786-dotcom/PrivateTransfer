import { NextResponse } from 'next/server'
import { getRedisClient } from '../../../redisClient'

export const dynamic = 'force-dynamic'

const STARTED_AT = Date.now()

// Live health/status endpoint. The footer BuildInfo strip polls this so the
// "operational" indicator reflects the real server (and Redis) state instead of
// a static label.
export async function GET(): Promise<NextResponse> {
  let redis: 'ok' | 'down' | 'off' = 'off'
  if (process.env.REDIS_URL) {
    try {
      const pong = await getRedisClient().ping()
      redis = pong === 'PONG' ? 'ok' : 'down'
    } catch {
      redis = 'down'
    }
  }

  return NextResponse.json(
    {
      status: redis === 'down' ? 'degraded' : 'ok',
      redis,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
      commit: process.env.NEXT_PUBLIC_COMMIT_SHA || 'dev',
      buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || null,
      serverUptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000),
      time: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
