import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '../../../../supabase/server'
import { uploadAvatar } from '../../../../storage'
import { rateLimit, getClientIp } from '../../../../rateLimit'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Authentication is not configured.' },
      { status: 503 },
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const limit = await rateLimit(`avatar:${getClientIp(request)}`, {
    limit: 10,
    windowSeconds: 600,
  })
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many uploads.' }, { status: 429 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  const result = await uploadAvatar(supabase, user.id, file)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Persist avatar URL on the user profile.
  await supabase.auth.updateUser({ data: { avatar_url: result.url } })

  return NextResponse.json({ ok: true, url: result.url })
}
