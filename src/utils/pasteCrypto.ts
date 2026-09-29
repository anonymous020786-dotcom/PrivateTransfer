'use client'

// AES-256-GCM for pastes. The key never leaves the browser: it is appended to
// the share link as the URL fragment (#…), which browsers do not send to the
// server. Ciphertext is stored as base64(iv ‖ ciphertext).

const b64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const toUrl = (s: string) =>
  s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromUrl = (s: string) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/')
  return t + '='.repeat((4 - (t.length % 4)) % 4)
}

// btoa on a spread array overflows the stack for large inputs; chunk it.
function bytesToB64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

export async function encryptText(
  text: string,
): Promise<{ ciphertext: string; key: string }> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text),
  )
  const out = new Uint8Array(12 + ct.byteLength)
  out.set(iv)
  out.set(new Uint8Array(ct), 12)
  const raw = await crypto.subtle.exportKey('raw', key)
  return { ciphertext: bytesToB64(out), key: toUrl(b64(raw)) }
}

export async function decryptText(
  ciphertext: string,
  keyUrl: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    unb64(fromUrl(keyUrl)),
    'AES-GCM',
    false,
    ['decrypt'],
  )
  const bytes = unb64(ciphertext)
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.subarray(0, 12) },
    key,
    bytes.subarray(12),
  )
  return new TextDecoder().decode(pt)
}
