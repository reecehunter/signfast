import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string }> }) {
  try {
    const { path } = await params
    const filePath = join(process.cwd(), 'uploads', 'signed', path)
    const fileBuffer = await readFile(filePath)

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="signed-${path}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
