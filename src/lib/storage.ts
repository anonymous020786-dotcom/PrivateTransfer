import 'server-only'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getAllSettings } from './appSettings'
import { isLocalBackend } from '../local/mode'
import {
  abortLocalMultipart,
  completeLocalMultipart,
  createLocalMultipart,
  deleteLocalObjects,
  signObjectUrl,
  writeLocalObject,
} from '../local/objects'

export type StorageProvider = 'r2' | 's3' | 'local'

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
  | { provider: 'local'; bucket: string }

type RemoteConfig = Exclude<StorageConfig, { provider: 'local' }>

// Local-disk storage is used when explicitly selected, or as the fallback when
// no bucket is configured and the local backend is active (dev / self-host).
function localConfig(): StorageConfig {
  return { provider: 'local', bucket: 'local' }
}

async function getStorageConfig(): Promise<StorageConfig | null> {
  if (process.env.STORAGE_PROVIDER === 'local') return localConfig()
  try {
    if ((await getAllSettings()).storage_provider === 'local')
      return localConfig()
  } catch {
    // settings unavailable — continue with env/remote detection
  }
  const remote = await getRemoteStorageConfig()
  if (remote) return remote
  return isLocalBackend() ? localConfig() : null
}

async function getRemoteStorageConfig(): Promise<RemoteConfig | null> {
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
let _cached: { cfg: RemoteConfig; client: S3Client } | null = null

function buildClient(cfg: RemoteConfig): S3Client {
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

function cfgKey(cfg: RemoteConfig): string {
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
  if (cfg.provider === 'local')
    throw new Error('Local storage has no S3 client; use the presign helpers.')

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
  if (!cfg || cfg.provider !== 's3') return undefined
  return cfg.storageClass
}

// ── Provider-agnostic object helpers ─────────────────────────────────────────
// Route handlers should use these instead of building S3 commands, so the same
// code works against R2, S3 and the local-disk driver.

export async function presignUpload(
  key: string,
  opts: { contentType?: string; size: number; expiresIn?: number },
): Promise<string> {
  const cfg = await getStorageConfig()
  if (!cfg) throw new Error('No storage provider configured.')
  const expiresIn = opts.expiresIn ?? 14400
  if (cfg.provider === 'local') {
    return signObjectUrl(
      { k: key, m: 'PUT', len: opts.size, ct: opts.contentType },
      expiresIn,
    )
  }
  const storageClass = cfg.provider === 's3' ? cfg.storageClass : undefined
  return getSignedUrl(
    await getStorageClient(),
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      ContentType: opts.contentType || 'application/octet-stream',
      ContentLength: opts.size,
      ...(storageClass ? { StorageClass: storageClass } : {}),
    }),
    { expiresIn },
  )
}

