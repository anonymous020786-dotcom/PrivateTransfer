import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  createPaste,
  listUserPastes,
  pasteMeta,
  PASTE_EXPIRY_OPTIONS,
  PASTE_MAX_BYTES,
} from '../../../lib/paste'
import { getSupabaseServerClient } from '../../../supabase/server'
import { lookupApiKey } from '../../../lib/apiKeys'
import { rateLimit, getClientIp } from '../../../rateLimit'
import { ok, err, tooManyRequests } from '../../../lib/apiResponse'
import { brand } from '../../../brand'

export const dynamic = 'force-dynamic'

const ALLOWED_TTLS: number[] = PASTE_EXPIRY_OPTIONS.map((o) => o.seconds)

const BodySchema = z.object({
  content: z.string().min(1),
  title: z.string().max(200).default(''),
  language: z
    .string()
    .regex(/^[a-z0-9+#.-]{1,32}$/)
    .default('text'),
  encrypted: z.boolean().default(false),
  password: z.string().max(200).optional(),
  burnAfterRead: z.boolean().default(false),
  expiresIn: z
    .number()
    .int()
    .refine((n) => ALLOWED_TTLS.includes(n), 'Unsupported expiry')
    .default(86400),
})

async function callerId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer zync_')) {
    return (await lookupApiKey(auth.slice(7)))?.userId ?? null
  }
  const supabase = await getSupabaseServerClient()
  return supabase
    ? ((await supabase.auth.getUser()).data.user?.id ?? null)
    : null
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`paste-create:${getClientIp(req)}`, {
    limit: 30,
    windowSeconds: 600,
  })
  if (!rl.success) return tooManyRequests(rl)

  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')
  if (Buffer.byteLength(body.data.content) > PASTE_MAX_BYTES)
    return err('Paste is larger than 1 MB.', { status: 413 })

  const { record, deleteToken } = await createPaste({
    ownerId: await callerId(req),
    title: body.data.title,
    language: body.data.language,
    content: body.data.content,
    encrypted: body.data.encrypted,
    password: body.data.password || undefined,
    burnAfterRead: body.data.burnAfterRead,
    ttlSeconds: body.data.expiresIn,
  })
  return ok(
    {
      ...pasteMeta(record),
      url: `${brand.url}/paste/${record.slug}`,
      deleteToken,
    },
    { status: 201, rl },
  )
}

// The signed-in user's active pastes (metadata only).
export async function GET(req: NextRequest) {
  const uid = await callerId(req)
  if (!uid) return err('Unauthorized.', { status: 401 })
  return ok({ pastes: (await listUserPastes(uid)).map(pasteMeta) })
}
