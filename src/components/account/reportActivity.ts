'use client'

import { isLocalBackend } from '../../local/mode'

// With real Supabase, auth changes happen browser → Supabase and never pass
// through our server, so the client reports them for the activity log. The
// local backend records these itself.
export function reportActivity(type: string, detail?: string): void {
  if (isLocalBackend()) return
  void fetch('/api/account/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, detail }),
  }).catch(() => {})
}
