import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl, constructAppUrl } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    const testSigningUrl = constructAppUrl('/sign/test-token')
    const testCompletionUrl = constructAppUrl('/api/signed-documents/test-file.pdf')

    return NextResponse.json({
      environment: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      baseUrl,
      testSigningUrl,
      testCompletionUrl,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Debug URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
