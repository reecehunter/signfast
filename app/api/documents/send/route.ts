import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error - NextAuth v4 type definitions issue
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { sendSigningEmail } from '@/lib/email'
import { createSignedDocument } from '@/lib/pdf-utils'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { documentId, signers, selfSignatureData, selfSignerIndex, selfSignerInfo } =
      await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    if (!signers || !Array.isArray(signers) || signers.length === 0) {
      return NextResponse.json({ error: 'Signers array is required' }, { status: 400 })
    }

    // Verify document ownership
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
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

    // Check if document has signature areas
    if (!document.signatureAreas || document.signatureAreas.length === 0) {
      return NextResponse.json(
        {
          error:
            'Document has no signature areas defined. Please add signature areas before sending.',
        },
        { status: 400 }
      )
    }

    // Validate signer count matches document configuration
    if (signers.length !== document.numberOfSigners) {
      return NextResponse.json(
        {
          error: `Document requires exactly ${document.numberOfSigners} signers, but ${signers.length} were provided`,
        },
        { status: 400 }
      )
    }

    // Generate a single requestId for all signatures in this request
    const requestId = crypto.randomUUID()

    // Create signature records for all signers
    const createdSignatures = await Promise.all(
      signers.map((signer: { email: string; name: string }, index: number) =>
        prisma.signature.create({
          data: {
            documentId,
            signerEmail: signer.email,
            signerName: signer.name || null,
            signerIndex: index,
            requestId,
            status: 'pending',
          },
        })
      )
    )

    // Handle self-signing if provided
    if (selfSignatureData && selfSignerIndex !== null && selfSignerIndex !== undefined) {
      const selfSignature = createdSignatures[selfSignerIndex]
      if (selfSignature) {
        // Create signed PDF for the self-signed signature
        const originalFileUrlOrPath = document.fileUrl

        // Get signature areas for this signer
        const signatureAreas = document.signatureAreas.filter(
          (area) => area.signerIndex === null || area.signerIndex === selfSignerIndex
        )

        const signedDocumentUrl = await createSignedDocument(
          originalFileUrlOrPath,
          selfSignerInfo?.name || selfSignature.signerName || 'Signer',
          new Date().toLocaleDateString(),
          documentId,
          signatureAreas.map((area) => ({
            id: area.id,
            type: area.type,
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height,
            pageNumber: area.pageNumber,
            label: area.label || undefined,
          })),
          selfSignatureData
        )

        // Update the self-signature record
        await prisma.signature.update({
          where: { id: selfSignature.id },
          data: {
            status: 'signed',
            signedAt: new Date(),
            signerName: selfSignerInfo?.name || selfSignature.signerName,
            signerEmail: selfSignerInfo?.email || selfSignature.signerEmail,
            signatureData: JSON.stringify(selfSignatureData),
            signedDocumentUrl: signedDocumentUrl,
          },
        })
      }
    }

    // Update document status to "sent"
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'sent' },
    })

    // Send signing emails to all signers simultaneously (skip self-signer)
    const emailPromises = createdSignatures
      .filter((signature) => {
        // Skip sending email to the self-signer
        if (selfSignatureData && selfSignerIndex !== null && selfSignerIndex !== undefined) {
          return signature.signerIndex !== selfSignerIndex
        }
        return true
      })
      .map((signature) =>
        sendSigningEmail({
          to: signature.signerEmail,
          signerName: signature.signerName || 'Signer',
          documentTitle: document.title,
          signingUrl: `${process.env.NEXTAUTH_URL}/sign/${signature.token}`,
        }).catch((emailError) => {
          console.error(`Email sending failed for ${signature.signerEmail}:`, emailError)
          // Don't fail the request if individual emails fail
        })
      )

    // Send all emails (don't fail if email sending fails)
    try {
      await Promise.allSettled(emailPromises)
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      message: 'Document sent for signature successfully',
      signatures: createdSignatures,
    })
  } catch (error) {
    console.error('Send document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
