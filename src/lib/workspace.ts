import 'server-only'
import { randomBytes } from 'crypto'
import { getRedisClient } from '../redisClient'

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export type WorkspaceMember = {
  userId: string
  email: string
  role: WorkspaceRole
  joinedAt: string
}

export type WorkspaceInvite = {
  token: string
  email: string
  role: 'admin' | 'member'
  invitedAt: string
  expiresAt: string
}

export type WorkspaceRecord = {
  id: string
  name: string
  ownerId: string
  members: WorkspaceMember[]
  invites: WorkspaceInvite[]
  color: string | null
  createdAt: string
}

const WS_KEY = (id: string) => `workspace:${id}`
const USER_WS_KEY = (userId: string) => `user:workspaces:${userId}`
const INVITE_KEY = (token: string) => `workspace:invite:${token}`
const TTL = 365 * 24 * 3600

export async function createWorkspace(
  ownerId: string,
  ownerEmail: string,
  name: string,
  color?: string,
): Promise<WorkspaceRecord> {
  const redis = getRedisClient()
  const id = randomBytes(8).toString('hex')
  const record: WorkspaceRecord = {
    id,
    name,
    ownerId,
    members: [
      {
        userId: ownerId,
        email: ownerEmail,
        role: 'owner',
        joinedAt: new Date().toISOString(),
      },
    ],
    invites: [],
    color: color ?? null,
    createdAt: new Date().toISOString(),
  }
  await redis.set(WS_KEY(id), JSON.stringify(record), 'EX', TTL)
  await redis.sadd(USER_WS_KEY(ownerId), id)
  await redis.expire(USER_WS_KEY(ownerId), TTL)
  return record
}

export async function getWorkspace(
  id: string,
): Promise<WorkspaceRecord | null> {
  const redis = getRedisClient()
  const raw = await redis.get(WS_KEY(id))
  if (!raw) return null
  try {
    return JSON.parse(raw) as WorkspaceRecord
  } catch {
    return null
  }
}

export async function saveWorkspace(ws: WorkspaceRecord): Promise<void> {
  const redis = getRedisClient()
  await redis.set(WS_KEY(ws.id), JSON.stringify(ws), 'EX', TTL)
}

export async function deleteWorkspace(id: string): Promise<void> {
  const redis = getRedisClient()
  const ws = await getWorkspace(id)
  if (!ws) return
  for (const m of ws.members) {
    await redis.srem(USER_WS_KEY(m.userId), id)
  }
  for (const inv of ws.invites) {
    await redis.del(INVITE_KEY(inv.token))
  }
  await redis.del(WS_KEY(id))
}

export async function listUserWorkspaces(
  userId: string,
): Promise<WorkspaceRecord[]> {
  const redis = getRedisClient()
  const ids = await redis.smembers(USER_WS_KEY(userId))
  const results = await Promise.all(ids.map(getWorkspace))
  return results
    .filter((r): r is WorkspaceRecord => r !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function createInvite(
  workspaceId: string,
  email: string,
  role: 'admin' | 'member',
): Promise<string> {
  const redis = getRedisClient()
  const ws = await getWorkspace(workspaceId)
  if (!ws) throw new Error('Workspace not found')

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
  const invite: WorkspaceInvite = {
    token,
    email,
    role,
    invitedAt: new Date().toISOString(),
    expiresAt,
  }

  ws.invites = ws.invites.filter((i) => i.email !== email)
  ws.invites.push(invite)
  await saveWorkspace(ws)

  await redis.set(
    INVITE_KEY(token),
    JSON.stringify({ workspaceId, email, role }),
    'EX',
    7 * 24 * 3600,
  )
  return token
}

export async function acceptInvite(
  token: string,
  userId: string,
  userEmail: string,
): Promise<WorkspaceRecord | null> {
  const redis = getRedisClient()
  const raw = await redis.get(INVITE_KEY(token))
  if (!raw) return null
  const { workspaceId, role } = JSON.parse(raw) as {
    workspaceId: string
    email: string
    role: 'admin' | 'member'
  }
  const ws = await getWorkspace(workspaceId)
  if (!ws) return null

  const alreadyMember = ws.members.some((m) => m.userId === userId)
  if (!alreadyMember) {
    ws.members.push({
      userId,
      email: userEmail,
      role,
      joinedAt: new Date().toISOString(),
    })
    ws.invites = ws.invites.filter((i) => i.token !== token)
    await saveWorkspace(ws)
    await redis.sadd(USER_WS_KEY(userId), workspaceId)
    await redis.expire(USER_WS_KEY(userId), TTL)
  }
  await redis.del(INVITE_KEY(token))
  return ws
}

export async function removeMember(
  workspaceId: string,
  userId: string,
): Promise<void> {
  const redis = getRedisClient()
  const ws = await getWorkspace(workspaceId)
  if (!ws) return
  ws.members = ws.members.filter((m) => m.userId !== userId)
  await saveWorkspace(ws)
  await redis.srem(USER_WS_KEY(userId), workspaceId)
}
