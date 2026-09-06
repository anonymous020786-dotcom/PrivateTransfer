import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '../../../supabase/server'
import {
  createContactGroup,
  listContactGroups,
} from '../../../lib/contactGroups'
import { ok, err } from '../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized.', { status: 401 })
  const groups = await listContactGroups(user.id)
  return ok({ groups })
}

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  emails: z.array(z.string().email()).min(1).max(50),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized.', { status: 401 })
  const body = CreateSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')
  const group = await createContactGroup(
    user.id,
    body.data.name,
    body.data.emails,
  )
  return ok({ group }, { status: 201 })
}
