import 'server-only'
import { getSupabaseAdminClient } from '../supabase/admin'

// Keys stored in app_settings table.
// All values are strings; booleans are stored as "true"/"false".
export type SettingKey =
  // SMTP
  | 'smtp_host'
  | 'smtp_port'
  | 'smtp_user'
  | 'smtp_pass'
  | 'smtp_from'
  // Storage — provider selector ('r2' | 's3'; empty = auto-detect from env)
  | 'storage_provider'
  // Cloudflare R2
  | 'r2_account_id'
  | 'r2_access_key_id'
  | 'r2_secret_access_key'
  | 'r2_bucket_name'
  // AWS S3
  | 's3_access_key_id'
  | 's3_secret_access_key'
  | 's3_region'
  | 's3_bucket'
  // S3 cost-savings options
  | 's3_storage_class' // INTELLIGENT_TIERING | STANDARD | STANDARD_IA | GLACIER_IR
  | 's3_lifecycle_days' // move to Glacier IR after N days (informational — set via AWS console)
  // Feature flags
  | 'feature_email_notifications'
  | 'feature_transfer_tracking'
  | 'feature_recaptcha'
  | 'feature_guest_uploads'
  | 'feature_registration'
  | 'feature_cloud_transfers'
  | 'feature_white_label_emails'
  | 'feature_virus_scan'
  | 'virustotal_api_key'

export type SettingsMap = Partial<Record<SettingKey, string>>

// In-process cache so we don't hit Supabase on every request.
let cache: { data: SettingsMap; expiresAt: number } | null = null
const CACHE_TTL_MS = 30_000

export async function getAllSettings(): Promise<SettingsMap> {
  if (cache && Date.now() < cache.expiresAt) return cache.data

  const db = getSupabaseAdminClient()
  if (!db) return {}

  const { data, error } = await db.from('app_settings').select('key, value')

  if (error) {
    console.warn('[appSettings] failed to load:', error.message)
    return cache?.data ?? {}
  }

  const map: SettingsMap = {}
  for (const row of data ?? []) {
    map[row.key as SettingKey] = row.value ?? undefined
  }
  cache = { data: map, expiresAt: Date.now() + CACHE_TTL_MS }
  return map
}

export async function getSetting(key: SettingKey): Promise<string | undefined> {
  const all = await getAllSettings()
  return all[key]
}

export async function setSettings(updates: SettingsMap): Promise<void> {
  const db = getSupabaseAdminClient()
  if (!db) throw new Error('Supabase admin client not configured')

  const rows = Object.entries(updates).map(([key, value]) => ({
    key,
    value: value ?? null,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await db
    .from('app_settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) throw new Error(error.message)

  // Bust the cache so next request picks up fresh values.
  cache = null
}

export function bustSettingsCache(): void {
  cache = null
}

// Helper: get a boolean feature flag. Returns true when stored as "true",
// falls back to `defaultValue` if not set in DB.
export async function isFeatureEnabled(
  key: SettingKey,
  defaultValue = true,
): Promise<boolean> {
  const val = await getSetting(key)
  if (val === undefined) return defaultValue
  return val === 'true'
}
