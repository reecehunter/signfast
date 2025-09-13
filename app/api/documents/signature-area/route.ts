import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileUrl, signatureArea } = await request.json()

    if (!fileUrl || !signatureArea) {
      return NextResponse.json(
        { error: 'File URL and signature area are required' },
        { status: 400 }
      )
    }

    // Find the document by file URL and verify ownership
    const document = await prisma.document.findFirst({
      where: {
        fileUrl,
        ownerId: session.user.id,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete existing signature areas for this document
    await prisma.signatureArea.deleteMany({
      where: {
        documentId: document.id,
      },
    })

    // Create new signature area
    const createdArea = await prisma.signatureArea.create({
      data: {
        documentId: document.id,
        type: 'signature',
        x: signatureArea.x,
        y: signatureArea.y,
        width: signatureArea.width,
        height: signatureArea.height,
        pageNumber: signatureArea.pageNumber || 1,
        label: 'Signature',
      },
    })

    return NextResponse.json({
      message: 'Signature area saved successfully',
      area: createdArea,
    })
  } catch (error) {
    console.error('Error saving signature area:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
