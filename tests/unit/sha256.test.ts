// @vitest-environment node
import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { Sha256, sha256OfBlob } from '../../src/utils/sha256'

const ref = (b: Uint8Array) =>
  crypto.createHash('sha256').update(b).digest('hex')

describe('Sha256', () => {
  it('matches known vectors', () => {
    expect(new Sha256().digest()).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
    expect(new Sha256().update(new TextEncoder().encode('abc')).digest()).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('matches node:crypto across block boundaries and chunkings', () => {
    for (const len of [55, 56, 63, 64, 65, 119, 120, 1000, 100_003]) {
      const data = crypto.randomBytes(len)
      const h = new Sha256()
      // feed in irregular chunks
      for (let i = 0; i < len; ) {
        const n = Math.min(len - i, 1 + ((i * 7) % 97))
        h.update(data.subarray(i, i + n))
        i += n
      }
      expect(h.digest()).toBe(ref(data))
    }
  })

  it('hashes a Blob by streaming', async () => {
    const data = crypto.randomBytes(300_000)
    let last = 0
    const hex = await sha256OfBlob(new Blob([data]), (b) => (last = b))
    expect(hex).toBe(ref(data))
    expect(last).toBe(data.length)
  })
})
