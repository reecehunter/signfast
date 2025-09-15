import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3 } from '@/lib/s3'
const bucket = process.env.AWS_S3_BUCKET as string

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string }> }) {
  try {
    const { path } = await params
    const key = `uploads/signed/${path}`
    const command = new GetObjectCommand({ Bucket: bucket, Key: key })
    const result = await s3.send(command)

    const body = await result.Body?.transformToByteArray()
    if (!body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="signed-${path}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
