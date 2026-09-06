import { NextResponse } from 'next/server'
import { listUserTransfers } from '../../../../lib/transfer'
import { getSupabaseServerClient } from '../../../../supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient()
  if (!supabase)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const transfers = await listUserTransfers(user.id)

  return NextResponse.json(
    transfers.map(
      ({
        passwordHash,
        passwordHint,
        notifiedAt,
        recipientEmails,
        files,
        notifyEmail,
        notifyEveryDownload,
        webhookUrl,
        workspaceId,
        boardIds,
        ...rest
      }) => ({
        ...rest,
        passwordProtected: !!passwordHash,
        passwordHint: passwordHint ?? null,
        notifyEmail: notifyEmail ?? null,
        notifyEveryDownload: notifyEveryDownload ?? false,
        webhookUrl: webhookUrl ?? null,
        fileCount: files.length,
        files: files.map(({ name, size, type }) => ({ name, size, type })),
        workspaceId: workspaceId ?? null,
        boardIds: boardIds ?? [],
      }),
    ),
  )
}
