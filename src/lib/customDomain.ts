import 'server-only'
import { randomBytes } from 'crypto'
import { getRedisClient } from '../redisClient'

export type CustomDomainRecord = {
  userId: string
  domain: string
  verificationToken: string
  verified: boolean
  verifiedAt: string | null
  createdAt: string
}

const KEY = (userId: string) => `customdomain:${userId}`
const DOMAIN_KEY = (domain: string) => `customdomain:lookup:${domain}`
const TTL = 365 * 24 * 3600

export async function getCustomDomain(
  userId: string,
): Promise<CustomDomainRecord | null> {
  const redis = getRedisClient()
  const raw = await redis.get(KEY(userId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as CustomDomainRecord
  } catch {
    return null
  }
}

export async function setCustomDomain(
  userId: string,
  domain: string,
): Promise<CustomDomainRecord> {
  const redis = getRedisClient()
  const existing = await getCustomDomain(userId)

  // Remove old domain lookup if changing
  if (existing && existing.domain !== domain) {
    await redis.del(DOMAIN_KEY(existing.domain))
  }

  const record: CustomDomainRecord = {
    userId,
    domain: domain.toLowerCase().trim(),
    verificationToken:
      existing?.verificationToken ??
      `zync-verify=${randomBytes(16).toString('hex')}`,
    verified: false,
    verifiedAt: null,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  }
  await redis.set(KEY(userId), JSON.stringify(record), 'EX', TTL)
  return record
}

export async function deleteCustomDomain(userId: string): Promise<void> {
  const redis = getRedisClient()
  const existing = await getCustomDomain(userId)
  if (existing) {
    await redis.del(DOMAIN_KEY(existing.domain))
  }
  await redis.del(KEY(userId))
}

export async function markDomainVerified(userId: string): Promise<void> {
  const redis = getRedisClient()
  const record = await getCustomDomain(userId)
  if (!record) return
  record.verified = true
  record.verifiedAt = new Date().toISOString()
  await redis.set(KEY(userId), JSON.stringify(record), 'EX', TTL)
  await redis.set(DOMAIN_KEY(record.domain), userId, 'EX', TTL)
}

// DNS verification: check for TXT record containing the verification token
export async function verifyDomainDns(
  record: CustomDomainRecord,
): Promise<boolean> {
  try {
    // Use the Google DNS-over-HTTPS API (works server-side without native dns module issues)
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(record.domain)}&type=TXT`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return false
    const json = (await res.json()) as {
      Answer?: Array<{ data: string }>
    }
    const txtRecords = json.Answer ?? []
    return txtRecords.some((r) =>
      r.data.replace(/"/g, '').includes(record.verificationToken),
    )
  } catch {
    return false
  }
}
