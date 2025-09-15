import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error - NextAuth v4 type definitions issue
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { join } from 'path'
import { uploadToS3 } from '@/lib/s3'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF, DOC, and DOCX files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to S3
    const key = join('documents', String(session.user.id), fileName).replace(/\\/g, '/')
    const uploaded = await uploadToS3({
      key,
      contentType: file.type,
      body: buffer,
      cacheControl: 'public, max-age=31536000, immutable',
      acl: 'private',
    })

    // Save document to database
    const document = await prisma.document.create({
      data: {
        title,
        fileName: file.name,
        fileUrl: uploaded.url,
        fileSize: file.size,
        mimeType: file.type,
        ownerId: session.user.id,
      },
    })

    return NextResponse.json({
      message: 'Document uploaded successfully',
      document,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
