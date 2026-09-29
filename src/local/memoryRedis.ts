import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'

// Embedded, disk-persisted Redis subset for running Zync without a Redis
// server (local backend). Implements exactly the ioredis commands the app
// uses — strings, counters, TTLs, sets, lists, hashes and sorted sets — with
// Redis semantics (lazy expiry, string replies, WRONGTYPE errors). State is
// snapshotted to `.data/redis.json` shortly after each write.

type Entry =
  | { t: 'string'; v: string; exp?: number }
  | { t: 'set'; v: string[]; exp?: number }
  | { t: 'list'; v: string[]; exp?: number }
  | { t: 'hash'; v: Record<string, string>; exp?: number }
  | { t: 'zset'; v: Array<[number, string]>; exp?: number } // sorted by score

type Kind = Entry['t']

function dir(): string {
  return process.env.ZYNC_DATA_DIR || path.join(process.cwd(), '.data')
}

const WRONGTYPE =
  'WRONGTYPE Operation against a key holding the wrong kind of value'

function parseScore(s: string | number): number {
  if (typeof s === 'number') return s
  if (s === '-inf') return -Infinity
  if (s === '+inf' || s === 'inf') return Infinity
  return Number(s)
}

function inRange(
  score: number,
  min: string | number,
  max: string | number,
): boolean {
  const lo = String(min)
  const hi = String(max)
  const minOk = lo.startsWith('(')
    ? score > parseScore(lo.slice(1))
    : score >= parseScore(lo)
  const maxOk = hi.startsWith('(')
    ? score < parseScore(hi.slice(1))
    : score <= parseScore(hi)
  return minOk && maxOk
}

function sliceRange<T>(arr: T[], start: number, stop: number): T[] {
  const n = arr.length
  let s = start < 0 ? Math.max(n + start, 0) : start
  let e = stop < 0 ? n + stop : Math.min(stop, n - 1)
  if (s > e || s >= n) return []
  return arr.slice(s, e + 1)
}

export class MemoryRedis extends EventEmitter {
  private data = new Map<string, Entry>()
  private timer: NodeJS.Timeout | null = null
  readonly status = 'ready'

