import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '../../../../supabase/server'
import { listUserTransfers } from '../../../../lib/transfer'
import { listUserCollects } from '../../../../lib/collect'
import { listUserBoards } from '../../../../lib/boards'
import { listTemplates } from '../../../../lib/templates'
import { listContactGroups } from '../../../../lib/contactGroups'
import { listUserWorkspaces } from '../../../../lib/workspace'
import { listApiKeys } from '../../../../lib/apiKeys'
import { getCustomDomain } from '../../../../lib/customDomain'
import {
  listActivity,
  recordActivity,
  requestContext,
} from '../../../../lib/activity'
import { getRedisClient } from '../../../../redisClient'
import { rateLimit, getClientIp } from '../../../../rateLimit'
import { brand } from '../../../../brand'

export const dynamic = 'force-dynamic'

// Right-of-access export (GDPR Art. 15 / 20): everything Zync stores about the
// signed-in user as one machine-readable JSON download. Secrets (password
// hashes, API key hashes, upload tokens) are never included.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  if (!supabase || !user)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const rl = await rateLimit(`export:${getClientIp(req)}`, {
    limit: 5,
    windowSeconds: 3600,
  })
  if (!rl.success)
    return NextResponse.json(
      { error: 'Too many exports — try again later.' },
      { status: 429 },
    )

  const settle = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p
    } catch {
      return fallback
    }
  }

  const [
    transfers,
    collects,
    boards,
    templates,
    contactGroups,
    workspaces,
    apiKeys,
    customDomain,
    contacts,
    activity,
    history,
  ] = await Promise.all([
    settle(listUserTransfers(user.id), []),
    settle(listUserCollects(user.id), []),
    settle(listUserBoards(user.id), []),
    settle(listTemplates(user.id), []),
    settle(listContactGroups(user.id), []),
    settle(listUserWorkspaces(user.id), []),
    settle(listApiKeys(user.id), []),
    settle(getCustomDomain(user.id), null),
    settle(
      getRedisClient().zrevrange(`contacts:${user.id}`, 0, -1),
      [] as string[],
    ),
    settle(listActivity(user.id), []),
    settle(
      Promise.resolve(
        supabase
          .from('transfers')
          .select('slug, title, files, file_count, total_bytes, created_at')
          .order('created_at', { ascending: false }),
      ).then((r) => (r.data as unknown[]) ?? []),
      [] as unknown[],
    ),
  ])

  const exportDoc = {
    exportedAt: new Date().toISOString(),
    service: brand.name,
    account: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      profile: user.user_metadata ?? {},
    },
    transfers: transfers.map((t) => {
      const safe: Record<string, unknown> = { ...t }
      delete safe.passwordHash
      delete safe.uploadTokenHash
      delete safe.recipientTokens
      return {
        ...safe,
        passwordProtected: !!t.passwordHash,
        recipients: Object.values(t.recipientTokens ?? {}),
      }
    }),
    transferHistory: history,
    fileRequests: collects,
    boards,
    templates,
    contacts,
    contactGroups,
    workspaces,
    apiKeys: apiKeys.map((k) => ({
      id: k.id,
      name: k.name,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
    })),
    customDomain,
    activity,
  }

  void recordActivity(user.id, 'account.exported', requestContext(req))

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(exportDoc, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${brand.name.toLowerCase()}-export-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
