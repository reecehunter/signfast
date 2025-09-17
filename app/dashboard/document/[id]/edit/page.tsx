'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { EditDocumentDialog } from '@/components/EditDocumentDialog'
import { PageLoadingSkeleton } from '@/components/LoadingSkeletons'
import { Skeleton } from '@/components/ui/skeleton'

interface Document {
  id: string
  title: string
  fileName: string
  fileUrl: string
  status: string
  createdAt: string
  signatureAreas?: Array<{
    id: string
    type: 'signature' | 'name' | 'date' | 'business'
    x: number
    y: number
    width: number
    height: number
    pageNumber: number
    label?: string
    signerIndex?: number | null
  }>
  signatures: Array<{
    id: string
    signerEmail: string
    signerName?: string
    signerIndex: number
    status: string
    signedAt: string | null
  }>
}

export default function EditDocumentPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const documentId = params.id as string

  const fetchDocument = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/documents/${documentId}`)

      if (response.ok) {
        const data = await response.json()
        setDocument(data.document)
      } else {
        setError('Document not found')
      }
    } catch {
      setError('Failed to load document')
    } finally {
      setIsLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && documentId) {
      fetchDocument()
    }
  }, [status, router, documentId, fetchDocument])

  const handleDocumentEdited = () => {
    // Navigate back to documents list
    router.push('/dashboard/documents')
  }

  const handleCancel = () => {
    // Navigate back to documents list
    router.push('/dashboard/documents')
  }

  if (status === 'loading') {
    return <PageLoadingSkeleton />
  }

  if (!session) {
    return null
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 flex'>
        <Sidebar
          userName={session.user?.name || undefined}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className='flex-1 overflow-auto'>
          <div className='p-6'>
            <div className='space-y-6'>
              <div className='flex items-center space-x-4'>
                <Skeleton className='h-10 w-32' />
              </div>
              <Skeleton className='h-96 w-full' />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className='min-h-screen bg-gray-50 flex'>
        <Sidebar
          userName={session.user?.name || undefined}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className='flex-1 overflow-auto'>
          <div className='p-6'>
            <div className='flex items-center justify-center py-12'>
              <div className='text-center'>
                <p className='text-red-600 mb-4'>{error || 'Document not found'}</p>
                <Button onClick={() => router.push('/dashboard/documents')}>
                  <ArrowLeft className='h-4 w-4 mr-2' />
                  Back to Documents
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
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
          <div className='space-y-6'>
            {/* Header with back button */}
            <div className='flex items-center space-x-4'>
              <Button
                variant='outline'
                onClick={() => router.push('/dashboard/documents')}
                className='flex items-center space-x-2'
              >
                <ArrowLeft className='h-4 w-4' />
                <span>Back to Documents</span>
              </Button>
            </div>

            {/* Edit Document Interface */}
            <EditDocumentDialog
              open={true}
              onOpenChange={handleCancel}
              document={document}
              onDocumentEdited={handleDocumentEdited}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
