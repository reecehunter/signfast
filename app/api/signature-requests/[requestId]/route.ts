import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
// @ts-expect-error - NextAuth v4 type definitions issue
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { requestId } = await params

    // Find all signatures with this requestId
    const signatures = await prisma.signature.findMany({
      where: { requestId },
      include: {
        document: {
          select: {
            ownerId: true,
            title: true,
          },
        },
      },
    })

    if (signatures.length === 0) {
      return NextResponse.json({ error: 'Signature request not found' }, { status: 404 })
    }

    // Check if the user owns the document
    const documentOwnerId = signatures[0].document.ownerId
    if (documentOwnerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if any signatures are already signed
    const signedSignatures = signatures.filter((sig) => sig.status === 'signed')
    if (signedSignatures.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete signature request with completed signatures' },
        { status: 400 }
      )
    }

    // Update all signatures to deleted status
    await prisma.signature.updateMany({
      where: { requestId },
      data: { status: 'deleted' },
    })

    return NextResponse.json({
      message: 'Signature request deleted successfully',
      deletedCount: signatures.length,
    })
  } catch (error) {
    console.error('Error deleting signature request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
