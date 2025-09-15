import { NextResponse } from 'next/server'
// @ts-expect-error - NextAuth v4 type definitions issue
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getUserUsageStats } from '@/lib/billing'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usageStats = await getUserUsageStats(session.user.id)

    if (!usageStats) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(usageStats)
  } catch (error) {
    console.error('Error fetching usage stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
