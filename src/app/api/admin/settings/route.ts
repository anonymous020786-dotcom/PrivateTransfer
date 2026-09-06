import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '../../../../supabase/server'
import { isSupabaseConfigured, isAdminEmail } from '../../../../supabase/config'
import {
  getAllSettings,
  setSettings,
  type SettingKey,
} from '../../../../lib/appSettings'
import { ok, err } from '../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

async function requireAdmin(): Promise<NextResponse | null> {
  if (!isSupabaseConfigured()) return err('Not configured.', { status: 503 })
  const user = await getCurrentUser()
  if (!user || !isAdminEmail(user.email))
    return err('Forbidden.', { status: 403 })
  return null
}

export async function GET(): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied

  const settings = await getAllSettings()

  // Mask sensitive values — return placeholder so the UI can show "••••••"
  // without leaking the actual secret. The UI only sends back values that changed.
  const masked = { ...settings }
  const secretKeys: SettingKey[] = [
    'smtp_pass',
    'r2_secret_access_key',
    's3_secret_access_key',
    'virustotal_api_key',
  ]
  for (const k of secretKeys) {
    if (masked[k]) masked[k] = '__masked__'
  }

  return ok({ settings: masked })
}

const PatchSchema = z.object({
  smtp_host: z.string().max(200).optional(),
  smtp_port: z.string().max(6).optional(),
  smtp_user: z.string().max(200).optional(),
  smtp_pass: z.string().max(200).optional(),
  smtp_from: z.string().max(200).optional(),
  storage_provider: z.enum(['r2', 's3']).optional(),
  r2_account_id: z.string().max(200).optional(),
  r2_access_key_id: z.string().max(200).optional(),
  r2_secret_access_key: z.string().max(200).optional(),
  r2_bucket_name: z.string().max(200).optional(),
  s3_access_key_id: z.string().max(200).optional(),
  s3_secret_access_key: z.string().max(200).optional(),
  s3_region: z.string().max(50).optional(),
  s3_bucket: z.string().max(200).optional(),
  s3_storage_class: z
    .enum(['STANDARD', 'INTELLIGENT_TIERING', 'STANDARD_IA', 'GLACIER_IR'])
    .optional(),
  feature_email_notifications: z.enum(['true', 'false']).optional(),
  feature_transfer_tracking: z.enum(['true', 'false']).optional(),
  feature_recaptcha: z.enum(['true', 'false']).optional(),
  feature_guest_uploads: z.enum(['true', 'false']).optional(),
  feature_registration: z.enum(['true', 'false']).optional(),
  feature_cloud_transfers: z.enum(['true', 'false']).optional(),
  feature_white_label_emails: z.enum(['true', 'false']).optional(),
  feature_virus_scan: z.enum(['true', 'false']).optional(),
  virustotal_api_key: z.string().max(200).optional(),
})

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied

  const body = PatchSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')

  // Filter out placeholder values (masked secrets that weren't changed).
  const updates: Partial<Record<SettingKey, string>> = {}
  for (const [k, v] of Object.entries(body.data)) {
    if (v !== undefined && v !== '__masked__') {
      updates[k as SettingKey] = v
    }
  }

  try {
    await setSettings(updates)
  } catch (e) {
    console.error('[admin/settings] save failed:', e)
    return err('Failed to save settings.', { status: 500 })
  }

  return ok({ saved: true })
}
