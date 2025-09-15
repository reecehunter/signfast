import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error - NextAuth v4 type definitions issue
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileUrl, signatureAreas, numberOfSigners } = await request.json()

    if (!fileUrl || !signatureAreas || !Array.isArray(signatureAreas)) {
      return NextResponse.json(
        { error: 'File URL and signature areas array are required' },
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

    // Delete existing signature areas and signatures for this document
    await prisma.signatureArea.deleteMany({
      where: {
        documentId: document.id,
      },
    })

    await prisma.signature.deleteMany({
      where: {
        documentId: document.id,
      },
    })

    // Create new signature areas
    const createdAreas = await Promise.all(
      signatureAreas.map((area) =>
        prisma.signatureArea.create({
          data: {
            documentId: document.id,
            type: area.type,
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height,
            pageNumber: area.pageNumber || 1,
            label: area.label,
            signerIndex: area.signerIndex,
          },
        })
      )
    )

    // Update the document with the number of signers
    await prisma.document.update({
      where: { id: document.id },
      data: { numberOfSigners: numberOfSigners || 1 },
    })

    return NextResponse.json({
      message: 'Signature areas saved successfully',
      areas: createdAreas,
    })
  } catch (error) {
    console.error('Error saving signature areas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
