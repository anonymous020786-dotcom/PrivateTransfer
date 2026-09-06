import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AVATAR_BUCKET } from './supabase/config'

// Profile-photo storage. Prefers Supabase Storage when available; otherwise
// falls back to a configurable upload endpoint (e.g. a Hostinger-hosted upload
// handler) via HOSTINGER_UPLOAD_URL + HOSTINGER_API_TOKEN. Returns a public URL.

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB
export const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

export async function uploadAvatar(
  supabase: SupabaseClient | null,
  userId: string,
  file: File,
): Promise<UploadResult> {
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: 'Image must be 5 MB or smaller.' }
  }
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return { ok: false, error: 'Unsupported image type.' }
  }

  const ext = file.type.split('/')[1] || 'png'
  const path = `${userId}/${Date.now()}.${ext}`

  // 1) Hostinger (or any) PHP upload endpoint — preferred when configured, so
  //    photos can live on your own shared hosting even while Supabase handles
  //    authentication.
  const endpoint = process.env.HOSTINGER_UPLOAD_URL
  if (endpoint) {
    try {
      const form = new FormData()
      form.append('file', file, path)
      form.append('path', path)
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: process.env.HOSTINGER_API_TOKEN
          ? { Authorization: `Bearer ${process.env.HOSTINGER_API_TOKEN}` }
          : undefined,
        body: form,
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        return {
          ok: false,
          error: data.error || `Upload failed (${res.status}).`,
        }
      }
      const data = (await res.json().catch(() => ({}))) as { url?: string }
      if (!data.url)
        return { ok: false, error: 'Upload endpoint returned no URL.' }
      return { ok: true, url: data.url }
    } catch {
      return { ok: false, error: 'Could not reach the upload endpoint.' }
    }
  }

  // 2) Supabase Storage fallback
  if (supabase) {
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) return { ok: false, error: error.message }
    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    return { ok: true, url: data.publicUrl }
  }

  return { ok: false, error: 'No storage backend configured.' }
}
