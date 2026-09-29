import 'server-only'
import fs from 'fs'
import path from 'path'

// Tiny durable JSON document store backing the local backend. The whole
// database is held in memory (shared via globalThis so Next.js dev reloads and
// route bundles see the same instance) and flushed atomically to disk
// (write temp file + rename) shortly after every mutation.

export type Row = Record<string, unknown>

export type LocalUser = {
  id: string
  email: string
  password_hash: string | null
  user_metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  session_version: number
}

export type LocalFactor = {
  id: string
  user_id: string
  secret: string
  friendly_name: string | null
  status: 'unverified' | 'verified'
  created_at: string
  updated_at: string
}

export type LocalOtp = {
  email: string
  type: 'email' | 'signup' | 'recovery' | 'magiclink' | 'email_change'
  code_hash: string
  expires_at: number
  attempts: number
}

export type LocalDbShape = {
  users: LocalUser[]
  factors: LocalFactor[]
  otps: LocalOtp[]
  tables: Record<string, Row[]>
}

export function dataDir(): string {
  return process.env.ZYNC_DATA_DIR || path.join(process.cwd(), '.data')
}

const DB_FILE = () => path.join(dataDir(), 'local-db.json')

type Holder = { db: LocalDbShape; timer: NodeJS.Timeout | null }
const g = globalThis as unknown as { __zyncLocalDb?: Holder }

function empty(): LocalDbShape {
  return { users: [], factors: [], otps: [], tables: {} }
}

function load(): LocalDbShape {
  try {
    const raw = fs.readFileSync(DB_FILE(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<LocalDbShape>
    return { ...empty(), ...parsed, tables: parsed.tables ?? {} }
  } catch {
    return empty()
  }
}

function holder(): Holder {
  if (!g.__zyncLocalDb) g.__zyncLocalDb = { db: load(), timer: null }
  return g.__zyncLocalDb
}

export function getDb(): LocalDbShape {
  const db = holder().db
  // Publish the owner (first account; users are only ever appended) for
  // getAdminEmails() — see config.ts.
  ;(globalThis as { __zyncLocalOwnerEmail?: string }).__zyncLocalOwnerEmail =
    db.users[0]?.email
  return db
}

function flushNow(): void {
  const h = holder()
  h.timer = null
  const file = DB_FILE()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(h.db, null, 1))
  fs.renameSync(tmp, file)
}

// Schedule a debounced flush. Mutations are applied in memory synchronously,
// so readers always see the latest state.
export function persist(): void {
  const h = holder()
  if (h.timer) return
  h.timer = setTimeout(() => {
    try {
      flushNow()
    } catch (e) {
      console.error('[local-db] flush failed', e)
    }
  }, 50)
}

export function table(name: string): Row[] {
  const db = getDb()
  db.tables[name] ??= []
  return db.tables[name]
}
