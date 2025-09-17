import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error - NextAuth v4 type definitions issue
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3 } from '@/lib/s3'

const bucket = process.env.AWS_S3_BUCKET as string
const prisma = new PrismaClient()

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string }> }) {
  try {
    const { path } = await params

    // Get session for authentication
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract document ID from the filename
    // Format: signed-{documentId}-{timestamp}.pdf
    const documentIdMatch = path.match(/signed-([^-]+)-/)
    if (!documentIdMatch) {
      return NextResponse.json({ error: 'Invalid file format' }, { status: 400 })
    }

    const documentId = documentIdMatch[1]

    // Check if user is the document owner
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        ownerId: session.user.id, // Only allow document owner
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 })
    }

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
        'Cache-Control': 'private, max-age=3600', // Private cache
      },
    })
  } catch (error) {
    console.error('Error accessing signed document:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