  constructor(private readonly file = path.join(dir(), 'redis.json')) {
    super()
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Record<
        string,
        Entry
      >
      for (const [k, v] of Object.entries(raw)) this.data.set(k, v)
    } catch {
      // fresh store
    }
  }

  // ── internals ────────────────────────────────────────────────────────────
  private live(key: string): Entry | undefined {
    const e = this.data.get(key)
    if (e?.exp !== undefined && e.exp <= Date.now()) {
      this.data.delete(key)
      return undefined
    }
    return e
  }

  private typed<K extends Kind>(
    key: string,
    kind: K,
  ): Extract<Entry, { t: K }> | undefined {
    const e = this.live(key)
    if (e && e.t !== kind) throw new Error(WRONGTYPE)
    return e as Extract<Entry, { t: K }> | undefined
  }

  private ensure<K extends Kind>(
    key: string,
    kind: K,
    init: Extract<Entry, { t: K }>['v'],
  ) {
    const e = this.typed(key, kind)
    if (e) return e
    const created = { t: kind, v: init } as Extract<Entry, { t: K }>
    this.data.set(key, created)
    return created
  }

  private dropIfEmpty(key: string, e: Entry): void {
    const size = Array.isArray(e.v)
      ? e.v.length
      : typeof e.v === 'object'
        ? Object.keys(e.v).length
        : 1
    if (size === 0) this.data.delete(key)
  }

  private dirty(): void {
    if (this.timer) return
    this.timer = setTimeout(() => {
      this.timer = null
      try {
        const now = Date.now()
        const out: Record<string, Entry> = {}
        for (const [k, v] of this.data)
          if (v.exp === undefined || v.exp > now) out[k] = v
        fs.mkdirSync(path.dirname(this.file), { recursive: true })
        const tmp = `${this.file}.${process.pid}.tmp`
        fs.writeFileSync(tmp, JSON.stringify(out))
        fs.renameSync(tmp, this.file)
      } catch (e) {
        console.error('[memory-redis] snapshot failed', e)
      }
    }, 100)
  }

  // ── connection-ish ───────────────────────────────────────────────────────
  async ping(): Promise<string> {
    return 'PONG'
  }
  async quit(): Promise<'OK'> {
    return 'OK'
  }
  disconnect(): void {}

  // ── keys ─────────────────────────────────────────────────────────────────
  async del(...keys: Array<string | string[]>): Promise<number> {
    let n = 0
    for (const k of keys.flat()) if (this.live(k) && this.data.delete(k)) n++
    if (n) this.dirty()
    return n
  }
  async exists(...keys: Array<string | string[]>): Promise<number> {
    return keys.flat().filter((k) => this.live(k)).length
  }
  async expire(key: string, seconds: number): Promise<number> {
    const e = this.live(key)
    if (!e) return 0
    e.exp = Date.now() + Number(seconds) * 1000
    this.dirty()
    return 1
  }
  async ttl(key: string): Promise<number> {
    const e = this.live(key)
    if (!e) return -2
    if (e.exp === undefined) return -1
    return Math.ceil((e.exp - Date.now()) / 1000)
  }

  // ── strings ──────────────────────────────────────────────────────────────
  async get(key: string): Promise<string | null> {
    return this.typed(key, 'string')?.v ?? null
  }
  // Supports: set(k, v), set(k, v, 'EX', s), set(k, v, 'PX', ms),
  // set(k, v, 'NX'), set(k, v, 'EX', s, 'NX') and 'KEEPTTL'.
  async set(
    key: string,
    value: string | number,
    ...args: Array<string | number>
  ): Promise<'OK' | null> {
    let exp: number | undefined
    let nx = false
    let xx = false
    let keepTtl = false
    for (let i = 0; i < args.length; i++) {
      const a = String(args[i]).toUpperCase()
      if (a === 'EX') exp = Date.now() + Number(args[++i]) * 1000
      else if (a === 'PX') exp = Date.now() + Number(args[++i])
      else if (a === 'NX') nx = true
      else if (a === 'XX') xx = true
      else if (a === 'KEEPTTL') keepTtl = true
    }
    const cur = this.live(key)
    if ((nx && cur) || (xx && !cur)) return null
    this.data.set(key, {
      t: 'string',
      v: String(value),
      exp: keepTtl ? cur?.exp : exp,
    })
    this.dirty()
    return 'OK'
  }
  async setex(
    key: string,
    seconds: number,
    value: string | number,
  ): Promise<'OK'> {
    await this.set(key, value, 'EX', seconds)
    return 'OK'
  }
  async incrby(key: string, by: number): Promise<number> {
    const e = this.typed(key, 'string')
    const cur = e ? Number(e.v) : 0
    if (!Number.isInteger(cur))
      throw new Error('ERR value is not an integer or out of range')
    const next = cur + Number(by)
    this.data.set(key, { t: 'string', v: String(next), exp: e?.exp })
    this.dirty()
    return next
  }
  async incr(key: string): Promise<number> {
    return this.incrby(key, 1)
  }
  async decr(key: string): Promise<number> {
    return this.incrby(key, -1)
  }

  // ── hashes ───────────────────────────────────────────────────────────────
  async hset(
    key: string,
    ...args: Array<string | number | Record<string, string | number>>
  ): Promise<number> {
    const e = this.ensure(key, 'hash', {})
    const pairs: Array<[string, string]> = []
    if (args.length === 1 && typeof args[0] === 'object') {
      for (const [f, v] of Object.entries(args[0])) pairs.push([f, String(v)])
    } else {
      for (let i = 0; i + 1 < args.length; i += 2)
        pairs.push([String(args[i]), String(args[i + 1])])
    }
    let added = 0
    for (const [f, v] of pairs) {
      if (!(f in e.v)) added++
      e.v[f] = v
    }
    this.dirty()
    return added
  }
  async hget(key: string, field: string): Promise<string | null> {
    return this.typed(key, 'hash')?.v[field] ?? null
  }
  async hgetall(key: string): Promise<Record<string, string>> {
    return { ...(this.typed(key, 'hash')?.v ?? {}) }
  }
  async hdel(key: string, ...fields: string[]): Promise<number> {
    const e = this.typed(key, 'hash')
    if (!e) return 0
    let n = 0
    for (const f of fields) if (f in e.v) (delete e.v[f], n++)
    this.dropIfEmpty(key, e)
    this.dirty()
    return n
  }

  // ── sets ─────────────────────────────────────────────────────────────────
  async sadd(
    key: string,
    ...members: Array<string | number | Array<string | number>>
  ): Promise<number> {
    const e = this.ensure(key, 'set', [])
    let n = 0
    for (const m of members.flat().map(String))
      if (!e.v.includes(m)) (e.v.push(m), n++)
    this.dirty()
    return n
  }
  async srem(
    key: string,
    ...members: Array<string | number | Array<string | number>>
  ): Promise<number> {
    const e = this.typed(key, 'set')
    if (!e) return 0
    const drop = new Set(members.flat().map(String))
    const before = e.v.length
    e.v = e.v.filter((m) => !drop.has(m))
    this.dropIfEmpty(key, e)
    this.dirty()
    return before - e.v.length
  }
  async smembers(key: string): Promise<string[]> {
    return [...(this.typed(key, 'set')?.v ?? [])]
  }
  async sismember(key: string, m: string): Promise<number> {
    return this.typed(key, 'set')?.v.includes(String(m)) ? 1 : 0
  }
  async scard(key: string): Promise<number> {
    return this.typed(key, 'set')?.v.length ?? 0
  }

  // ── lists ────────────────────────────────────────────────────────────────
  async lpush(
    key: string,
    ...vals: Array<string | number | Array<string | number>>
  ): Promise<number> {
    const e = this.ensure(key, 'list', [])
    for (const v of vals.flat().map(String)) e.v.unshift(v)
    this.dirty()
    return e.v.length
  }
  async rpush(
    key: string,
    ...vals: Array<string | number | Array<string | number>>
  ): Promise<number> {
    const e = this.ensure(key, 'list', [])
    e.v.push(...vals.flat().map(String))
    this.dirty()
    return e.v.length
  }
  async rpop(key: string): Promise<string | null> {
    const e = this.typed(key, 'list')
    const v = e?.v.pop() ?? null
    if (e) this.dropIfEmpty(key, e)
    this.dirty()
    return v
  }
  async lpop(key: string): Promise<string | null> {
    const e = this.typed(key, 'list')
    const v = e?.v.shift() ?? null
    if (e) this.dropIfEmpty(key, e)
    this.dirty()
    return v
  }
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return sliceRange(
      this.typed(key, 'list')?.v ?? [],
      Number(start),
      Number(stop),
    )
  }
  async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
    const e = this.typed(key, 'list')
    if (e) {
      e.v = sliceRange(e.v, Number(start), Number(stop))
      this.dropIfEmpty(key, e)
      this.dirty()
    }
    return 'OK'
  }
  async llen(key: string): Promise<number> {
    return this.typed(key, 'list')?.v.length ?? 0
  }

  // ── sorted sets ──────────────────────────────────────────────────────────
  async zadd(key: string, ...args: Array<string | number>): Promise<number> {
    const e = this.ensure(key, 'zset', [])
    let added = 0
    for (let i = 0; i + 1 < args.length; i += 2) {
      const score = parseScore(args[i])
      const member = String(args[i + 1])
      const idx = e.v.findIndex(([, m]) => m === member)
      if (idx >= 0) e.v.splice(idx, 1)
      else added++
      e.v.push([score, member])
    }
    e.v.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    this.dirty()
    return added
  }
  async zrem(
    key: string,
    ...members: Array<string | number | Array<string | number>>
  ): Promise<number> {
    const e = this.typed(key, 'zset')
    if (!e) return 0
    const drop = new Set(members.flat().map(String))
    const before = e.v.length
    e.v = e.v.filter(([, m]) => !drop.has(m))
    this.dropIfEmpty(key, e)
    this.dirty()
    return before - e.v.length
  }
  async zcard(key: string): Promise<number> {
    return this.typed(key, 'zset')?.v.length ?? 0
  }
  async zscore(key: string, member: string): Promise<string | null> {
    const hit = this.typed(key, 'zset')?.v.find(([, m]) => m === String(member))
    return hit ? String(hit[0]) : null
  }
  async zrange(
    key: string,
    start: number,
    stop: number,
    ...opts: string[]
  ): Promise<string[]> {
    const items = this.typed(key, 'zset')?.v ?? []
    const rev = opts.some((o) => o.toUpperCase() === 'REV')
    const ordered = rev ? [...items].reverse() : items
    const out = sliceRange(ordered, Number(start), Number(stop))
    return opts.some((o) => o.toUpperCase() === 'WITHSCORES')
      ? out.flatMap(([s, m]) => [m, String(s)])
      : out.map(([, m]) => m)
  }
  async zrangebyscore(
    key: string,
    min: string | number,
    max: string | number,
    ...opts: Array<string | number>
  ): Promise<string[]> {
    let items = (this.typed(key, 'zset')?.v ?? []).filter(([s]) =>
      inRange(s, min, max),
    )
    const withScores = opts.some(
      (o) => String(o).toUpperCase() === 'WITHSCORES',
    )
    const li = opts.findIndex((o) => String(o).toUpperCase() === 'LIMIT')
    if (li >= 0) {
      const offset = Number(opts[li + 1])
      const count = Number(opts[li + 2])
      items = items.slice(offset, count < 0 ? undefined : offset + count)
    }
    return withScores
      ? items.flatMap(([s, m]) => [m, String(s)])
      : items.map(([, m]) => m)
  }
  async zincrby(
    key: string,
    by: number | string,
    member: string,
  ): Promise<string> {
    const cur = Number((await this.zscore(key, member)) ?? 0)
    const next = cur + Number(by)
    await this.zadd(key, next, member)
    return String(next)
  }
  async zrevrange(
    key: string,
    start: number,
    stop: number,
    ...opts: string[]
  ): Promise<string[]> {
    return this.zrange(key, start, stop, 'REV', ...opts)
  }
  async zremrangebyrank(
    key: string,
    start: number,
    stop: number,
  ): Promise<number> {
    const e = this.typed(key, 'zset')
    if (!e) return 0
    const drop = new Set(
      sliceRange(e.v, Number(start), Number(stop)).map(([, m]) => m),
    )
    const before = e.v.length
    e.v = e.v.filter(([, m]) => !drop.has(m))
    this.dropIfEmpty(key, e)
    this.dirty()
    return before - e.v.length
  }
  async zremrangebyscore(
    key: string,
    min: string | number,
    max: string | number,
  ): Promise<number> {
    const e = this.typed(key, 'zset')
    if (!e) return 0
    const before = e.v.length
    e.v = e.v.filter(([s]) => !inRange(s, min, max))
    this.dropIfEmpty(key, e)
    this.dirty()
    return before - e.v.length
  }
}
