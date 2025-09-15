import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createStripeCustomer, createSubscription, STRIPE_CONFIG } from '@/lib/stripe'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create Stripe customer
    let stripeCustomerId: string | null = null
    let subscriptionId: string | null = null

    try {
      const stripeCustomer = await createStripeCustomer(email, name)
      stripeCustomerId = stripeCustomer.id

      // Create a metered subscription for pay-per-signature billing
      const subscription = await createSubscription(
        stripeCustomerId,
        STRIPE_CONFIG.METERED_PRICE_ID
      )
      subscriptionId = subscription.id
    } catch (stripeError) {
      console.error('Stripe customer creation failed:', stripeError)
      // Continue with user creation even if Stripe fails
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        stripeCustomerId,
        subscriptionId,
        subscriptionStatus: subscriptionId ? 'incomplete' : null,
        planType: 'free', // Start with free plan
        freeSignaturesRemaining: 5,
      },
    })

    return NextResponse.json(
      { message: 'User created successfully', userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
