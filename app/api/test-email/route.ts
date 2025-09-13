import { NextRequest, NextResponse } from 'next/server'
import { sendCompletionEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const result = await sendCompletionEmail({
      to: email,
      recipientName: name || 'Test User',
      documentTitle: 'Test Document',
      documentUrl: 'https://example.com/test-document.pdf',
    })

    return NextResponse.json({
      message: 'Test email sent successfully',
      result,
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
