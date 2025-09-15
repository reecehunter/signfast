import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error - NextAuth v4 type definitions issue
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { deleteFromS3, extractS3KeyFromUrl } from '@/lib/s3'

const prisma = new PrismaClient()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Find the document and verify ownership
    const document = await prisma.document.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
      include: {
        signatures: true,
        signatureAreas: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Find the document and verify ownership
    const document = await prisma.document.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
      include: {
        signatures: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if document can be deleted
    // Allow deletion if:
    // 1. Document is draft
    // 2. Document is completed
    // 3. Document has signatures and all are signed (regardless of document status)
    const allSignaturesSigned =
      document.signatures.length > 0 && document.signatures.every((sig) => sig.status === 'signed')

    const canDelete =
      document.status === 'draft' || document.status === 'completed' || allSignaturesSigned

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Cannot delete document that is currently being processed for signing' },
        { status: 400 }
      )
    }

    // Delete the physical file
    try {
      // Check if it's an S3 URL or local file
      if (/^https?:\/\//i.test(document.fileUrl)) {
        // S3 file - extract key and delete from S3
        const s3Key = extractS3KeyFromUrl(document.fileUrl)
        if (s3Key) {
          await deleteFromS3(s3Key)
        }
      } else {
        // Local file
        const fileName = document.fileUrl.split('/').pop()
        if (fileName) {
          const filePath = join(process.cwd(), 'uploads', fileName)
          await unlink(filePath)
        }
      }
    } catch (fileError) {
      console.error('Error deleting file:', fileError)
      // Continue with database deletion even if file deletion fails
    }

    // Delete the document from database (signatures will be deleted due to cascade)
    await prisma.document.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
