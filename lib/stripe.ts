import Stripe from 'stripe'
import { constructAppUrl } from './utils'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
})

// Stripe Product and Price IDs - these should be created in your Stripe Dashboard
export const STRIPE_CONFIG = {
  PRODUCT_ID: process.env.STRIPE_PRODUCT_ID || 'prod_signature', // Create this in Stripe Dashboard
  METERED_PRICE_ID: process.env.STRIPE_METERED_PRICE_ID || 'price_metered', // $1 per signature
  UNLIMITED_PRICE_ID: process.env.STRIPE_UNLIMITED_PRICE_ID || 'price_unlimited', // $15/month unlimited
}

export async function createStripeCustomer(email: string, name?: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'docusign-alternative',
      },
    })
    return customer
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw error
  }
}

export async function createSubscription(customerId: string, priceId: string) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })
    return subscription
  } catch (error) {
    console.error('Error creating subscription:', error)
    throw error
  }
}

export async function updateSubscription(subscriptionId: string, newPriceId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    })

    return updatedSubscription
  } catch (error) {
    console.error('Error updating subscription:', error)
    throw error
  }
}

export async function createUsageRecord(subscriptionItemId: string, quantity: number = 1) {
  try {
    // Note: For metered billing, you'll need to set up usage-based pricing in Stripe Dashboard
    // and use the appropriate method to record usage. This is a placeholder implementation.
    // You may need to use Stripe's newer meter events API or configure usage-based pricing differently.

    // For now, we'll just log the usage and return a mock response
    console.log(`Recording usage: ${quantity} for subscription item: ${subscriptionItemId}`)

    // TODO: Implement actual usage recording based on your Stripe setup
    // This might involve using meter events or a different API endpoint
    return {
      id: `usage_${Date.now()}`,
      quantity,
      timestamp: Math.floor(Date.now() / 1000),
    }
  } catch (error) {
    console.error('Error creating usage record:', error)
    throw error
  }
}

export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    })
    return subscription
  } catch (error) {
    console.error('Error retrieving subscription:', error)
    throw error
  }
}

export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

export function constructWebhookEvent(payload: string | Buffer, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    return event
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw error
  }
}

// NEW: Create checkout session that requires immediate payment
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  planType: 'unlimited' | 'metered'
) {
  try {
    // For metered billing, don't include quantity in line_items
    const lineItems =
      planType === 'metered' ? [{ price: priceId }] : [{ price: priceId, quantity: 1 }]

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: constructAppUrl(
        '/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=true'
      ),
      cancel_url: constructAppUrl('/dashboard/billing?canceled=true'),
      metadata: {
        userId,
        planType,
      },
      subscription_data: {
        metadata: {
          userId,
          planType,
        },
      },
    })
    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

// Create subscription with immediate payment requirement
export async function createPaidSubscription(customerId: string, priceId: string) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'error_if_incomplete', // Fail if payment can't be completed immediately
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })
    return subscription
  } catch (error) {
    console.error('Error creating paid subscription:', error)
    throw error
  }
}
