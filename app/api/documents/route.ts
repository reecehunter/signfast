import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const documents = await prisma.document.findMany({
      where: {
        ownerId: session.user.id,
      },
      include: {
        signatures: {
          where: {
            status: {
              not: 'deleted',
            },
          },
        },
        signatureAreas: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
