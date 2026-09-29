import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { publicFilePath } from '../../../../../local/serverClient'

// Serves public-bucket files (e.g. avatars) stored by the local backend.

export const runtime = 'nodejs'

const TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path: parts } = await params
  const [bucket, ...rest] = parts
  let file: string
  try {
    file = publicFilePath(bucket, rest.join('/'))
  } catch {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }
  const ext = path.extname(file).toLowerCase()
  // Only images are ever stored in public buckets; refuse anything else so the
  // route can't be used to serve active content from this origin.
  if (!TYPES[ext])
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const buf = await fs.promises.readFile(file)
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': TYPES[ext],
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
