import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { sendCompletionEmail } from '@/lib/email'
import { createSignedDocument } from '@/lib/pdf-utils'
import { join } from 'path'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const signature = await prisma.signature.findUnique({
      where: { token },
      include: {
        document: {
          include: {
            signatures: {
              select: {
                id: true,
                signerEmail: true,
                signerName: true,
                status: true,
                signedAt: true,
              },
            },
            signatureAreas: true,
          } as any,
        },
      },
    })

    if (!signature) {
      return NextResponse.json({ error: 'Invalid or expired signing link' }, { status: 404 })
    }

    // Return document data with signature status for this specific token
    return NextResponse.json({
      ...(signature as any).document,
      currentSignature: {
        id: signature.id,
        status: signature.status,
        signerEmail: signature.signerEmail,
        signerName: signature.signerName,
        signedAt: signature.signedAt,
      },
    })
  } catch (error) {
    console.error('Error fetching signing document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { signerName, signerDate, areaData } = await request.json()

    if (!signerName) {
      return NextResponse.json({ error: 'Signer name is required' }, { status: 400 })
    }

    if (!areaData || Object.keys(areaData).length === 0) {
      return NextResponse.json({ error: 'Area data is required' }, { status: 400 })
    }

    const signature = await prisma.signature.findUnique({
      where: { token },
      include: {
        document: {
          include: {
            owner: true,
            signatures: true,
            signatureAreas: true,
          } as any,
        },
      },
    })

    if (!signature) {
      return NextResponse.json({ error: 'Invalid or expired signing link' }, { status: 404 })
    }

    if (signature.status === 'signed') {
      return NextResponse.json({ error: 'Document has already been signed' }, { status: 400 })
    }

    // Create signed PDF
    const originalFilePath = join(
      process.cwd(),
      'uploads',
      (signature as any).document.fileUrl.replace('/uploads/', '')
    )

    // Get signature areas
    const signatureAreas = (signature as any).document.signatureAreas

    const signedDocumentUrl = await createSignedDocument(
      originalFilePath,
      signerName,
      signerDate,
      signature.documentId,
      signatureAreas.map(
        (area: {
          id: string
          type: string
          x: number
          y: number
          width: number
          height: number
          pageNumber: number
          label: string | null
        }) => ({
          id: area.id,
          type: area.type,
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height,
          pageNumber: area.pageNumber,
          label: area.label || undefined,
        })
      ),
      areaData
    )

    // Update signature
    await prisma.signature.update({
      where: { id: signature.id },
      data: {
        status: 'signed',
        signedAt: new Date(),
        signerName,
        signatureData: JSON.stringify(areaData), // Store area data as JSON
        signedDocumentUrl: signedDocumentUrl,
      } as any,
    })

    // Check if all signatures are complete
    const allSignatures = await prisma.signature.findMany({
      where: { documentId: signature.documentId },
    })

    const allSigned = allSignatures.every((sig) => sig.status === 'signed')

    if (allSigned) {
      // Update document status to completed
      await prisma.document.update({
        where: { id: signature.documentId },
        data: { status: 'completed' },
      })

      // Send completion emails to all parties
      const document = (signature as any).document
      const completionPromises = []

      // Get the signed document URL from the most recent signature
      const signedSignature = allSignatures.find((sig) => (sig as any).signedDocumentUrl)
      let signedDocumentUrl =
        (signedSignature as any)?.signedDocumentUrl ||
        `${process.env.NEXTAUTH_URL}/api/documents/${document.id}/download`

      // Convert relative path to full URL if needed
      if (signedDocumentUrl.startsWith('/uploads/')) {
        signedDocumentUrl = `${process.env.NEXTAUTH_URL}${signedDocumentUrl}`
      }

      // Email to document owner
      if (document.owner.email) {
        completionPromises.push(
          sendCompletionEmail({
            to: document.owner.email,
            recipientName: document.owner.name || 'Document Owner',
            documentTitle: document.title,
            documentUrl: signedDocumentUrl,
          })
        )
      }

      // Email to all signers
      for (const sig of allSignatures) {
        if (sig.signerEmail && sig.signerEmail !== document.owner.email) {
          completionPromises.push(
            sendCompletionEmail({
              to: sig.signerEmail,
              recipientName: sig.signerName || 'Signer',
              documentTitle: document.title,
              documentUrl: signedDocumentUrl,
            })
          )
        }
      }

      // Send all emails (don't fail if email sending fails)
      try {
        await Promise.allSettled(completionPromises)
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
      }
    }

    return NextResponse.json({
      message: 'Document signed successfully',
    })
  } catch (error) {
    console.error('Error signing document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
