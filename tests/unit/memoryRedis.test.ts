// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { MemoryRedis } from '../../src/local/memoryRedis'

let file: string
let r: MemoryRedis

beforeEach(() => {
  file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mr-')), 'redis.json')
  r = new MemoryRedis(file)
})

describe('MemoryRedis', () => {
  it('handles strings, NX and expiry', async () => {
    expect(await r.set('a', 'x')).toBe('OK')
    expect(await r.set('a', 'y', 'NX')).toBeNull()
    expect(await r.get('a')).toBe('x')
    await r.set('b', 1, 'PX', 1)
    await new Promise((res) => setTimeout(res, 5))
    expect(await r.get('b')).toBeNull()
    expect(await r.exists('a', 'b')).toBe(1)
  })

  it('counts with incr/decr and keeps TTL', async () => {
    await r.setex('c', 100, '5')
    expect(await r.incr('c')).toBe(6)
    expect(await r.decr('c')).toBe(5)
    expect(await r.ttl('c')).toBeGreaterThan(90)
    await expect(r.incr('nope-list-key')).resolves.toBe(1)
  })

  it('rejects wrong types', async () => {
    await r.lpush('l', 'x')
    await expect(r.get('l')).rejects.toThrow('WRONGTYPE')
  })

  it('supports sorted-set ranges, scores and increments', async () => {
    await r.zadd('z', 3, 'c', 1, 'a', 2, 'b')
    expect(await r.zrange('z', 0, -1)).toEqual(['a', 'b', 'c'])
    expect(await r.zrevrange('z', 0, 0)).toEqual(['c'])
    expect(await r.zrangebyscore('z', '(1', '+inf')).toEqual(['b', 'c'])
    expect(await r.zincrby('z', 5, 'a')).toBe('6')
    expect(await r.zrange('z', 0, -1)).toEqual(['b', 'c', 'a'])
    expect(await r.zremrangebyrank('z', 0, 0)).toBe(1)
    expect(await r.zremrangebyscore('z', '-inf', 3)).toBe(1)
    expect(await r.zcard('z')).toBe(1)
  })

  it('supports lists, sets and hashes', async () => {
    await r.lpush('q', 'a', 'b', 'c')
    expect(await r.lrange('q', 0, -1)).toEqual(['c', 'b', 'a'])
    expect(await r.rpop('q')).toBe('a')
    await r.ltrim('q', 0, 0)
    expect(await r.lrange('q', 0, -1)).toEqual(['c'])

    expect(await r.sadd('s', 'x', 'y', 'x')).toBe(2)
    expect(await r.srem('s', 'x')).toBe(1)
    expect(await r.smembers('s')).toEqual(['y'])

    await r.hset('h', { a: 1, b: 'two' })
    expect(await r.hgetall('h')).toEqual({ a: '1', b: 'two' })
  })

  it('persists snapshots to disk', async () => {
    await r.set('persist', 'me')
    await new Promise((res) => setTimeout(res, 200))
    const again = new MemoryRedis(file)
    expect(await again.get('persist')).toBe('me')
  })
})
