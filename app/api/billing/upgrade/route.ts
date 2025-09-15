import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error - NextAuth v4 type definitions issue
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { upgradeToUnlimited, downgradeToMetered } from '@/lib/billing'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planType } = await request.json()

    if (!planType || !['metered', 'unlimited'].includes(planType)) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }

    let result
    if (planType === 'unlimited') {
      result = await upgradeToUnlimited(session.user.id)
    } else {
      result = await downgradeToMetered(session.user.id)
    }

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    // If result contains a checkout URL, return it for redirect
    if ('checkoutUrl' in result && result.checkoutUrl) {
      return NextResponse.json({
        message: result.message,
        checkoutUrl: result.checkoutUrl,
      })
    }

    return NextResponse.json({ message: result.message })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
