'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestEmailPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState('')

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult('')

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name: name || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult('✅ Test email sent successfully!')
      } else {
        setResult(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Test Email Functionality</CardTitle>
          <CardDescription>
            Send a test completion email to verify Resend is working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTestEmail} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email Address</Label>
              <Input
                id='email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='Enter email address'
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='name'>Name (Optional)</Label>
              <Input
                id='name'
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Enter name'
              />
            </div>
            <Button type='submit' className='w-full' disabled={!email || isLoading}>
              {isLoading ? 'Sending...' : 'Send Test Email'}
            </Button>
          </form>
          {result && (
            <div className='mt-4 p-3 rounded-md bg-gray-100'>
              <p className='text-sm'>{result}</p>
            </div>
          )}
          <div className='mt-4 text-xs text-gray-500'>
            <p>Make sure you have set RESEND_API_KEY in your .env file</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
