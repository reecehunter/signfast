'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ClientPDFSelector } from '@/components/ClientPDFSelector'

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
  }>
  signatures: Array<{
    id: string
    signerEmail: string
    status: string
    signedAt: string | null
  }>
}

interface EditDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: Document | null
  onDocumentEdited: () => void
}

export function EditDocumentDialog({
  open,
  onOpenChange,
  document,
  onDocumentEdited,
}: EditDocumentDialogProps) {
  const [error, setError] = useState('')

  const handleSignatureAreasSelected = async (
    areas: {
      x: number
      y: number
      width: number
      height: number
      pageNumber?: number
      type: 'signature' | 'name' | 'date' | 'business'
      label?: string
    }[]
  ) => {
    if (!document) return

    try {
      setError('')

      // Update the document with signature area coordinates
      const response = await fetch('/api/documents/signature-areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: document.fileUrl,
          signatureAreas: areas,
        }),
      })

      if (response.ok) {
        onDocumentEdited()
        onOpenChange(false)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update signature areas')
      }
    } catch (error) {
      setError('Failed to update signature areas')
    }
  }

  const handleCancel = () => {
    setError('')
    onOpenChange(false)
  }

  if (!document) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className='sm:max-w-6xl max-h-[90vh] overflow-y-auto'>
        <div className='mb-4'>
          <h2 className='text-lg font-semibold'>Edit Signature Areas</h2>
          <p className='text-sm text-gray-600 mt-1'>
            Select and position signature areas for "{document.title}"
          </p>
          {error && (
            <div className='mt-2 p-3 bg-red-50 border border-red-200 rounded-md'>
              <p className='text-sm text-red-600'>{error}</p>
            </div>
          )}
        </div>
        <ClientPDFSelector
          pdfUrl={document.fileUrl}
          onAreasSelected={handleSignatureAreasSelected}
          onCancel={handleCancel}
          existingAreas={document.signatureAreas || []}
        />
      </DialogContent>
    </Dialog>
  )
}
