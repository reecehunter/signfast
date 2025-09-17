import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error - NextAuth v4 type definitions issue
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3 } from '@/lib/s3'

const bucket = process.env.AWS_S3_BUCKET as string
const prisma = new PrismaClient()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Get session for authentication
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is the document owner
    const document = await prisma.document.findFirst({
      where: {
        id,
        ownerId: session.user.id, // Only allow document owner to download
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 })
    }

    // If fileUrl is an absolute URL (S3), extract the key and fetch from S3
    if (/^https?:\/\//i.test(document.fileUrl)) {
      if (!bucket) {
        return NextResponse.json({ error: 'S3 not configured' }, { status: 500 })
      }

      // Extract the key from the S3 URL
      let key: string

      // Path-style: https://s3.region.amazonaws.com/bucket/key
      const pathStyleMatch = document.fileUrl.match(
        /^https:\/\/s3\.[^\/]+\/amazonaws\.com\/[^\/]+\/(.+)$/
      )
      if (pathStyleMatch) {
        key = pathStyleMatch[1]
      } else {
        // Virtual-hosted-style: https://bucket.s3.region.amazonaws.com/key
        const virtualHostedMatch = document.fileUrl.match(
          /^https:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com\/(.+)$/
        )
        if (virtualHostedMatch) {
          key = virtualHostedMatch[1]
        } else {
          return NextResponse.json({ error: 'Invalid S3 URL format' }, { status: 400 })
        }
      }

      try {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key })
        const result = await s3.send(command)
        const bytes = await result.Body?.transformToByteArray()
        if (!bytes) return NextResponse.json({ error: 'File not found' }, { status: 404 })

        return new NextResponse(new Uint8Array(bytes), {
          headers: {
            'Content-Type': document.mimeType,
            'Content-Disposition': `attachment; filename="${document.fileName}"`,
          },
        })
      } catch (error) {
        console.error('Error fetching from S3:', error)
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
    }

    // Try to fetch from S3 using stored key
    if (!bucket) {
      return NextResponse.json({ error: 'S3 not configured' }, { status: 500 })
    }

    const key = document.fileUrl.replace(/^\/?uploads\/?/, '')
    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key })
      const result = await s3.send(command)
      const bytes = await result.Body?.transformToByteArray()
      if (!bytes) return NextResponse.json({ error: 'File not found' }, { status: 404 })
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          'Content-Type': document.mimeType,
          'Content-Disposition': `attachment; filename="${document.fileName}"`,
        },
      })
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error downloading document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
