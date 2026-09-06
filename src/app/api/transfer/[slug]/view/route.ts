import { NextRequest, NextResponse } from 'next/server'
import { getTransfer, updateTransfer } from '../../../../../lib/transfer'

export const dynamic = 'force-dynamic'

// POST /api/transfer/[slug]/view — lightweight page-view counter (fire-and-forget from client)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const transfer = await getTransfer(slug)
  if (!transfer || !transfer.completed)
    return NextResponse.json({ ok: false }, { status: 404 })

  const current = transfer.pageViewCount ?? 0
  void updateTransfer(slug, { pageViewCount: current + 1 })

  return NextResponse.json({ ok: true })
}
