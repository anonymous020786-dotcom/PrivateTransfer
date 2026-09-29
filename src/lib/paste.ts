import 'server-only'
import crypto from 'crypto'
import { getRedisClient } from '../redisClient'
import {
  hashPassword,
  verifyTransferPassword,
  hashToken,
  tokenMatches,
} from './transfer'

// Text/code snippets ("pastes"). Content is usually end-to-end encrypted in
// the browser (AES-GCM, key kept in the URL fragment) so the server stores
// only ciphertext; plaintext pastes are also supported for raw/curl access.

export const PASTE_MAX_BYTES = 1024 * 1024 // 1 MiB of (cipher)text
export const PASTE_EXPIRY_OPTIONS = [
  { label: '10 minutes', seconds: 600 },
  { label: '1 hour', seconds: 3600 },
  { label: '1 day', seconds: 86400 },
  { label: '1 week', seconds: 7 * 86400 },
  { label: '30 days', seconds: 30 * 86400 },
] as const

export type PasteRecord = {
  slug: string
  ownerId: string | null
  title: string
  language: string
  content: string // plaintext, or base64 ciphertext (iv ‖ ct) when encrypted
  encrypted: boolean
  passwordHash: string | null
  burnAfterRead: boolean
  createdAt: string
  expiresAt: string
  views: number
  deleteTokenHash: string
}

const KEY = (slug: string) => `paste:${slug}`
const USER_KEY = (uid: string) => `paste:user:${uid}`

export function newPasteSlug(): string {
  // 10 url-safe chars ≈ 60 bits: unguessable enough for unlisted notes.
  return crypto.randomBytes(8).toString('base64url').slice(0, 10)
}

export async function createPaste(input: {
  ownerId: string | null
  title: string
  language: string
  content: string
  encrypted: boolean
  password?: string
  burnAfterRead: boolean
  ttlSeconds: number
}): Promise<{ record: PasteRecord; deleteToken: string }> {
  const redis = getRedisClient()
  let slug = newPasteSlug()
  while (await redis.exists(KEY(slug))) slug = newPasteSlug()
  const deleteToken = crypto.randomBytes(16).toString('hex')
  const now = Date.now()
  const record: PasteRecord = {
    slug,
    ownerId: input.ownerId,
    title: input.title,
    language: input.language,
    content: input.content,
    encrypted: input.encrypted,
    passwordHash: input.password ? hashPassword(input.password) : null,
    burnAfterRead: input.burnAfterRead,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + input.ttlSeconds * 1000).toISOString(),
    views: 0,
    deleteTokenHash: hashToken(deleteToken),
  }
  await redis.set(KEY(slug), JSON.stringify(record), 'EX', input.ttlSeconds)
  if (input.ownerId) {
    await redis.zadd(
      USER_KEY(input.ownerId),
      now + input.ttlSeconds * 1000,
      slug,
    )
    await redis.expire(USER_KEY(input.ownerId), 31 * 86400)
  }
  return { record, deleteToken }
}

export async function getPaste(slug: string): Promise<PasteRecord | null> {
  if (!/^[A-Za-z0-9_-]{6,16}$/.test(slug)) return null
  const raw = await getRedisClient().get(KEY(slug))
  if (!raw) return null
  try {
    return JSON.parse(raw) as PasteRecord
  } catch {
    return null
  }
}

export async function deletePaste(p: PasteRecord): Promise<void> {
  const redis = getRedisClient()
  await redis.del(KEY(p.slug))
  if (p.ownerId) await redis.zrem(USER_KEY(p.ownerId), p.slug)
}

// Opens a paste for reading: checks the password, counts the view and burns
// burn-after-read pastes. Returns null when not found / wrong password.
export async function openPaste(
  slug: string,
  password?: string,
): Promise<
  | { ok: true; paste: PasteRecord; burned: boolean }
  | { ok: false; reason: 'not_found' | 'password' }
> {
  const p = await getPaste(slug)
  if (!p) return { ok: false, reason: 'not_found' }
  if (p.passwordHash && !verifyTransferPassword(password ?? '', p.passwordHash))
    return { ok: false, reason: 'password' }
  if (p.burnAfterRead) {
    await deletePaste(p)
    return { ok: true, paste: { ...p, views: p.views + 1 }, burned: true }
  }
  p.views += 1
  const ttl = Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / 1000)
  if (ttl > 0)
    await getRedisClient().set(KEY(slug), JSON.stringify(p), 'EX', ttl)
  return { ok: true, paste: p, burned: false }
}

export function canDelete(
  p: PasteRecord,
  opts: { token?: string | null; userId?: string | null },
): boolean {
  if (opts.userId && p.ownerId === opts.userId) return true
  return tokenMatches(opts.token ?? undefined, p.deleteTokenHash)
}

export async function listUserPastes(uid: string): Promise<PasteRecord[]> {
  const redis = getRedisClient()
  await redis.zremrangebyscore(USER_KEY(uid), '-inf', Date.now())
  const slugs = await redis.zrange(USER_KEY(uid), '0', '-1')
  const out: PasteRecord[] = []
  for (const s of slugs) {
    const p = await getPaste(s)
    if (p) out.push(p)
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// Public metadata — never includes content or secrets.
export function pasteMeta(p: PasteRecord) {
  return {
    slug: p.slug,
    title: p.title,
    language: p.language,
    encrypted: p.encrypted,
    passwordProtected: !!p.passwordHash,
    burnAfterRead: p.burnAfterRead,
    createdAt: p.createdAt,
    expiresAt: p.expiresAt,
    views: p.views,
    size: p.content.length,
  }
}
