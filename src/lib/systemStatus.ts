import 'server-only'
import fs from 'fs'
import path from 'path'
import { getRedisClient } from '../redisClient'
import { getStorageProvider } from './storage'
import { isEmailConfigured } from '../email'
import { isLocalBackend, isRealSupabaseConfigured } from '../local/mode'
import { dataDir } from '../local/db'
import { lastMaintenanceRun } from './maintenance'

// Snapshot of how this deployment is wired and how healthy it is. The admin
// dashboard gets everything; the public /status page gets the coarse parts.

async function dirSize(dir: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0
  let files = 0
  let entries: fs.Dirent[] = []
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true })
  } catch {
    return { bytes, files }
  }
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      const sub = await dirSize(p)
      bytes += sub.bytes
      files += sub.files
    } else if (e.isFile()) {
      bytes += (await fs.promises.stat(p)).size
      files++
    }
  }
  return { bytes, files }
}

export type ComponentState = 'ok' | 'degraded' | 'down' | 'off'

export async function getSystemStatus(opts: { detailed: boolean }) {
  const redisMode = process.env.REDIS_URL
    ? 'redis'
    : isLocalBackend()
      ? 'embedded'
      : 'redis-localhost'
  let redis: ComponentState = 'ok'
  let redisLatencyMs: number | null = null
  try {
    const t = Date.now()
    await Promise.race([
      getRedisClient().ping(),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error('timeout')), 2000),
      ),
    ])
    redisLatencyMs = Date.now() - t
  } catch {
    redis = 'down'
  }

  const provider = await getStorageProvider().catch(() => null)
  const email = await isEmailConfigured().catch(() => false)
  const auth = isRealSupabaseConfigured()
    ? 'supabase'
    : isLocalBackend()
      ? 'local'
      : 'off'
  const maintenance = await lastMaintenanceRun()
  const maintenanceStale =
    !maintenance ||
    Date.now() - new Date(maintenance.ts).getTime() > 30 * 60 * 1000

  const components = {
    web: 'ok' as ComponentState,
    database: redis,
    storage: (provider ? 'ok' : 'off') as ComponentState,
    accounts: (auth === 'off' ? 'off' : 'ok') as ComponentState,
    email: (email ? 'ok' : 'off') as ComponentState,
    maintenance: (maintenanceStale ? 'degraded' : 'ok') as ComponentState,
  }
  const overall: ComponentState =
    redis === 'down'
      ? 'down'
      : maintenanceStale && maintenance
        ? 'degraded'
        : 'ok'

  const base = {
    status: overall,
    components,
    uptimeSec: Math.floor(process.uptime()),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
    checkedAt: new Date().toISOString(),
  }
  if (!opts.detailed) return base

  let activeTransfers = 0
  try {
    activeTransfers = await getRedisClient().zcard('transfer:cleanup')
  } catch {
    // counted as unknown/0
  }
  const disk =
    provider === 'local' || isLocalBackend() ? await dirSize(dataDir()) : null
  const mem = process.memoryUsage()

  return {
    ...base,
    config: {
      backend: isLocalBackend() ? 'local' : 'cloud',
      auth,
      storageProvider: provider,
      redisMode,
      redisLatencyMs,
      emailConfigured: email,
      dataDir: disk ? dataDir() : null,
      internalScheduler:
        process.env.ZYNC_INTERNAL_CRON === 'true' ||
        (process.env.ZYNC_INTERNAL_CRON !== 'false' && isLocalBackend()),
    },
    usage: {
      activeTransfers,
      disk,
    },
    maintenance,
    runtime: {
      node: process.version,
      platform: process.platform,
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
    },
  }
}
