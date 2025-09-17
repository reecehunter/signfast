import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        signatureUsage: {
          where: {
            timestamp: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Current month
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentMonthUsage = user.signatureUsage.length
    const currentMonthBilled = user.signatureUsage.filter((usage) => usage.billed).length

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        planType: user.planType,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionId: user.subscriptionId,
        stripeCustomerId: user.stripeCustomerId,
        freeSignaturesRemaining: user.freeSignaturesRemaining,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      usageStats: {
        freeSignaturesRemaining: user.freeSignaturesRemaining,
        planType: user.planType,
        subscriptionStatus: user.subscriptionStatus,
        currentMonthUsage,
        currentMonthBilled,
        totalUsage: user.signatureUsage.length,
      },
      signatureUsage: user.signatureUsage.map((usage) => ({
        id: usage.id,
        timestamp: usage.timestamp,
        billed: usage.billed,
        stripeUsageRecordId: usage.stripeUsageRecordId,
      })),
    })
  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
