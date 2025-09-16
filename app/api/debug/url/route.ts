import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl, constructAppUrl } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG ENDPOINT CALLED')
    console.log('  - Request URL:', request.url)
    console.log('  - Request headers:', Object.fromEntries(request.headers.entries()))

    const baseUrl = getBaseUrl()
    const testSigningUrl = constructAppUrl('/sign/test-token')
    const testCompletionUrl = constructAppUrl('/api/signed-documents/test-file.pdf')

    const debugInfo = {
      environment: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      nextAuthUrlType: typeof process.env.NEXTAUTH_URL,
      nextAuthUrlLength: process.env.NEXTAUTH_URL?.length,
      baseUrl,
      testSigningUrl,
      testCompletionUrl,
      timestamp: new Date().toISOString(),
      allEnvVars: Object.keys(process.env).filter(
        (key) => key.includes('URL') || key.includes('DOMAIN') || key.includes('HOST')
      ),
    }

    console.log('🔍 DEBUG INFO:', debugInfo)

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error('Debug URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
