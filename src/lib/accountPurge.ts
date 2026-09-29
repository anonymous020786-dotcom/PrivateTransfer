import 'server-only'
import { getRedisClient } from '../redisClient'
import {
  deleteTransfer,
  listUserTransfers,
  removeUserTransferIndex,
} from './transfer'
import { deleteStoredObjects } from './storage'
import { deleteCollect, listUserCollects } from './collect'
import { deleteBoard, listUserBoards } from './boards'
import { deleteTemplate, listTemplates } from './templates'
import { deleteContactGroup, listContactGroups } from './contactGroups'
import { deleteApiKey, listApiKeys } from './apiKeys'
import { deleteCustomDomain } from './customDomain'
import { deleteWorkspace, listUserWorkspaces, removeMember } from './workspace'
import { deletePaste, listUserPastes } from './paste'
import { clearActivity } from './activity'

// Erases everything Zync stores for an account (right to erasure). Called
// before the auth user itself is deleted, by self-service and admin deletion.
// Each step is independent and best-effort so one failure can't leave the
// rest behind.

export type PurgeReport = Record<string, number>

export async function purgeUserData(uid: string): Promise<PurgeReport> {
  const report: PurgeReport = {}
  const step = async (name: string, fn: () => Promise<number>) => {
    try {
      report[name] = await fn()
    } catch (e) {
      console.error(`[purge] ${name} failed for ${uid}`, e)
      report[name] = -1
    }
  }

  await step('transfers', async () => {
    const all = await listUserTransfers(uid, { includeIncomplete: true })
    for (const t of all) {
      await deleteStoredObjects(t.files.map((f) => f.key)).catch(() => {})
      await deleteTransfer(t.slug)
      await removeUserTransferIndex(uid, t.slug)
    }
    return all.length
  })
  await step('fileRequests', async () => {
    const all = await listUserCollects(uid)
    for (const c of all) {
      await deleteStoredObjects(c.files.map((f) => f.key)).catch(() => {})
      await deleteCollect(c.slug, uid)
    }
    return all.length
  })
  await step('boards', async () => {
    const all = await listUserBoards(uid)
    for (const b of all) await deleteBoard(b.id, uid)
    return all.length
  })
  await step('templates', async () => {
    const all = await listTemplates(uid)
    for (const t of all) await deleteTemplate(uid, t.id)
    return all.length
  })
  await step('contactGroups', async () => {
    const all = await listContactGroups(uid)
    for (const g of all) await deleteContactGroup(g.id, uid)
    return all.length
  })
  await step('apiKeys', async () => {
    const all = await listApiKeys(uid)
    for (const k of all) await deleteApiKey(uid, k.id)
    return all.length
  })
  await step('workspaces', async () => {
    const all = await listUserWorkspaces(uid)
    for (const w of all) {
      if (w.ownerId === uid) await deleteWorkspace(w.id)
      else await removeMember(w.id, uid)
    }
    return all.length
  })
  await step('pastes', async () => {
    const all = await listUserPastes(uid)
    for (const p of all) await deletePaste(p)
    return all.length
  })
  await step('customDomain', async () => {
    await deleteCustomDomain(uid)
    return 1
  })
  await step('misc', async () => {
    const redis = getRedisClient()
    await redis.del(`contacts:${uid}`, `pins:${uid}`)
    await clearActivity(uid)
    return 1
  })
  return report
}
