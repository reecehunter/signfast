'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import BillingDashboard from '@/components/BillingDashboard'

function BillingPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Handle Stripe Checkout success/cancel
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success === 'true') {
      // Show success message and clean up URL
      alert('Payment successful! Your subscription has been activated.')
      router.replace('/dashboard/billing')
    } else if (canceled === 'true') {
      // Show canceled message and clean up URL
      alert('Payment was canceled. You can try again at any time.')
      router.replace('/dashboard/billing')
    }
  }, [searchParams, router])

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

  if (!session) {
    return null
  }

  return (
    <div className='min-h-screen bg-gray-50 flex'>
      <Sidebar
        userName={session.user?.name || undefined}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className='flex-1 overflow-auto'>
        <div className='p-6'>
          <div className='mb-6'>
            <h1 className='text-3xl font-bold'>Billing & Usage</h1>
            <p className='text-gray-600 mt-2'>
              Manage your subscription and view your signature usage
            </p>
          </div>

          <BillingDashboard />
        </div>
      </main>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900'></div>
            <p className='mt-4 text-gray-600'>Loading...</p>
          </div>
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  )
}
