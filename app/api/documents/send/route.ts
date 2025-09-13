import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { sendSigningEmail } from '@/lib/email'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { documentId, signerEmail, signerName } = await request.json()

    if (!documentId || !signerEmail) {
      return NextResponse.json(
        { error: 'Document ID and signer email are required' },
        { status: 400 }
      )
    }

    // Verify document ownership
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        ownerId: session.user.id,
      },
      include: {
        signatures: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Documents can be reused for multiple signature requests
    // No need to check for existing signatures

    // Create signature record
    const signature = await prisma.signature.create({
      data: {
        documentId,
        signerEmail,
        signerName: signerName || null,
        status: 'pending',
      },
    })

    // Update document status to "sent" if it's still "draft"
    if (document.status === 'draft') {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'sent' },
      })
    }

    // Send signing email
    try {
      await sendSigningEmail({
        to: signerEmail,
        signerName: signerName || 'Signer',
        documentTitle: document.title,
        signingUrl: `${process.env.NEXTAUTH_URL}/sign/${signature.token}`,
      })
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      message: 'Document sent for signature successfully',
      signature,
    })
  } catch (error) {
    console.error('Send document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
