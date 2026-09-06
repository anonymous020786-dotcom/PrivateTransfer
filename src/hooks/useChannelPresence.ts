'use client'

import { useEffect, useRef, useState } from 'react'

export type ChannelPresence = {
  uploaderOnline: boolean
  viewers: number
  downloads: number
  updatedAt: number
}

function getViewerId(): string {
  if (typeof window === 'undefined') return 'ssr'
  const KEY = 'fp_viewer_id'
  let id = sessionStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(KEY, id)
  }
  return id
}

// Subscribes to live channel presence via SSE and heartbeats this viewer so it
// is counted. Falls back gracefully if EventSource is unavailable.
export function useChannelPresence(slug: string): ChannelPresence | null {
  const [presence, setPresence] = useState<ChannelPresence | null>(null)
  const viewerIdRef = useRef<string>('')

  useEffect(() => {
    if (!slug) return
    const viewerId = getViewerId()
    viewerIdRef.current = viewerId

    const heartbeat = () => {
      fetch(`/api/channel/${encodeURIComponent(slug)}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId, action: 'view' }),
        keepalive: true,
      }).catch(() => {})
    }

    heartbeat()
    const hbInterval = setInterval(heartbeat, 15_000)

    let es: EventSource | null = null
    try {
      es = new EventSource(`/api/channel/${encodeURIComponent(slug)}/events`)
      es.addEventListener('presence', (e) => {
        try {
          setPresence(JSON.parse((e as MessageEvent).data))
        } catch {
          // ignore malformed event
        }
      })
    } catch {
      es = null
    }

    return () => {
      clearInterval(hbInterval)
      es?.close()
      // Best-effort leave notification
      navigator.sendBeacon?.(
        `/api/channel/${encodeURIComponent(slug)}/view`,
        new Blob([JSON.stringify({ viewerId, action: 'leave' })], {
          type: 'application/json',
        }),
      )
    }
  }, [slug])

  return presence
}
