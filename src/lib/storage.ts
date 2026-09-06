import 'server-only'
import { S3Client } from '@aws-sdk/client-s3'
import { getAllSettings } from './appSettings'

export type StorageProvider = 'r2' | 's3'

// S3 storage classes ordered from most to least expensive per-GB.
// INTELLIGENT_TIERING auto-tiers to cheaper classes after 30/90 days.
// STANDARD_IA saves ~45% for files accessed < once/month.
// GLACIER_IR saves ~68% with 1–5ms retrieval (good for archive transfers).
export type S3StorageClass =
  | 'STANDARD'
  | 'INTELLIGENT_TIERING'
  | 'STANDARD_IA'
  | 'GLACIER_IR'

type StorageConfig =
  | {
      provider: 'r2'
      accountId: string
      accessKeyId: string
      secretAccessKey: string
      bucket: string
    }
  | {
      provider: 's3'
      accessKeyId: string
      secretAccessKey: string
      region: string
      bucket: string
      storageClass: S3StorageClass
    }

async function getStorageConfig(): Promise<StorageConfig | null> {
  try {
    const s = await getAllSettings()

    const provider =
      (s.storage_provider as StorageProvider | undefined) ||
      (s.r2_account_id || process.env.R2_ACCOUNT_ID
        ? 'r2'
        : s.s3_access_key_id || process.env.AWS_ACCESS_KEY_ID
          ? 's3'
          : null)

    if (provider === 'r2') {
      const accountId = s.r2_account_id || process.env.R2_ACCOUNT_ID
      const accessKeyId = s.r2_access_key_id || process.env.R2_ACCESS_KEY_ID
      const secretAccessKey =
        s.r2_secret_access_key || process.env.R2_SECRET_ACCESS_KEY
      const bucket =
        s.r2_bucket_name || process.env.R2_BUCKET_NAME || 'zync-transfers'
      if (accountId && accessKeyId && secretAccessKey) {
        return {
          provider: 'r2',
          accountId,
          accessKeyId,
          secretAccessKey,
          bucket,
        }
      }
    }

    if (provider === 's3') {
      const accessKeyId = s.s3_access_key_id || process.env.AWS_ACCESS_KEY_ID
      const secretAccessKey =
        s.s3_secret_access_key || process.env.AWS_SECRET_ACCESS_KEY
      const region = s.s3_region || process.env.AWS_REGION || 'us-east-1'
      const bucket =
        s.s3_bucket || process.env.AWS_S3_BUCKET || 'zync-transfers'
      const storageClass =
        (s.s3_storage_class as S3StorageClass | undefined) ||
        'INTELLIGENT_TIERING'
      if (accessKeyId && secretAccessKey) {
        return {
          provider: 's3',
          accessKeyId,
          secretAccessKey,
          region,
          bucket,
          storageClass,
        }
      }
    }
  } catch {
    // DB unavailable — fall through to env vars only.
  }

  // Pure env-var fallback (no DB available).
  if (
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  ) {
    return {
      provider: 'r2',
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucket: process.env.R2_BUCKET_NAME ?? 'zync-transfers',
    }
  }
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      provider: 's3',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION ?? 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET ?? 'zync-transfers',
      storageClass: 'INTELLIGENT_TIERING',
    }
  }

  return null
}

// Cache the S3Client so we don't rebuild it on every request.
let _cached: { cfg: StorageConfig; client: S3Client } | null = null

function buildClient(cfg: StorageConfig): S3Client {
  if (cfg.provider === 'r2') {
    return new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    })
  }
  return new S3Client({
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  })
}

function cfgKey(cfg: StorageConfig): string {
  if (cfg.provider === 'r2') return `r2:${cfg.accountId}:${cfg.accessKeyId}`
  return `s3:${cfg.region}:${cfg.accessKeyId}`
}

export async function getStorageProvider(): Promise<StorageProvider | null> {
  const cfg = await getStorageConfig()
  return cfg?.provider ?? null
}

export async function isStorageConfigured(): Promise<boolean> {
  return (await getStorageConfig()) !== null
}

export async function getStorageClient(): Promise<S3Client> {
  const cfg = await getStorageConfig()
  if (!cfg) throw new Error('No storage provider configured.')

  if (_cached && cfgKey(_cached.cfg) === cfgKey(cfg)) return _cached.client

  const client = buildClient(cfg)
  _cached = { cfg, client }
  return client
}

export async function getStorageBucket(): Promise<string> {
  const cfg = await getStorageConfig()
  if (!cfg) return 'zync-transfers'
  return cfg.provider === 'r2' ? cfg.bucket : cfg.bucket
}

// Returns the S3 storage class for cost savings (undefined for R2 — no classes).
// INTELLIGENT_TIERING is the default for S3: automatically tiers objects to
// cheaper storage after 30 days (infrequent) and 90 days (archive).
export async function getStorageClass(): Promise<S3StorageClass | undefined> {
  const cfg = await getStorageConfig()
  if (!cfg || cfg.provider === 'r2') return undefined
  return cfg.storageClass
}
