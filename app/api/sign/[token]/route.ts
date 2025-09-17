import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { sendCompletionEmail } from '@/lib/email'
import { createSignedDocument, createFinalMergedDocument } from '@/lib/pdf-utils'
import { trackSignatureUsage } from '@/lib/billing'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3 } from '@/lib/s3'

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
                signerIndex: true,
                status: true,
                signedAt: true,
                requestId: true,
              },
              orderBy: {
                signerIndex: 'asc',
              },
            },
            signatureAreas: true,
          },
        },
      },
    })

    if (!signature) {
      return NextResponse.json({ error: 'Invalid or expired signing link' }, { status: 404 })
    }

    if (signature.status === 'deleted') {
      return NextResponse.json(
        { error: 'This signature request has been deleted' },
        { status: 410 }
      )
    }

    // No need to check signing order - all signers can sign in parallel

    // Filter signatures to only include those from the same request
    const requestSignatures = signature.document.signatures.filter(
      (sig) => sig.requestId === signature.requestId
    )

    // Filter signature areas to only show areas for this signer or areas for all signers
    const relevantAreas = signature.document.signatureAreas.filter(
      (area) => area.signerIndex === null || area.signerIndex === signature.signerIndex
    )

    // Return document data with signature status for this specific token
    return NextResponse.json({
      ...signature.document,
      signatures: requestSignatures, // Only return signatures from the same request
      signatureAreas: relevantAreas,
      currentSignature: {
        id: signature.id,
        status: signature.status,
        signerEmail: signature.signerEmail,
        signerName: signature.signerName,
        signerIndex: signature.signerIndex,
        signedAt: signature.signedAt,
      },
      signingInfo: {
        currentSignerIndex: signature.signerIndex,
        totalSigners: requestSignatures.length, // Use request-specific signature count
        isLastSigner: signature.signerIndex === requestSignatures.length - 1,
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
            signatures: {
              orderBy: {
                signerIndex: 'asc',
              },
            },
            signatureAreas: true,
          },
        },
      },
    })

    if (!signature) {
      return NextResponse.json({ error: 'Invalid or expired signing link' }, { status: 404 })
    }

    if (signature.status === 'deleted') {
      return NextResponse.json(
        { error: 'This signature request has been deleted' },
        { status: 410 }
      )
    }

    if (signature.status === 'signed') {
      return NextResponse.json({ error: 'Document has already been signed' }, { status: 400 })
    }

    // No need to check signing order - all signers can sign in parallel

    // Create signed PDF
    const originalFileUrlOrPath = signature.document.fileUrl

    // Get signature areas for this signer (including areas for all signers)
    const signatureAreas = signature.document.signatureAreas.filter(
      (area) => area.signerIndex === null || area.signerIndex === signature.signerIndex
    )

    const signedDocumentUrl = await createSignedDocument(
      originalFileUrlOrPath,
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
      },
    })

    // Track signature usage for billing
    const billingResult = await trackSignatureUsage(
      signature.document.ownerId,
      signature.documentId,
      signature.id
    )

    if (!billingResult.success) {
      // If billing fails, we should still allow the signature but log the error
      console.error('Billing tracking failed:', billingResult.message)
    }

    // Check if all signatures are complete for this specific request
    const updatedSignatures = await prisma.signature.findMany({
      where: {
        documentId: signature.documentId,
        requestId: signature.requestId, // Only check signatures from the same request
      },
      orderBy: {
        signerIndex: 'asc',
      },
    })

    const allSigned = updatedSignatures.every((sig) => sig.status === 'signed')

    // No need to notify next signer - all signers receive emails simultaneously

    if (allSigned) {
      // Create final merged document with all signatures
      const originalFileUrlOrPath = signature.document.fileUrl

      // Prepare signature data for merging
      const signaturesForMerging = updatedSignatures.map((sig) => ({
        signerName: sig.signerName || 'Signer',
        signerDate: sig.signedAt
          ? new Date(sig.signedAt).toLocaleDateString()
          : new Date().toLocaleDateString(),
        signatureData: sig.signatureData || '{}',
        signerIndex: sig.signerIndex,
      }))

      // Create the final merged document
      const finalDocumentUrl = await createFinalMergedDocument(
        originalFileUrlOrPath,
        signature.documentId,
        signaturesForMerging,
        signature.document.signatureAreas.map((area) => ({
          ...area,
          label: area.label || undefined,
        }))
      )

      // Update document status to completed and store the final document URL
      await prisma.document.update({
        where: { id: signature.documentId },
        data: {
          status: 'completed',
          finalDocumentUrl: finalDocumentUrl,
        },
      })

      // Download the final document for email attachment
      let documentBuffer: Buffer | undefined
      let documentFileName: string | undefined

      try {
        // Extract S3 key from the final document URL
        const s3KeyMatch = finalDocumentUrl.match(/s3\.[^\/]+\.amazonaws\.com\/[^\/]+\/(.+)/)
        if (s3KeyMatch) {
          const s3Key = s3KeyMatch[1]
          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET as string,
            Key: s3Key,
          })
          const result = await s3.send(command)
          const bytes = await result.Body?.transformToByteArray()

          if (bytes) {
            documentBuffer = Buffer.from(bytes)
            documentFileName = `signed-${signature.document.title.replace(
              /[^a-zA-Z0-9]/g,
              '_'
            )}.pdf`
          }
        }
      } catch (error) {
        console.error('Error downloading document for email attachment:', error)
        // Continue without attachment if download fails
      }

      // Send completion emails to all parties with PDF attachment
      const document = signature.document
      const completionPromises = []

      // Email to document owner
      if (document.owner.email) {
        completionPromises.push(
          sendCompletionEmail({
            to: document.owner.email,
            recipientName: document.owner.name || 'Document Owner',
            documentTitle: document.title,
            attachmentBuffer: documentBuffer,
            attachmentFileName: documentFileName,
          })
        )
      }

      // Email to all signers
      for (const sig of updatedSignatures) {
        if (sig.signerEmail && sig.signerEmail !== document.owner.email) {
          completionPromises.push(
            sendCompletionEmail({
              to: sig.signerEmail,
              recipientName: sig.signerName || 'Signer',
              documentTitle: document.title,
              attachmentBuffer: documentBuffer,
              attachmentFileName: documentFileName,
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
