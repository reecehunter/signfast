import { NextResponse } from 'next/server'
// @ts-expect-error - NextAuth v4 type definitions issue
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getUserUsageStats } from '@/lib/billing'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      console.log('No session or user ID found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching usage stats for user:', session.user.id)
    const usageStats = await getUserUsageStats(session.user.id)

    if (!usageStats) {
      console.log('No usage stats found for user:', session.user.id)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('Usage stats for user:', session.user.id, usageStats)
    return NextResponse.json(usageStats)
  } catch (error) {
    console.error('Error fetching usage stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
