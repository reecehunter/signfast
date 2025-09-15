'use client'

import { useState } from 'react'
import { ClientPDFSelector } from '@/components/ClientPDFSelector'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

interface EditDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: Document | null
  onDocumentEdited: () => void
}

export function EditDocumentDialog({
  onOpenChange,
  document,
  onDocumentEdited,
}: EditDocumentDialogProps) {
  const [error, setError] = useState('')
  const [numberOfSigners, setNumberOfSigners] = useState(1)
  const [currentStep, setCurrentStep] = useState<'signers' | 'areas'>('signers')

  const handleSignatureAreasSelected = async (
    areas: {
      x: number
      y: number
      width: number
      height: number
      pageNumber?: number
      type: 'signature' | 'name' | 'date' | 'business'
      label?: string
      signerIndex?: number | null
    }[]
  ) => {
    if (!document) return

    try {
      setError('')

      // Update the document with signature area coordinates and signer information
      const response = await fetch('/api/documents/signature-areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: document.fileUrl,
          signatureAreas: areas,
          numberOfSigners: numberOfSigners,
        }),
      })

      if (response.ok) {
        onDocumentEdited()
        onOpenChange(false)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update signature areas')
      }
    } catch {
      setError('Failed to update signature areas')
    }
  }

  const handleNextStep = () => {
    // Validate number of signers
    if (numberOfSigners < 1 || numberOfSigners > 10) {
      setError('Please specify between 1 and 10 signers')
      return
    }

    setCurrentStep('areas')
    setError('')
  }

  const handleBackStep = () => {
    setCurrentStep('signers')
    setError('')
  }

  const handleCancel = () => {
    setError('')
    onOpenChange(false)
  }

  if (!document) {
    return null
  }

  return (
    <div className='w-full space-y-6'>
      {/* Step indicator */}
      <div className='flex items-center justify-center space-x-4'>
        <div
          className={`flex items-center space-x-2 ${
            currentStep === 'signers' ? 'text-amber-600' : 'text-gray-400'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'signers' ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            1
          </div>
          <span className='font-medium'>Configure Signers</span>
        </div>
        <div className='w-8 h-px bg-gray-300'></div>
        <div
          className={`flex items-center space-x-2 ${
            currentStep === 'areas' ? 'text-amber-600' : 'text-gray-400'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'areas' ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            2
          </div>
          <span className='font-medium'>Select Signature Areas</span>
        </div>
      </div>

      {error && (
        <div className='p-3 bg-red-50 border border-red-200 rounded-md'>
          <p className='text-sm text-red-600'>{error}</p>
        </div>
      )}

      {currentStep === 'signers' && (
        <div className='space-y-4'>
          <div className='p-6 bg-white border rounded-lg'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>Configure Signers</h3>
            <p className='text-sm text-gray-600 mb-4'>
              How many people need to sign this document? You&apos;ll specify their details when
              sending the document.
            </p>
            <div className='space-y-2'>
              <Label htmlFor='numberOfSigners'>Number of Signers</Label>
              <Input
                id='numberOfSigners'
                type='number'
                min='1'
                max='10'
                value={numberOfSigners}
                onChange={(e) => setNumberOfSigners(parseInt(e.target.value) || 1)}
                className='w-32'
              />
              <p className='text-xs text-gray-500'>Signers will sign in order (1, 2, 3, etc.)</p>
            </div>
          </div>
          <div className='flex justify-end space-x-2'>
            <button
              onClick={handleCancel}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
            >
              Cancel
            </button>
            <button
              onClick={handleNextStep}
              className='px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700'
            >
              Next: Select Areas
            </button>
          </div>
        </div>
      )}

      {currentStep === 'areas' && (
        <div className='space-y-4'>
          <div className='p-4 bg-amber-50 rounded-lg'>
            <h3 className='font-medium text-amber-900'>Signature Areas</h3>
            <p className='text-sm text-amber-700 mt-1'>
              Now select where each signer should sign on the document. You can assign specific
              areas to individual signers.
            </p>
          </div>
          <ClientPDFSelector
            pdfUrl={`/api/documents/${document.id}/view`}
            onAreasSelected={handleSignatureAreasSelected}
            onCancel={handleCancel}
            existingAreas={document.signatureAreas || []}
            numberOfSigners={numberOfSigners}
          />
          <div className='flex justify-between'>
            <button
              onClick={handleBackStep}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
            >
              Back: Configure Signers
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
