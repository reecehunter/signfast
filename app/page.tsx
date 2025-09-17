'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Show loading spinner while determining authentication status
  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='text-center'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900'></div>
        <p className='mt-4 text-gray-600'>Loading...</p>
      </div>
    </div>
  )
}
