import { PDFDocument, rgb } from 'pdf-lib'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { uploadToS3, downloadFromS3, extractS3KeyFromUrl } from '@/lib/s3'

export async function addSignatureToPDF(
  originalPdfPath: string,
  signerName: string,
  signerDate: string,
  outputPath: string,
  signatureAreas?: {
    id: string
    type: string
    x: number
    y: number
    width: number
    height: number
    pageNumber: number
    label?: string
  }[],
  areaData?: { [areaId: string]: { type: string; data: string } }
): Promise<void> {
  try {
    // Read the original PDF (supports local temp path or S3 URL)
    let pdfBytes: Buffer

    if (originalPdfPath.startsWith('http')) {
      // Handle S3 URL
      const s3Key = extractS3KeyFromUrl(originalPdfPath)
      if (!s3Key) {
        throw new Error(`Unable to extract S3 key from URL: ${originalPdfPath}`)
      }
      pdfBytes = await downloadFromS3(s3Key)
    } else {
      // Handle local file path
      pdfBytes = await readFile(originalPdfPath)
    }

    const pdfDoc = await PDFDocument.load(pdfBytes)

    // Get all pages
    const pages = pdfDoc.getPages()

    // Process each signature area
    if (signatureAreas && signatureAreas.length > 0 && areaData) {
      for (const area of signatureAreas) {
        const areaInfo = areaData[area.id]
        if (!areaInfo) {
          console.warn(`No data found for area ${area.id}`)
          continue
        }

        const pageIndex = area.pageNumber - 1 // Convert to 0-based index
        if (pageIndex < 0 || pageIndex >= pages.length) {
          console.warn(`Invalid page number ${area.pageNumber} for area ${area.id}`)
          continue
        }

        const targetPage = pages[pageIndex]
        const { width, height } = targetPage.getSize()

        // Convert coordinates (PDF origin is bottom-left, but our coordinates are top-left)
        const x = area.x
        const y = height - area.y - area.height
        const areaWidth = area.width
        const areaHeight = area.height

        // Ensure area is within page bounds
        const clampedX = Math.max(0, Math.min(x, width - areaWidth))
        const clampedY = Math.max(0, Math.min(y, height - areaHeight))

        console.log(`Processing ${area.type} area:`, {
          original: area,
          final: { x: clampedX, y: clampedY, width: areaWidth, height: areaHeight },
          pageSize: { width, height },
          data: areaInfo.data,
        })

        // Add content based on area type
        switch (area.type) {
          case 'signature':
            // Add signature image
            try {
              const signatureImageBytes = Buffer.from(
                areaInfo.data.replace(/^data:image\/[a-z]+;base64,/, ''),
                'base64'
              )
              const signatureImage = await pdfDoc.embedPng(signatureImageBytes)

              // Get original signature dimensions
              const originalWidth = signatureImage.width
              const originalHeight = signatureImage.height
              const aspectRatio = originalWidth / originalHeight

              console.log('Signature image dimensions:', {
                originalWidth,
                originalHeight,
                aspectRatio,
                areaWidth,
                areaHeight,
              })

              // Calculate available space (90% of the signature area with margins)
              const availableWidth = areaWidth - 10 // 5px margin on each side
              const availableHeight = areaHeight - 10 // 5px margin on top and bottom

              // Calculate dimensions that maintain aspect ratio and fit within available space
              let signatureWidth, signatureHeight

              if (aspectRatio > availableWidth / availableHeight) {
                // Signature is wider than available space ratio - constrain by width
                signatureWidth = availableWidth
                signatureHeight = availableWidth / aspectRatio
              } else {
                // Signature is taller than available space ratio - constrain by height
                signatureHeight = availableHeight
                signatureWidth = availableHeight * aspectRatio
              }

              console.log('Calculated signature dimensions:', {
                signatureWidth,
                signatureHeight,
                availableWidth,
                availableHeight,
                finalAspectRatio: signatureWidth / signatureHeight,
              })

              // Position signature in bottom-left of the area
              const signatureX = clampedX + 5 // Small margin from left edge
              const signatureY = clampedY + 5 // Small margin from bottom edge

              targetPage.drawImage(signatureImage, {
                x: signatureX,
                y: signatureY,
                width: signatureWidth,
                height: signatureHeight,
              })
              console.log(`Successfully drew signature at:`, {
                x: signatureX,
                y: signatureY,
                width: signatureWidth,
                height: signatureHeight,
                originalWidth,
                originalHeight,
                aspectRatio,
              })
            } catch (drawError) {
              console.error('Error drawing signature image:', drawError)
            }
            break

          case 'name':
            // Add signer name as text
            try {
              targetPage.drawText(areaInfo.data, {
                x: clampedX + 5, // Small margin from left edge
                y: clampedY + 5, // Small margin from bottom edge
                size: Math.min(12, areaHeight * 0.3),
                color: rgb(0, 0, 0),
              })
              console.log(`Successfully drew name: ${areaInfo.data}`)
            } catch (drawError) {
              console.error('Error drawing name text:', drawError)
            }
            break

          case 'date':
            // Add date as text
            try {
              targetPage.drawText(areaInfo.data, {
                x: clampedX + 5, // Small margin from left edge
                y: clampedY + 5, // Small margin from bottom edge
                size: Math.min(12, areaHeight * 0.3),
                color: rgb(0, 0, 0),
              })
              console.log(`Successfully drew date: ${areaInfo.data}`)
            } catch (drawError) {
              console.error('Error drawing date text:', drawError)
            }
            break

          case 'business':
            // Add business name as text
            try {
              targetPage.drawText(areaInfo.data, {
                x: clampedX + 5, // Small margin from left edge
                y: clampedY + 5, // Small margin from bottom edge
                size: Math.min(12, areaHeight * 0.3),
                color: rgb(0, 0, 0),
              })
              console.log(`Successfully drew business name: ${areaInfo.data}`)
            } catch (drawError) {
              console.error('Error drawing business name text:', drawError)
            }
            break

          default:
            console.warn(`Unknown area type: ${area.type}`)
        }
      }
    } else {
      console.log('No signature areas or area data defined')
    }

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save()
    await writeFile(outputPath, modifiedPdfBytes)

    console.log('PDF signed successfully:', outputPath)
  } catch (error) {
    console.error('Error adding signature to PDF:', error)
    throw error
  }
}

