import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '../../../supabase/server'
import { listTemplates, saveTemplate } from '../../../lib/templates'

export const dynamic = 'force-dynamic'

const SettingsSchema = z.object({
  title: z.string().max(200).optional(),
  message: z.string().max(1000).optional(),
  expiryDays: z.number().int().min(1).max(365).optional(),
  maxDownloads: z.number().int().positive().nullable().optional(),
  notifyEmail: z.string().email().optional().or(z.literal('')),
  notifyEveryDownload: z.boolean().optional(),
  burnAfterRead: z.boolean().optional(),
  background: z.string().max(500).optional(),
  webhookUrl: z.string().url().max(500).optional().or(z.literal('')),
})

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  settings: SettingsSchema,
})

export async function GET(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const templates = await listTemplates(user.id)
  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = CreateSchema.safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const existing = await listTemplates(user.id)
  if (existing.length >= 20)
    return NextResponse.json({ error: 'Max 20 templates.' }, { status: 400 })

  const tpl = {
    id: crypto.randomUUID(),
    userId: user.id,
    name: body.data.name,
    settings: body.data.settings,
    createdAt: new Date().toISOString(),
  }
  await saveTemplate(tpl)
  return NextResponse.json({ template: tpl }, { status: 201 })
}
