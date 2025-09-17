// Client-side billing utilities

export interface BillingStatus {
  canSendRequests: boolean
  freeSignaturesRemaining: number
  planType: string
  subscriptionStatus: string | null
  message?: string
}

export async function checkBillingStatus(): Promise<BillingStatus> {
  try {
    const response = await fetch('/api/billing/usage')

    if (!response.ok) {
      throw new Error('Failed to fetch billing status')
    }

    const data = await response.json()

    // Check if user can send requests
    const canSendRequests =
      data.freeSignaturesRemaining > 0 ||
      (data.planType === 'unlimited' && data.subscriptionStatus === 'active') ||
      (data.planType === 'metered' && data.subscriptionStatus === 'active')

    return {
      canSendRequests,
      freeSignaturesRemaining: data.freeSignaturesRemaining,
      planType: data.planType,
      subscriptionStatus: data.subscriptionStatus,
      message: canSendRequests
        ? undefined
        : 'No free signatures remaining and no active paid subscription. Please upgrade to a paid plan to continue sending documents.',
    }
  } catch (error) {
    console.error('Error checking billing status:', error)
    return {
      canSendRequests: false,
      freeSignaturesRemaining: 0,
      planType: 'free',
      subscriptionStatus: null,
      message: 'Unable to check billing status. Please try again.',
    }
  }
}
