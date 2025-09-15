import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
    }

    const event = constructWebhookEvent(body, signature)

    switch (event.type) {
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 })
  }
}

async function handleSubscriptionUpdated(subscription: {
  id?: string
  status?: string
  items?: { data?: { price?: { id?: string } }[] }
}) {
  try {
    if (!subscription.id) {
      console.error('No subscription ID provided')
      return
    }

    const user = await prisma.user.findUnique({
      where: { subscriptionId: subscription.id },
    })

    if (!user) {
      console.error(`No user found for subscription ${subscription.id}`)
      return
    }

    // Update subscription status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: subscription.status,
      },
    })

    // If subscription is now active and was previously incomplete, update plan type
    if (subscription.status === 'active' && user.subscriptionStatus === 'incomplete') {
      const priceId = subscription.items?.data?.[0]?.price?.id
      const planType = priceId === process.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited' : 'metered'

      await prisma.user.update({
        where: { id: user.id },
        data: {
          planType,
        },
      })
    }

    console.log(`Updated subscription ${subscription.id} for user ${user.id}`)
  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionDeleted(subscription: { id?: string }) {
  try {
    if (!subscription.id) {
      console.error('No subscription ID provided')
      return
    }

    const user = await prisma.user.findUnique({
      where: { subscriptionId: subscription.id },
    })

    if (!user) {
      console.error(`No user found for subscription ${subscription.id}`)
      return
    }

    // Update user to free plan
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'canceled',
        planType: 'free',
        subscriptionId: null,
      },
    })

    console.log(`Canceled subscription ${subscription.id} for user ${user.id}`)
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}

async function handleInvoicePaid(invoice: {
  id?: string
  customer?: string | null | { id: string }
}) {
  try {
    const customerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
    if (!customerId) {
      console.error('No customer ID in invoice:', invoice.id)
      return
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    })

    if (!user) {
      console.error(`No user found for customer ${customerId}`)
      return
    }

    // Update subscription status to active
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'active',
      },
    })

    console.log(`Invoice ${invoice.id} paid for user ${user.id}`)
  } catch (error) {
    console.error('Error handling invoice paid:', error)
  }
}

async function handleInvoicePaymentFailed(invoice: {
  id?: string
  customer?: string | null | { id: string }
}) {
  try {
    const customerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
    if (!customerId) {
      console.error('No customer ID in invoice:', invoice.id)
      return
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    })

    if (!user) {
      console.error(`No user found for customer ${customerId}`)
      return
    }

    // Update subscription status to past_due
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'past_due',
      },
    })

    console.log(`Invoice ${invoice.id} payment failed for user ${user.id}`)
  } catch (error) {
    console.error('Error handling invoice payment failed:', error)
  }
}

async function handleSubscriptionCreated(subscription: {
  id?: string
  customer?: string | null | { id: string }
  status?: string
}) {
  try {
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
    if (!customerId || !subscription.id) {
      console.error('Missing subscription data:', subscription)
      return
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    })

    if (!user) {
      console.error(`No user found for customer ${customerId}`)
      return
    }

    // Update user with subscription ID
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
      },
    })

    console.log(`Created subscription ${subscription.id} for user ${user.id}`)
  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

async function handleCheckoutSessionCompleted(session: {
  id?: string
  metadata?: { userId?: string; planType?: string } | null
  subscription?: string | null | { id: string }
}) {
  try {
    const userId = session.metadata?.userId
    const planType = session.metadata?.planType

    if (!userId || !planType) {
      console.error('Missing metadata in checkout session:', session.id)
      return
    }

    // Get the subscription from the session
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

    if (!subscriptionId) {
      console.error('No subscription found in checkout session:', session.id)
      return
    }

    // Update user with subscription details
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionId: subscriptionId,
        subscriptionStatus: 'active',
        planType: planType,
      },
    })

    console.log(
      `Checkout completed for user ${userId}, plan: ${planType}, subscription: ${subscriptionId}`
    )
  } catch (error) {
    console.error('Error handling checkout session completed:', error)
  }
}
