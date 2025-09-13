'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Shield, Clock, Users } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900'></div>
          <p className='mt-4 text-gray-600'>Loading...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return null // Will redirect to dashboard
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* Navigation */}
      <nav className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between h-16'>
            <div className='flex items-center'>
              <h1 className='text-xl font-semibold text-gray-900'>SignFast</h1>
            </div>
            <div className='flex items-center space-x-4'>
              <Link href='/auth/signin'>
                <Button variant='outline'>Sign In</Button>
              </Link>
              <Link href='/auth/signup'>
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='text-center'>
          <h1 className='text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl'>
            Simple Electronic
            <span className='text-blue-600'> Signatures</span>
          </h1>
          <p className='mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl'>
            Upload documents, send them for signature, and track the entire process. No complex
            setup required.
          </p>
          <div className='mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8'>
            <div className='rounded-md shadow'>
              <Link href='/auth/signup'>
                <Button size='lg' className='w-full sm:w-auto'>
                  Get Started Free
                </Button>
              </Link>
            </div>
            <div className='mt-3 rounded-md shadow sm:mt-0 sm:ml-3'>
              <Link href='/auth/signin'>
                <Button variant='outline' size='lg' className='w-full sm:w-auto'>
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className='mt-20'>
          <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardHeader>
                <FileText className='h-8 w-8 text-blue-600 mb-2' />
                <CardTitle className='text-lg'>Upload Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Upload PDF, DOC, or DOCX files securely to your dashboard.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className='h-8 w-8 text-blue-600 mb-2' />
                <CardTitle className='text-lg'>Send for Signature</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Send documents to anyone via email with a secure signing link.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className='h-8 w-8 text-blue-600 mb-2' />
                <CardTitle className='text-lg'>Secure & Legal</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  All signatures are legally binding and securely stored.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Clock className='h-8 w-8 text-blue-600 mb-2' />
                <CardTitle className='text-lg'>Track Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Monitor signature status and get notified when complete.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How it works */}
        <div className='mt-20'>
          <div className='text-center'>
            <h2 className='text-3xl font-bold text-gray-900'>How It Works</h2>
            <p className='mt-4 text-lg text-gray-600'>
              Get started with electronic signatures in just a few simple steps
            </p>
          </div>
          <div className='mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3'>
            <div className='text-center'>
              <div className='flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white text-xl font-bold mx-auto'>
                1
              </div>
              <h3 className='mt-4 text-lg font-medium text-gray-900'>Create Account</h3>
              <p className='mt-2 text-gray-600'>Sign up for a free account to get started</p>
            </div>
            <div className='text-center'>
              <div className='flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white text-xl font-bold mx-auto'>
                2
              </div>
              <h3 className='mt-4 text-lg font-medium text-gray-900'>Upload Document</h3>
              <p className='mt-2 text-gray-600'>Upload your document and add a title</p>
            </div>
            <div className='text-center'>
              <div className='flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white text-xl font-bold mx-auto'>
                3
              </div>
              <h3 className='mt-4 text-lg font-medium text-gray-900'>Send & Sign</h3>
              <p className='mt-2 text-gray-600'>
                Send the document for signature and track progress
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className='bg-white border-t mt-20'>
        <div className='max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8'>
          <div className='text-center'>
            <p className='text-gray-500'>© 2025 SignFast. Electronic signatures made easy.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
