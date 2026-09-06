import { NextRequest } from 'next/server'
import { getPresence, subscribe } from '../../../../../presence'

export const dynamic = 'force-dynamic'

// Server-Sent Events stream of live channel presence (uploader online state,
// viewer count, downloads). Replaces client polling for status updates.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (event: string, data: unknown) => {
        if (closed) return
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        )
      }

      // Initial snapshot
      send('presence', await getPresence(slug))

      // Push on every presence change for this channel
      const unsubscribe = subscribe(slug, (p) => send('presence', p))

      // Keep-alive comment every 20s so proxies don't drop the connection
      const keepAlive = setInterval(() => {
        if (closed) return
        controller.enqueue(encoder.encode(`: keep-alive\n\n`))
      }, 20_000)

      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(keepAlive)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      request.signal.addEventListener('abort', cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
