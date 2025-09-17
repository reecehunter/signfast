'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

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

  // Show loading skeleton while determining authentication status
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='text-center space-y-4'>
        <Skeleton className='h-32 w-32 rounded-full mx-auto' />
        <Skeleton className='h-4 w-24 mx-auto' />
      </div>
    </div>
  )
}