export async function createSignedDocument(
  originalFileUrlOrPath: string,
  signerName: string,
  signerDate: string,
  documentId: string,
  signatureAreas?: {
    id: string
    type: string
    x: number
    y: number
    width: number
    height: number
    pageNumber: number
    label?: string
  }[],
  areaData?: { [areaId: string]: { type: string; data: string } }
): Promise<string> {
  try {
    // Ensure tmp directory exists
    const tmpDir = join(process.cwd(), 'tmp')
    await mkdir(tmpDir, { recursive: true })

    // Generate unique filename for signed document
    const timestamp = Date.now()
    const signedFileName = `signed-${documentId}-${timestamp}.pdf`
    const signedFilePath = join(tmpDir, signedFileName)

    // Add signature to PDF
    await addSignatureToPDF(
      originalFileUrlOrPath,
      signerName,
      signerDate,
      signedFilePath,
      signatureAreas,
      areaData
    )

    // Upload to S3 and return URL
    const buffer = await readFile(signedFilePath)
    const { url } = await uploadToS3({
      key: `uploads/signed/${signedFileName}`,
      contentType: 'application/pdf',
      body: buffer,
      cacheControl: 'public, max-age=31536000, immutable',
      acl: 'private',
    })
    return url
  } catch (error) {
    console.error('Error creating signed document:', error)
    throw error
  }
}

