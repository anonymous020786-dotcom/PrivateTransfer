import { NextRequest, NextResponse } from 'next/server'
import { getTransfer } from '../../../../../lib/transfer'
import {
  deliverWebhook,
  listDeliveries,
  webhookSecretFor,
} from '../../../../../lib/webhooks'
import { getSupabaseServerClient } from '../../../../../supabase/server'
import { rateLimit, getClientIp } from '../../../../../rateLimit'

export const dynamic = 'force-dynamic'

async function ownedTransfer(slug: string) {
  const transfer = await getTransfer(slug)
  if (!transfer)
    return {
      error: NextResponse.json({ error: 'Not found.' }, { status: 404 }),
    }
  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  if (!transfer.ownerId || transfer.ownerId !== user?.id)
    return {
      error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }),
    }
  return { transfer }
}

// Owner view: signing secret + recent delivery attempts.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const r = await ownedTransfer(slug)
  if (r.error) return r.error
  return NextResponse.json({
    webhookUrl: r.transfer.webhookUrl,
    slackWebhookUrl: r.transfer.slackWebhookUrl,
    signingSecret: webhookSecretFor(r.transfer.ownerId, slug),
    deliveries: await listDeliveries(slug),
  })
}

// Send a `webhook.test` event to the configured endpoint.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const r = await ownedTransfer(slug)
  if (r.error) return r.error
  if (!r.transfer.webhookUrl)
    return NextResponse.json(
      { error: 'No webhook URL is set.' },
      { status: 400 },
    )
  const rl = await rateLimit(`webhook-test:${getClientIp(req)}`, {
    limit: 10,
    windowSeconds: 60,
  })
  if (!rl.success)
    return NextResponse.json(
      { error: 'Too many test deliveries.' },
      { status: 429 },
    )

  const delivery = await deliverWebhook({
    url: r.transfer.webhookUrl,
    slug,
    ownerId: r.transfer.ownerId,
    event: 'webhook.test',
    payload: {
      slug,
      title: r.transfer.title,
      message: 'This is a test delivery from Zync.',
    },
  })
  return NextResponse.json({ delivery })
}
