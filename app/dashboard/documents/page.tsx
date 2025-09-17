'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { DocumentsView } from '@/components/DocumentsView'
import { PageLoadingSkeleton } from '@/components/LoadingSkeletons'

interface Document {
  id: string
  title: string
  fileName: string
  fileUrl: string
  status: string
  numberOfSigners: number
  createdAt: string
  signatures: Array<{
    id: string
    signerEmail: string
    signerName?: string
    signerIndex: number
    status: string
    signedAt: string | null
  }>
  signatureAreas?: Array<{
    id: string
    type: 'signature' | 'name' | 'date' | 'business'
    x: number
    y: number
    width: number
    height: number
    pageNumber: number
    label?: string
  }>
}

export default function DocumentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchDocuments()
    }
  }, [status, router])

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return <PageLoadingSkeleton />
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
          <h1 className='text-lg font-semibold text-gray-900'>Documents</h1>
          <div className='w-10' /> {/* Spacer for centering */}
        </div>

        <div className='p-4 md:p-6'>
          <DocumentsView documents={documents} isLoading={isLoading} onRefresh={fetchDocuments} />
        </div>
      </main>
    </div>
  )
}
