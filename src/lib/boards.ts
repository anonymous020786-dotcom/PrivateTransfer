import 'server-only'
import { getRedisClient } from '../redisClient'
import { getTransfer, updateTransfer } from './transfer'

export type BoardRecord = {
  id: string
  ownerId: string
  name: string
  description: string
  slugs: string[] // transfer slugs in this board
  createdAt: string
  color: string | null // accent colour for UI
}

const KEY = (id: string) => `board:${id}`
const USER_KEY = (ownerId: string) => `boards:user:${ownerId}`
const TTL = 370 * 24 * 3600

export async function createBoard(
  ownerId: string,
  name: string,
  description = '',
  color: string | null = null,
): Promise<BoardRecord> {
  const redis = getRedisClient()
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  const board: BoardRecord = {
    id,
    ownerId,
    name,
    description,
    slugs: [],
    createdAt: new Date().toISOString(),
    color,
  }
  await redis.set(KEY(id), JSON.stringify(board), 'EX', TTL)
  await redis.zadd(USER_KEY(ownerId), Date.now(), id)
  await redis.expire(USER_KEY(ownerId), TTL)
  return board
}

export async function getBoard(id: string): Promise<BoardRecord | null> {
  const redis = getRedisClient()
  const raw = await redis.get(KEY(id))
  if (!raw) return null
  try {
    const b = JSON.parse(raw) as BoardRecord
    b.description ??= ''
    b.color ??= null
    return b
  } catch {
    return null
  }
}

export async function updateBoard(
  id: string,
  patch: Partial<BoardRecord>,
): Promise<void> {
  const redis = getRedisClient()
  const existing = await getBoard(id)
  if (!existing) return
  const updated = { ...existing, ...patch }
  await redis.set(KEY(id), JSON.stringify(updated), 'EX', TTL)
}

export async function deleteBoard(id: string, ownerId: string): Promise<void> {
  const redis = getRedisClient()
  const board = await getBoard(id)
  if (!board || board.ownerId !== ownerId) return
  // Remove board from all transfers
  for (const slug of board.slugs) {
    const t = await getTransfer(slug)
    if (t) {
      await updateTransfer(slug, {
        boardIds: (t.boardIds ?? []).filter((b) => b !== id),
      })
    }
  }
  await redis.del(KEY(id))
  await redis.zrem(USER_KEY(ownerId), id)
}

export async function listUserBoards(ownerId: string): Promise<BoardRecord[]> {
  const redis = getRedisClient()
  const ids = await redis.zrange(USER_KEY(ownerId), 0, -1)
  if (ids.length === 0) return []
  const boards = await Promise.all(ids.map(getBoard))
  return boards.filter((b): b is BoardRecord => b !== null)
}

export async function addTransferToBoard(
  boardId: string,
  slug: string,
  ownerId: string,
): Promise<boolean> {
  const board = await getBoard(boardId)
  if (!board || board.ownerId !== ownerId) return false
  if (!board.slugs.includes(slug)) {
    await updateBoard(boardId, { slugs: [...board.slugs, slug] })
  }
  const t = await getTransfer(slug)
  if (t && !(t.boardIds ?? []).includes(boardId)) {
    await updateTransfer(slug, { boardIds: [...(t.boardIds ?? []), boardId] })
  }
  return true
}

export async function removeTransferFromBoard(
  boardId: string,
  slug: string,
  ownerId: string,
): Promise<boolean> {
  const board = await getBoard(boardId)
  if (!board || board.ownerId !== ownerId) return false
  await updateBoard(boardId, { slugs: board.slugs.filter((s) => s !== slug) })
  const t = await getTransfer(slug)
  if (t) {
    await updateTransfer(slug, {
      boardIds: (t.boardIds ?? []).filter((b) => b !== boardId),
    })
  }
  return true
}
