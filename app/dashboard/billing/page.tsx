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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

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
        isMobileOpen={isMobileSidebarOpen}
        onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <main className='flex-1 overflow-auto'>
        {/* Mobile Header */}
        <div className='md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between'>
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className='p-2 rounded-md hover:bg-gray-100'
          >
            <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M4 6h16M4 12h16M4 18h16'
              />
            </svg>
          </button>
          <h1 className='text-lg font-semibold text-gray-900'>Billing</h1>
          <div className='w-10' /> {/* Spacer for centering */}
        </div>

        <div className='p-4 md:p-6'>
          <div className='mb-6'>
            <h1 className='text-2xl md:text-3xl font-bold'>Billing & Usage</h1>
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