export async function createFinalMergedDocument(
  originalFileUrlOrPath: string,
  documentId: string,
  allSignatures: Array<{
    signerName: string
    signerDate: string
    signatureData: string
    signerIndex: number
  }>,
  signatureAreas: Array<{
    id: string
    type: string
    x: number
    y: number
    width: number
    height: number
    pageNumber: number
    label?: string
    signerIndex?: number | null
  }>
): Promise<string> {
  try {
    // Ensure tmp directory exists
    const tmpDir = join(process.cwd(), 'tmp')
    await mkdir(tmpDir, { recursive: true })

    // Generate unique filename for final merged document
    const timestamp = Date.now()
    const finalFileName = `final-${documentId}-${timestamp}.pdf`
    const finalFilePath = join(tmpDir, finalFileName)

    // Read the original PDF (supports local temp path or S3 URL)
    let pdfBytes: Buffer

    if (originalFileUrlOrPath.startsWith('http')) {
      // Handle S3 URL
      const s3Key = extractS3KeyFromUrl(originalFileUrlOrPath)
      if (!s3Key) {
        throw new Error(`Unable to extract S3 key from URL: ${originalFileUrlOrPath}`)
      }
      pdfBytes = await downloadFromS3(s3Key)
    } else {
      // Handle local file path
      pdfBytes = await readFile(originalFileUrlOrPath)
    }

    const pdfDoc = await PDFDocument.load(pdfBytes)

    // Get all pages
    const pages = pdfDoc.getPages()

    // Process each signature
    for (const signature of allSignatures) {
      const signatureAreaData = JSON.parse(signature.signatureData)

      // Get signature areas for this signer (including areas for all signers)
      const signerAreas = signatureAreas.filter(
        (area) => area.signerIndex === null || area.signerIndex === signature.signerIndex
      )

      // Process each signature area for this signer
      for (const area of signerAreas) {
        const areaInfo = signatureAreaData[area.id]
        if (!areaInfo) continue

        const targetPage = pages[area.pageNumber - 1]
        if (!targetPage) continue

        const { width, height } = targetPage.getSize()
        const areaWidth = area.width
        const areaHeight = area.height
        const clampedX = Math.max(0, Math.min(area.x, width - areaWidth))
        const clampedY = Math.max(0, Math.min(height - area.y - areaHeight, height - areaHeight))

        // Add content based on area type
        switch (area.type) {
          case 'signature':
            // Add signature image
            try {
              const signatureImageBytes = Buffer.from(
                areaInfo.data.replace(/^data:image\/[a-z]+;base64,/, ''),
                'base64'
              )
              const signatureImage = await pdfDoc.embedPng(signatureImageBytes)

              // Get original signature dimensions
              const originalWidth = signatureImage.width
              const originalHeight = signatureImage.height
              const aspectRatio = originalWidth / originalHeight

              // Calculate available space (90% of the signature area with margins)
              const availableWidth = areaWidth - 10 // 5px margin on each side
              const availableHeight = areaHeight - 10 // 5px margin on top and bottom

              // Calculate dimensions that maintain aspect ratio and fit within available space
              let signatureWidth, signatureHeight

              if (aspectRatio > availableWidth / availableHeight) {
                // Signature is wider than available space ratio - constrain by width
                signatureWidth = availableWidth
                signatureHeight = availableWidth / aspectRatio
              } else {
                // Signature is taller than available space ratio - constrain by height
                signatureHeight = availableHeight
                signatureWidth = availableHeight * aspectRatio
              }

              // Center the signature within the area
              const centerX = clampedX + (areaWidth - signatureWidth) / 2
              const centerY = clampedY + (areaHeight - signatureHeight) / 2

              targetPage.drawImage(signatureImage, {
                x: centerX,
                y: centerY,
                width: signatureWidth,
                height: signatureHeight,
              })

              console.log(`Successfully drew signature for signer ${signature.signerIndex}`)
            } catch (drawError) {
              console.error('Error drawing signature image:', drawError)
            }
            break

          case 'name':
            // Add name as text
            try {
              targetPage.drawText(areaInfo.data, {
                x: clampedX + 5, // Small margin from left edge
                y: clampedY + 5, // Small margin from bottom edge
                size: Math.min(12, areaHeight * 0.3),
                color: rgb(0, 0, 0),
              })
              console.log(`Successfully drew name: ${areaInfo.data}`)
            } catch (drawError) {
              console.error('Error drawing name text:', drawError)
            }
            break

          case 'date':
            // Add date as text
            try {
              targetPage.drawText(areaInfo.data, {
                x: clampedX + 5, // Small margin from left edge
                y: clampedY + 5, // Small margin from bottom edge
                size: Math.min(12, areaHeight * 0.3),
                color: rgb(0, 0, 0),
              })
              console.log(`Successfully drew date: ${areaInfo.data}`)
            } catch (drawError) {
              console.error('Error drawing date text:', drawError)
            }
            break

          case 'business':
            // Add business name as text
            try {
              targetPage.drawText(areaInfo.data, {
                x: clampedX + 5, // Small margin from left edge
                y: clampedY + 5, // Small margin from bottom edge
                size: Math.min(12, areaHeight * 0.3),
                color: rgb(0, 0, 0),
              })
              console.log(`Successfully drew business name: ${areaInfo.data}`)
            } catch (drawError) {
              console.error('Error drawing business name text:', drawError)
            }
            break

          default:
            console.warn(`Unknown area type: ${area.type}`)
        }
      }
    }

    // Save the final merged PDF
    const finalPdfBytes = await pdfDoc.save()
    await writeFile(finalFilePath, finalPdfBytes)

    // Upload to S3 and return URL
    const { url } = await uploadToS3({
      key: `uploads/signed/${finalFileName}`,
      contentType: 'application/pdf',
      body: finalPdfBytes,
      cacheControl: 'public, max-age=31536000, immutable',
      acl: 'private',
    })
    console.log('Final merged PDF created successfully')
    return url
  } catch (error) {
    console.error('Error creating final merged document:', error)
    throw error
  }
}
