import { NextResponse } from 'next/server'
// @ts-expect-error - NextAuth v4 type definitions issue
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { getSubscription } from '@/lib/stripe'
import Stripe from 'stripe'

// Extended Stripe subscription type that includes snake_case properties
interface StripeSubscriptionWithSnakeCase extends Stripe.Subscription {
  current_period_start: number
  current_period_end: number
}

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let stripeSubscription: StripeSubscriptionWithSnakeCase | null = null
    if (user.subscriptionId) {
      try {
        const subscription = await getSubscription(user.subscriptionId)
        stripeSubscription = subscription as unknown as StripeSubscriptionWithSnakeCase
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error)
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        planType: user.planType,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionId: user.subscriptionId,
        stripeCustomerId: user.stripeCustomerId,
        freeSignaturesRemaining: user.freeSignaturesRemaining,
      },
      stripeSubscription: stripeSubscription
        ? {
            id: stripeSubscription.id,
            status: stripeSubscription.status,
            priceId: stripeSubscription.items?.data?.[0]?.price?.id,
            currentPeriodStart: stripeSubscription.current_period_start,
            currentPeriodEnd: stripeSubscription.current_period_end,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching subscription status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.subscriptionId) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Fetch current subscription from Stripe
    const stripeSubscription = await getSubscription(user.subscriptionId)

    // Determine plan type based on price ID
    const priceId = stripeSubscription.items?.data?.[0]?.price?.id
    const planType = priceId === process.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited' : 'metered'

    // Update user with correct subscription status and plan type
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: stripeSubscription.status,
        planType: planType,
      },
    })

    return NextResponse.json({
      message: 'Subscription status updated',
      user: {
        id: updatedUser.id,
        planType: updatedUser.planType,
        subscriptionStatus: updatedUser.subscriptionStatus,
      },
      stripeSubscription: {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        priceId: priceId,
      },
    })
  } catch (error) {
    console.error('Error updating subscription status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
