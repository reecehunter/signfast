import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

// Page-level loading skeleton for authentication
export function PageLoadingSkeleton() {
  return (
    <div className='min-h-screen bg-gray-50 flex'>
      {/* Sidebar skeleton */}
      <div className='w-64 bg-white border-r border-gray-200 p-4'>
        <div className='space-y-4'>
          <Skeleton className='h-8 w-32' />
          <div className='space-y-2'>
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-6 w-24' />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <main className='flex-1 overflow-auto'>
        {/* Mobile header skeleton */}
        <div className='md:hidden bg-white border-b border-gray-200 px-4 py-3'>
          <Skeleton className='h-6 w-32 mx-auto' />
        </div>

        <div className='p-4 md:p-6'>
          <div className='mb-6'>
            <Skeleton className='h-8 w-48 mb-2' />
            <Skeleton className='h-4 w-64' />
          </div>
          <ContentLoadingSkeleton />
        </div>
      </main>
    </div>
  )
}

// Content loading skeleton for documents/requests/completed pages
export function ContentLoadingSkeleton() {
  return (
    <div className='space-y-6'>
      {/* Header section */}
      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4'>
        <div className='space-y-2'>
          <Skeleton className='h-6 w-32' />
          <Skeleton className='h-4 w-48' />
        </div>
        <Skeleton className='h-10 w-32' />
      </div>

      {/* Table/Card skeleton */}
      <Card>
        <CardContent className='p-0'>
          {/* Desktop table skeleton */}
          <div className='hidden md:block px-4'>
            <div className='space-y-4 py-4'>
              {/* Table header */}
              <div className='flex space-x-4'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-4 w-20' />
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-4 w-20' />
              </div>

              {/* Table rows */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className='flex space-x-4 py-2'>
                  <div className='flex-1 space-y-1'>
                    <Skeleton className='h-4 w-3/4' />
                    <Skeleton className='h-3 w-1/2' />
                  </div>
                  <Skeleton className='h-4 w-20' />
                  <Skeleton className='h-4 w-16' />
                  <Skeleton className='h-4 w-20' />
                </div>
              ))}
            </div>
          </div>

          {/* Mobile cards skeleton */}
          <div className='md:hidden'>
            <div className='space-y-4 p-4'>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className='border rounded-lg p-4 space-y-3'>
                  <div className='space-y-2'>
                    <Skeleton className='h-4 w-3/4' />
                    <Skeleton className='h-3 w-1/2' />
                    <Skeleton className='h-3 w-1/3' />
                  </div>
                  <div className='flex gap-2'>
                    <Skeleton className='h-8 flex-1' />
                    <Skeleton className='h-8 flex-1' />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Billing-specific loading skeleton
export function BillingLoadingSkeleton() {
  return (
    <div className='space-y-6'>
      {/* Current Plan Card */}
      <Card>
        <CardContent className='p-6'>
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-5 w-5' />
              <Skeleton className='h-6 w-24' />
            </div>
            <Skeleton className='h-4 w-64' />

            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
              <div className='flex items-center gap-2'>
                <Skeleton className='h-4 w-8' />
                <Skeleton className='h-6 w-16' />
              </div>
              <div className='flex items-center gap-2'>
                <Skeleton className='h-4 w-12' />
                <Skeleton className='h-6 w-16' />
              </div>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-4 w-12' />
              </div>
              <Skeleton className='h-2 w-full' />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Options Card */}
      <Card>
        <CardContent className='p-6'>
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-5 w-5' />
              <Skeleton className='h-6 w-28' />
            </div>
            <Skeleton className='h-4 w-56' />

            <div className='grid gap-4 sm:grid-cols-2'>
              {/* Plan option 1 */}
              <div className='border rounded-lg p-4 space-y-3'>
                <div className='flex justify-between items-center'>
                  <Skeleton className='h-5 w-24' />
                  <Skeleton className='h-6 w-20' />
                </div>
                <Skeleton className='h-4 w-full' />
                <div className='space-y-1'>
                  <Skeleton className='h-3 w-3/4' />
                  <Skeleton className='h-3 w-2/3' />
                  <Skeleton className='h-3 w-1/2' />
                </div>
                <Skeleton className='h-8 w-full' />
              </div>

              {/* Plan option 2 */}
              <div className='border rounded-lg p-4 space-y-3'>
                <div className='flex justify-between items-center'>
                  <Skeleton className='h-5 w-20' />
                  <Skeleton className='h-6 w-20' />
                </div>
                <Skeleton className='h-4 w-full' />
                <div className='space-y-1'>
                  <Skeleton className='h-3 w-3/4' />
                  <Skeleton className='h-3 w-2/3' />
                  <Skeleton className='h-3 w-1/2' />
                </div>
                <Skeleton className='h-8 w-full' />
              </div>
            </div>

            <div className='pt-4 border-t'>
              <Skeleton className='h-10 w-full' />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
