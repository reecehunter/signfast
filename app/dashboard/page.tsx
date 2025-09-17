'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PageLoadingSkeleton } from '@/components/LoadingSkeletons'

export default function DashboardPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      // Redirect to documents page by default
      router.push('/dashboard/documents')
    }
  }, [status, router])

  if (status === 'loading') {
    return <PageLoadingSkeleton />
  }

  return null
}
