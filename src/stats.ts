import 'server-only'
import { Redis, getRedisClient } from './redisClient'

// Aggregate, privacy-preserving transfer statistics. No file contents or
// personally-identifiable information are ever stored — only counters and a
// small rolling window of anonymized activity events for the live dashboard.

export type ActivityEvent = {
  type: 'created' | 'downloaded' | 'destroyed' | 'reported'
  at: number
  fileCount?: number
}

export type Stats = {
  channelsCreated: number
  downloadsStarted: number
  channelsDestroyed: number
  channelsReported: number
  activeChannels: number
  recent: ActivityEvent[]
}

const RECENT_LIMIT = 25

export interface StatsStore {
  recordChannelCreated(fileCount?: number): Promise<void>
  recordDownloadStarted(fileCount?: number): Promise<void>
  recordChannelDestroyed(reported: boolean): Promise<void>
  setActiveChannels(n: number): Promise<void>
  incrementActiveChannels(delta: number): Promise<void>
  getStats(): Promise<Stats>
}

const KEYS = {
  created: 'stats:channelsCreated',
  downloads: 'stats:downloadsStarted',
  destroyed: 'stats:channelsDestroyed',
  reported: 'stats:channelsReported',
  active: 'stats:activeChannels',
  recent: 'stats:recent',
}

class MemoryStatsStore implements StatsStore {
  private counters = {
    created: 0,
    downloads: 0,
    destroyed: 0,
    reported: 0,
    active: 0,
  }
  private recent: ActivityEvent[] = []

  private push(ev: ActivityEvent) {
    this.recent.unshift(ev)
    this.recent = this.recent.slice(0, RECENT_LIMIT)
  }

  async recordChannelCreated(fileCount?: number): Promise<void> {
    this.counters.created++
    this.counters.active++
    this.push({ type: 'created', at: Date.now(), fileCount })
  }
  async recordDownloadStarted(fileCount?: number): Promise<void> {
    this.counters.downloads++
    this.push({ type: 'downloaded', at: Date.now(), fileCount })
  }
  async recordChannelDestroyed(reported: boolean): Promise<void> {
    this.counters.destroyed++
    if (reported) this.counters.reported++
    this.counters.active = Math.max(0, this.counters.active - 1)
    this.push({ type: reported ? 'reported' : 'destroyed', at: Date.now() })
  }
  async setActiveChannels(n: number): Promise<void> {
    this.counters.active = Math.max(0, n)
  }
  async incrementActiveChannels(delta: number): Promise<void> {
    this.counters.active = Math.max(0, this.counters.active + delta)
  }
  async getStats(): Promise<Stats> {
    return {
      channelsCreated: this.counters.created,
      downloadsStarted: this.counters.downloads,
      channelsDestroyed: this.counters.destroyed,
      channelsReported: this.counters.reported,
      activeChannels: this.counters.active,
      recent: [...this.recent],
    }
  }
}

class RedisStatsStore implements StatsStore {
  private client: Redis
  constructor() {
    this.client = getRedisClient()
  }

  private async push(ev: ActivityEvent) {
    await this.client.lpush(KEYS.recent, JSON.stringify(ev))
    await this.client.ltrim(KEYS.recent, 0, RECENT_LIMIT - 1)
  }

  async recordChannelCreated(fileCount?: number): Promise<void> {
    await this.client.incr(KEYS.created)
    await this.client.incr(KEYS.active)
    await this.push({ type: 'created', at: Date.now(), fileCount })
  }
  async recordDownloadStarted(fileCount?: number): Promise<void> {
    await this.client.incr(KEYS.downloads)
    await this.push({ type: 'downloaded', at: Date.now(), fileCount })
  }
  async recordChannelDestroyed(reported: boolean): Promise<void> {
    await this.client.incr(KEYS.destroyed)
    if (reported) await this.client.incr(KEYS.reported)
    const v = await this.client.decr(KEYS.active)
    if (v < 0) await this.client.set(KEYS.active, '0')
    await this.push({
      type: reported ? 'reported' : 'destroyed',
      at: Date.now(),
    })
  }
  async setActiveChannels(n: number): Promise<void> {
    await this.client.set(KEYS.active, String(Math.max(0, n)))
  }
  async incrementActiveChannels(delta: number): Promise<void> {
    const v = await this.client.incrby(KEYS.active, delta)
    if (v < 0) await this.client.set(KEYS.active, '0')
  }
  async getStats(): Promise<Stats> {
    const [created, downloads, destroyed, reported, active, recentRaw] =
      await Promise.all([
        this.client.get(KEYS.created),
        this.client.get(KEYS.downloads),
        this.client.get(KEYS.destroyed),
        this.client.get(KEYS.reported),
        this.client.get(KEYS.active),
        this.client.lrange(KEYS.recent, 0, RECENT_LIMIT - 1),
      ])
    return {
      channelsCreated: Number(created ?? 0),
      downloadsStarted: Number(downloads ?? 0),
      channelsDestroyed: Number(destroyed ?? 0),
      channelsReported: Number(reported ?? 0),
      activeChannels: Number(active ?? 0),
      recent: recentRaw
        .map((s) => {
          try {
            return JSON.parse(s) as ActivityEvent
          } catch {
            return null
          }
        })
        .filter((e): e is ActivityEvent => e !== null),
    }
  }
}

// Shared via globalThis so all route-handler bundles see the same counters
// (Next.js dev does not guarantee shared module scope across routes).
const globalForStats = globalThis as unknown as {
  __filepizzaStatsStore?: StatsStore
}

export function getStatsStore(): StatsStore {
  if (!globalForStats.__filepizzaStatsStore) {
    globalForStats.__filepizzaStatsStore = process.env.REDIS_URL
      ? new RedisStatsStore()
      : new MemoryStatsStore()
  }
  return globalForStats.__filepizzaStatsStore
}
