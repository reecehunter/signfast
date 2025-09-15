import { NextResponse } from 'next/server'
// @ts-expect-error - NextAuth v4 type definitions issue
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { createStripeCustomer } from '@/lib/stripe'

const prisma = new PrismaClient()

export async function POST() {
  try {
    // Check if user is authenticated (you might want to add admin role check here)
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Finding users without Stripe customer IDs...')

    const usersWithoutStripe = await prisma.user.findMany({
      where: {
        stripeCustomerId: null,
      },
    })

    console.log(`📊 Found ${usersWithoutStripe.length} users without Stripe customer IDs`)

    if (usersWithoutStripe.length === 0) {
      return NextResponse.json({
        message: 'All users already have Stripe customer IDs!',
        migrated: 0,
      })
    }

    console.log('🚀 Creating Stripe customers for existing users...')

    let migrated = 0
    const errors = []

    for (const user of usersWithoutStripe) {
      try {
        console.log(`Creating Stripe customer for user: ${user.email}`)

        const stripeCustomer = await createStripeCustomer(user.email, user.name || undefined)

        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripeCustomerId: stripeCustomer.id,
          },
        })

        console.log(`✅ Created Stripe customer ${stripeCustomer.id} for ${user.email}`)
        migrated++
      } catch (error) {
        console.error(`❌ Failed to create Stripe customer for ${user.email}:`, error)
        errors.push({
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      message: `Migration completed! Migrated ${migrated} users.`,
      migrated,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
