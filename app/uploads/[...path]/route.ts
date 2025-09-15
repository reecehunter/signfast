import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3 } from '@/lib/s3'
const bucket = process.env.AWS_S3_BUCKET as string

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const key = path.join('/')
    const command = new GetObjectCommand({ Bucket: bucket, Key: key })
    const result = await s3.send(command)

    // Determine content type based on file extension
    const extension = path[path.length - 1].split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'

    switch (extension) {
      case 'pdf':
        contentType = 'application/pdf'
        break
      case 'doc':
        contentType = 'application/msword'
        break
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        break
    }

    const body = await result.Body?.transformToByteArray()
    if (!body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': contentType,
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
