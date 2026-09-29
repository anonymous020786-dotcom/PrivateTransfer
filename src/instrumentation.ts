// Next.js instrumentation hook — runs once per server process.
//
// Built-in scheduler: runs housekeeping (expiry sweeps, scheduled emails,
// expiry warnings, pruning abandoned uploads) every few minutes, so
// single-server installs need no external cron. Enabled with the local
// backend, or anywhere with ZYNC_INTERNAL_CRON=true; set it to "false" when an
// external cron already calls /api/cron/cleanup.

const INTERVAL_MS = 5 * 60 * 1000

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { isLocalBackend } = await import('./local/mode')
  const flag = process.env.ZYNC_INTERNAL_CRON
  if (flag === 'false' || (flag !== 'true' && !isLocalBackend())) return

  const g = globalThis as unknown as { __zyncScheduler?: NodeJS.Timeout }
  if (g.__zyncScheduler) return

  const tick = async () => {
    try {
      const { runMaintenance } = await import('./lib/maintenance')
      const r = await runMaintenance()
      if (r.deleted || r.dispatched || r.warned || r.prunedUploads)
        console.info('[scheduler] maintenance', r)
    } catch (e) {
      console.error('[scheduler] maintenance failed', e)
    }
  }
  // First run shortly after boot, then on a fixed interval.
  setTimeout(tick, 30_000).unref?.()
  g.__zyncScheduler = setInterval(tick, INTERVAL_MS)
  g.__zyncScheduler.unref?.()
}
