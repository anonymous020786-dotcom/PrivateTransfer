import 'server-only'
import crypto from 'crypto'
import { persist, table, type Row } from './db'

// A PostgREST-flavoured query builder over the local JSON store, covering the
// subset of supabase-js that Zync uses: select / insert / upsert / update /
// delete with eq, neq, in, gt(e), lt(e), ilike, order, limit, range, single and
// maybeSingle. Row-level access is enforced by a caller-supplied policy, which
// mirrors the RLS policies in /supabase/*.sql.

export type Policy = {
  canRead: (tableName: string, row: Row) => boolean
  canWrite: (tableName: string, row: Row) => boolean
}

export const SERVICE_ROLE: Policy = {
  canRead: () => true,
  canWrite: () => true,
}

type Op = 'select' | 'insert' | 'upsert' | 'update' | 'delete'
type Filter = (row: Row) => boolean
type Result = {
  data: unknown
  error: { message: string; code?: string } | null
  count?: number | null
}

// Columns Postgres would default on insert.
const DEFAULTS: Record<string, () => Row> = {
  transfers: () => ({ files: [], file_count: 0, total_bytes: 0 }),
  posts: () => ({
    category: 'General',
    excerpt: '',
    tags: [],
    author: 'Zync Team',
    content: '',
    cover_image: null,
    published: true,
  }),
}

function project(row: Row, cols: string | undefined): Row {
  if (!cols || cols.trim() === '*') return { ...row }
  const out: Row = {}
  for (const c of cols.split(',').map((s) => s.trim())) {
    if (c) out[c] = row[c] ?? null
  }
  return out
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  return a < b ? -1 : 1
}

function likeToRegex(pattern: string): RegExp {
  const esc = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${esc.replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i')
}

export class LocalQuery implements PromiseLike<Result> {
  private op: Op = 'select'
  private cols: string | undefined
  private payload: Row[] = []
  private patch: Row = {}
  private conflict = 'id'
  private filters: Filter[] = []
  private orders: Array<{ col: string; asc: boolean }> = []
  private max: number | null = null
  private offset = 0
  private mode: 'many' | 'single' | 'maybe' = 'many'
  private returning = false
  private wantCount = false

  constructor(
    private readonly name: string,
    private readonly policy: Policy,
  ) {}

  select(cols?: string, opts?: { count?: 'exact' }): this {
    if (this.op === 'select') this.cols = cols
    else {
      this.returning = true
      this.cols = cols
    }
    if (opts?.count) this.wantCount = true
    return this
  }

  insert(rows: Row | Row[]): this {
    this.op = 'insert'
    this.payload = Array.isArray(rows) ? rows : [rows]
    return this
  }

  upsert(rows: Row | Row[], opts?: { onConflict?: string }): this {
    this.op = 'upsert'
    this.payload = Array.isArray(rows) ? rows : [rows]
    this.conflict = opts?.onConflict ?? 'id'
    return this
  }

  update(patch: Row): this {
    this.op = 'update'
    this.patch = patch
    return this
  }

  delete(): this {
    this.op = 'delete'
    return this
  }

  eq(col: string, v: unknown): this {
    this.filters.push((r) => r[col] === v)
    return this
  }
  neq(col: string, v: unknown): this {
    this.filters.push((r) => r[col] !== v)
    return this
  }
  in(col: string, vs: unknown[]): this {
    this.filters.push((r) => vs.includes(r[col]))
    return this
  }
  gt(col: string, v: unknown): this {
    this.filters.push((r) => compare(r[col], v) > 0)
    return this
  }
  gte(col: string, v: unknown): this {
    this.filters.push((r) => compare(r[col], v) >= 0)
    return this
  }
  lt(col: string, v: unknown): this {
    this.filters.push((r) => compare(r[col], v) < 0)
    return this
  }
  lte(col: string, v: unknown): this {
    this.filters.push((r) => compare(r[col], v) <= 0)
    return this
  }
  ilike(col: string, pattern: string): this {
    const re = likeToRegex(pattern)
    this.filters.push((r) => re.test(String(r[col] ?? '')))
    return this
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orders.push({ col, asc: opts?.ascending ?? true })
    return this
  }
  limit(n: number): this {
    this.max = n
    return this
  }
  range(from: number, to: number): this {
    this.offset = from
    this.max = to - from + 1
    return this
  }
  single(): this {
    this.mode = 'single'
    return this
  }
  maybeSingle(): this {
    this.mode = 'maybe'
    return this
  }

  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    let result: Result
    try {
      result = this.execute()
    } catch (e) {
      result = { data: null, error: { message: (e as Error).message } }
    }
    return Promise.resolve(result).then(onfulfilled, onrejected)
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) => f(row))
  }

  private shape(rows: Row[], count?: number): Result {
    const projected = rows.map((r) => project(r, this.cols))
    const countField = this.wantCount ? { count: count ?? rows.length } : {}
    if (this.mode === 'many')
      return { data: projected, error: null, ...countField }
    if (projected.length > 1)
      return {
        data: null,
        error: { message: 'Multiple rows returned', code: 'PGRST116' },
      }
    if (projected.length === 0 && this.mode === 'single')
      return {
        data: null,
        error: { message: 'No rows found', code: 'PGRST116' },
      }
    return { data: projected[0] ?? null, error: null, ...countField }
  }

  private execute(): Result {
    const rows = table(this.name)
    const now = new Date().toISOString()

    if (this.op === 'select') {
      let out = rows.filter(
        (r) => this.policy.canRead(this.name, r) && this.matches(r),
      )
      const total = out.length
      for (const o of [...this.orders].reverse()) {
        out = [...out].sort(
          (a, b) => compare(a[o.col], b[o.col]) * (o.asc ? 1 : -1),
        )
      }
      out = out.slice(
        this.offset,
        this.max === null ? undefined : this.offset + this.max,
      )
      return this.shape(out, total)
    }

    if (this.op === 'insert' || this.op === 'upsert') {
      const written: Row[] = []
      for (const input of this.payload) {
        const keys = this.conflict.split(',').map((s) => s.trim())
        const existing =
          this.op === 'upsert'
            ? rows.find((r) => keys.every((k) => r[k] === input[k]))
            : undefined
        if (existing) {
          const next = { ...existing, ...input, updated_at: now }
          if (!this.policy.canWrite(this.name, next))
            return { data: null, error: { message: 'Permission denied' } }
          Object.assign(existing, next)
          written.push(existing)
        } else {
          const row: Row = {
            id: crypto.randomUUID(),
            ...(DEFAULTS[this.name]?.() ?? {}),
            created_at: now,
            updated_at: now,
            ...input,
          }
          if (!this.policy.canWrite(this.name, row))
            return { data: null, error: { message: 'Permission denied' } }
          rows.push(row)
          written.push(row)
        }
      }
      persist()
      return this.returning ? this.shape(written) : { data: null, error: null }
    }

    if (this.op === 'update') {
      const hit = rows.filter(
        (r) => this.policy.canWrite(this.name, r) && this.matches(r),
      )
      for (const r of hit) Object.assign(r, this.patch, { updated_at: now })
      persist()
      return this.returning ? this.shape(hit) : { data: null, error: null }
    }

    // delete
    const hit = rows.filter(
      (r) => this.policy.canWrite(this.name, r) && this.matches(r),
    )
    for (const r of hit) rows.splice(rows.indexOf(r), 1)
    persist()
    return this.returning ? this.shape(hit) : { data: null, error: null }
  }
}
