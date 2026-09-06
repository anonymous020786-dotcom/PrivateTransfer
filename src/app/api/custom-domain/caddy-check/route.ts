import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from '../../../../redisClient'

export const dynamic = 'force-dynamic'

// Called by Caddy on-demand TLS before issuing a cert for a custom domain.
// Returns 200 if the domain is a verified custom domain, 403 otherwise.
// Caddy will only provision a cert if this returns 2xx.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain)
    return NextResponse.json({ error: 'Missing domain.' }, { status: 400 })

  const redis = getRedisClient()
  const userId = await redis.get(
    `customdomain:lookup:${domain.toLowerCase().trim()}`,
  )
  if (!userId)
    return NextResponse.json(
      { error: 'Not a verified custom domain.' },
      { status: 403 },
    )

  return NextResponse.json({ ok: true })
}
