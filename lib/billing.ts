import { PrismaClient } from '@prisma/client'
import { createUsageRecord, getSubscription, STRIPE_CONFIG } from './stripe'

const prisma = new PrismaClient()

export interface BillingResult {
  success: boolean
  message: string
  usageRecorded: boolean
  billed: boolean
}

export interface CanSendRequestResult {
  canSend: boolean
  message: string
}

export async function canUserSendRequest(userId: string): Promise<CanSendRequestResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return {
        canSend: false,
        message: 'User not found',
      }
    }

    // Check if user has free signatures remaining
    if (user.freeSignaturesRemaining > 0) {
      return {
        canSend: true,
        message: 'User has free signatures remaining',
      }
    }

    // Check if user has an active subscription
    if (user.planType === 'unlimited' && user.subscriptionStatus === 'active') {
      return {
        canSend: true,
        message: 'User has unlimited plan with active subscription',
      }
    }

    if (
      user.planType === 'metered' &&
      user.subscriptionId &&
      user.subscriptionStatus === 'active'
    ) {
      return {
        canSend: true,
        message: 'User has metered plan with active subscription',
      }
    }

    // User has no free signatures and no active subscription
    return {
      canSend: false,
      message:
        'No free signatures remaining and no active paid subscription. Please upgrade to a paid plan to continue sending documents.',
    }
  } catch (error) {
    console.error('Error checking if user can send request:', error)
    return {
      canSend: false,
      message: 'Internal server error',
    }
  }
}

export async function trackSignatureUsage(
  userId: string,
  documentId: string,
  signatureId: string
): Promise<BillingResult> {
  try {
    // Get user with subscription info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        signatureUsage: {
          where: {
            signatureId: signatureId,
          },
        },
      },
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
        usageRecorded: false,
        billed: false,
      }
    }

    // Check if this signature has already been tracked
    if (user.signatureUsage.length > 0) {
      return {
        success: true,
        message: 'Signature usage already tracked',
        usageRecorded: true,
        billed: user.signatureUsage[0].billed,
      }
    }

    let usageRecorded = false
    let billed = false
    let stripeUsageRecordId: string | null = null

    // Check if user has free signatures remaining
    if (user.freeSignaturesRemaining > 0) {
      // Use free signature
      await prisma.user.update({
        where: { id: userId },
        data: {
          freeSignaturesRemaining: user.freeSignaturesRemaining - 1,
        },
      })

      // Record usage but don't bill
      await prisma.signatureUsage.create({
        data: {
          userId,
          documentId,
          signatureId,
          billed: false,
        },
      })

      usageRecorded = true
    } else {
      // User has no free signatures, need to bill
      if (user.planType === 'unlimited' && user.subscriptionStatus === 'active') {
        // Unlimited plan - no billing needed (but only if subscription is active)
        await prisma.signatureUsage.create({
          data: {
            userId,
            documentId,
            signatureId,
            billed: false, // Not billed because it's unlimited
          },
        })

        usageRecorded = true
      } else if (
        user.planType === 'metered' &&
        user.subscriptionId &&
        user.subscriptionStatus === 'active'
      ) {
        // Metered billing - create usage record in Stripe
        try {
          const subscription = await getSubscription(user.subscriptionId)
          const subscriptionItemId = subscription.items.data[0].id

          const usageRecord = await createUsageRecord(subscriptionItemId, 1)
          stripeUsageRecordId = usageRecord.id

          // Record usage and mark as billed
          await prisma.signatureUsage.create({
            data: {
              userId,
              documentId,
              signatureId,
              billed: true,
              stripeUsageRecordId,
            },
          })

          usageRecorded = true
          billed = true
        } catch (stripeError) {
          console.error('Error creating Stripe usage record:', stripeError)

          // Still record usage but mark as not billed
          await prisma.signatureUsage.create({
            data: {
              userId,
              documentId,
              signatureId,
              billed: false,
            },
          })

          usageRecorded = true
        }
      } else {
        // No valid subscription - block the signature
        return {
          success: false,
          message:
            'No free signatures remaining and no active paid subscription. Please upgrade to a paid plan to continue signing documents.',
          usageRecorded: false,
          billed: false,
        }
      }
    }

    return {
      success: true,
      message: usageRecorded
        ? billed
          ? 'Signature usage billed'
          : 'Signature usage recorded (free or unlimited)'
        : 'Signature usage recorded',
      usageRecorded,
      billed,
    }
  } catch (error) {
    console.error('Error tracking signature usage:', error)
    return {
      success: false,
      message: 'Internal server error',
      usageRecorded: false,
      billed: false,
    }
  }
}

export async function getUserUsageStats(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      return null
    }

    const currentMonthUsage = user.signatureUsage.length
    const currentMonthBilled = user.signatureUsage.filter((usage) => usage.billed).length

    return {
      freeSignaturesRemaining: user.freeSignaturesRemaining,
      planType: user.planType,
      subscriptionStatus: user.subscriptionStatus,
      currentMonthUsage,
      currentMonthBilled,
      totalUsage: user.signatureUsage.length,
    }
  } catch (error) {
    console.error('Error getting user usage stats:', error)
    return null
  }
}

export async function upgradeToUnlimited(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    let stripeCustomerId = user.stripeCustomerId

    // If user doesn't have a Stripe customer, create one
    if (!stripeCustomerId) {
      const { createStripeCustomer } = await import('./stripe')
      const stripeCustomer = await createStripeCustomer(user.email, user.name || undefined)
      stripeCustomerId = stripeCustomer.id

      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeCustomerId: stripeCustomerId,
        },
      })
    }

    // Create checkout session that requires immediate payment
    const { createCheckoutSession } = await import('./stripe')
    const checkoutSession = await createCheckoutSession(
      stripeCustomerId,
      STRIPE_CONFIG.UNLIMITED_PRICE_ID,
      userId,
      'unlimited'
    )

    return {
      success: true,
      message: 'Checkout session created',
      checkoutUrl: checkoutSession.url,
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return { success: false, message: 'Failed to create checkout session' }
  }
}

export async function downgradeToMetered(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    let stripeCustomerId = user.stripeCustomerId

    // If user doesn't have a Stripe customer, create one
    if (!stripeCustomerId) {
      const { createStripeCustomer } = await import('./stripe')
      const stripeCustomer = await createStripeCustomer(user.email, user.name || undefined)
      stripeCustomerId = stripeCustomer.id

      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeCustomerId: stripeCustomerId,
        },
      })
    }

    // Create checkout session that requires immediate payment
    const { createCheckoutSession } = await import('./stripe')
    const checkoutSession = await createCheckoutSession(
      stripeCustomerId,
      STRIPE_CONFIG.METERED_PRICE_ID,
      userId,
      'metered'
    )

    return {
      success: true,
      message: 'Checkout session created',
      checkoutUrl: checkoutSession.url,
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return { success: false, message: 'Failed to create checkout session' }
  }
}
