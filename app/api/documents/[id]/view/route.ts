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
        ownerId: session.user.id, // Only allow document owner to view
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

      console.log('Document fileUrl:', document.fileUrl)
      console.log('S3 bucket:', bucket)

      // Extract the key from the S3 URL
      // Handle both path-style and virtual-hosted-style URLs
      let key: string

      // Extract key from S3 URL - handle path-style URLs
      // Format: https://s3.region.amazonaws.com/bucket/key
      console.log('Testing regex on URL:', document.fileUrl)

      // Try a simpler regex first
      const simpleMatch = document.fileUrl.match(/s3\.us-east-1\.amazonaws\.com\/[^\/]+\/(.+)/)
      console.log('Simple regex test:', simpleMatch)

      const pathStyleMatch = document.fileUrl.match(
        /^https:\/\/s3\.[^\/]+\/amazonaws\.com\/[^\/]+\/(.+)$/
      )
      console.log('Path-style regex test:', pathStyleMatch)

      if (pathStyleMatch) {
        key = pathStyleMatch[1]
        console.log('Extracted key from path-style URL:', key)
      } else if (simpleMatch) {
        key = simpleMatch[1]
        console.log('Extracted key using simple regex:', key)
      } else {
        // Virtual-hosted-style: https://bucket.s3.region.amazonaws.com/key
        const virtualHostedMatch = document.fileUrl.match(
          /^https:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com\/(.+)$/
        )
        if (virtualHostedMatch) {
          key = virtualHostedMatch[1]
          console.log('Extracted key from virtual-hosted URL:', key)
        } else {
          console.error('Invalid S3 URL format:', document.fileUrl)
          return NextResponse.json({ error: 'Invalid S3 URL format' }, { status: 400 })
        }
      }

      try {
        console.log('Attempting to fetch from S3:', { bucket, key })
        const command = new GetObjectCommand({ Bucket: bucket, Key: key })
        const result = await s3.send(command)
        const bytes = await result.Body?.transformToByteArray()
        if (!bytes) {
          console.error('No bytes returned from S3')
          return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        console.log('Successfully fetched file from S3, size:', bytes.length)
        return new NextResponse(new Uint8Array(bytes), {
          headers: {
            'Content-Type': document.mimeType,
            'Content-Disposition': `inline; filename="${document.fileName}"`,
            'Cache-Control': 'private, max-age=3600', // Private cache for security
            'Access-Control-Allow-Origin': '*', // Allow CORS for PDF viewing
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      } catch (error) {
        console.error('Error fetching from S3:', error)
        console.error('S3 error details:', {
          bucket,
          key,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode:
            error instanceof Error && 'code' in error
              ? (error as Error & { code?: string }).code
              : undefined,
          errorName: error instanceof Error ? error.name : 'Unknown',
        })
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
    }

    // Fallback for relative URLs (shouldn't happen with current setup)
    return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 })
  } catch (error) {
    console.error('Error viewing document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