export async function presignDownload(
  key: string,
  opts: {
    filename?: string // set → served as an attachment with this name
    contentType?: string
    expiresIn?: number
  } = {},
): Promise<string> {
  const cfg = await getStorageConfig()
  if (!cfg) throw new Error('No storage provider configured.')
  const expiresIn = opts.expiresIn ?? 900
  if (cfg.provider === 'local') {
    return signObjectUrl(
      { k: key, m: 'GET', ct: opts.contentType, dl: opts.filename },
      expiresIn,
    )
  }
  return getSignedUrl(
    await getStorageClient(),
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      ...(opts.contentType ? { ResponseContentType: opts.contentType } : {}),
      ...(opts.filename
        ? {
            ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(opts.filename)}`,
          }
        : {}),
    }),
    { expiresIn },
  )
}

// Best-effort bulk delete (chunks of 1000, the S3 DeleteObjects maximum).
export async function deleteStoredObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const cfg = await getStorageConfig()
  if (!cfg) return
  if (cfg.provider === 'local') return deleteLocalObjects(keys)
  const client = await getStorageClient()
  for (let i = 0; i < keys.length; i += 1000) {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: cfg.bucket,
        Delete: {
          Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    )
  }
}

// ── Multipart uploads (files above MULTIPART_THRESHOLD) ─────────────────────
// Browsers PUT each part to its own presigned URL and report the returned
// ETags; the server then stitches the parts together. For S3/R2 the bucket's
// CORS policy must expose the `ETag` response header.

export const MULTIPART_THRESHOLD = 100 * 1024 * 1024 // 100 MiB
const MIN_PART = 64 * 1024 * 1024 // 64 MiB (S3 minimum is 5 MiB)
const MAX_PARTS = 1000 // keeps the presigned URL list a manageable size

export function partSizeFor(size: number): number {
  const mib = 1024 * 1024
  return Math.max(MIN_PART, Math.ceil(size / MAX_PARTS / mib) * mib)
}

export type MultipartPlan = {
  uploadId: string
  partSize: number
  partUrls: string[]
}

export async function createMultipartUpload(
  key: string,
  opts: { contentType?: string; size: number; expiresIn?: number },
): Promise<MultipartPlan> {
  const cfg = await getStorageConfig()
  if (!cfg) throw new Error('No storage provider configured.')
  const partSize = partSizeFor(opts.size)
  const count = Math.max(1, Math.ceil(opts.size / partSize))
  const expiresIn = opts.expiresIn ?? 24 * 3600
  const lengthOf = (n: number) =>
    n < count ? partSize : opts.size - partSize * (count - 1)

  if (cfg.provider === 'local') {
    const uploadId = await createLocalMultipart(key)
    const partUrls = Array.from({ length: count }, (_, i) =>
      signObjectUrl(
        { k: key, m: 'PUT', len: lengthOf(i + 1), u: uploadId, pn: i + 1 },
        expiresIn,
      ),
    )
    return { uploadId, partSize, partUrls }
  }

  const client = await getStorageClient()
  const storageClass = cfg.provider === 's3' ? cfg.storageClass : undefined
  const created = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: cfg.bucket,
      Key: key,
      ContentType: opts.contentType || 'application/octet-stream',
      ...(storageClass ? { StorageClass: storageClass } : {}),
    }),
  )
  const uploadId = created.UploadId!
  const partUrls = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      getSignedUrl(
        client,
        new UploadPartCommand({
          Bucket: cfg.bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: i + 1,
          ContentLength: lengthOf(i + 1),
        }),
        { expiresIn },
      ),
    ),
  )
  return { uploadId, partSize, partUrls }
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: Array<{ partNumber: number; etag: string }>,
): Promise<void> {
  const cfg = await getStorageConfig()
  if (!cfg) throw new Error('No storage provider configured.')
  const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber)
  if (cfg.provider === 'local')
    return completeLocalMultipart(
      key,
      uploadId,
      sorted.map((p) => p.partNumber),
    )
  await (
    await getStorageClient()
  ).send(
    new CompleteMultipartUploadCommand({
      Bucket: cfg.bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sorted.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
      },
    }),
  )
}

export async function abortMultipartUpload(
  key: string,
  uploadId: string,
): Promise<void> {
  const cfg = await getStorageConfig()
  if (!cfg) return
  if (cfg.provider === 'local') return abortLocalMultipart(uploadId)
  await (
    await getStorageClient()
  ).send(
    new AbortMultipartUploadCommand({
      Bucket: cfg.bucket,
      Key: key,
      UploadId: uploadId,
    }),
  )
}

// Server-side streaming upload (used by the curl endpoint). Single PUT, so
// callers must cap the size at the S3 single-object limit (5 GB).
export async function putObjectStream(
  key: string,
  body: NodeJS.ReadableStream,
  opts: { size: number; contentType?: string },
): Promise<void> {
  const cfg = await getStorageConfig()
  if (!cfg) throw new Error('No storage provider configured.')
  if (cfg.provider === 'local') return writeLocalObject(key, body, opts.size)
  const storageClass = cfg.provider === 's3' ? cfg.storageClass : undefined
  await (
    await getStorageClient()
  ).send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body as import('stream').Readable,
      ContentLength: opts.size,
      ContentType: opts.contentType || 'application/octet-stream',
      ...(storageClass ? { StorageClass: storageClass } : {}),
    }),
  )
}
