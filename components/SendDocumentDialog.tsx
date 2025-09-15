'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Send, User, CheckCircle } from 'lucide-react'
import { InteractivePDFSigner } from './InteractivePDFSigner'

interface Document {
  id: string
  title: string
  fileName: string
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
    signerIndex?: number | null
  }>
}

interface Signer {
  email: string
  name: string
}

interface SendDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: Document | null
  onDocumentSent: () => void
}

export function SendDocumentDialog({
  open,
  onOpenChange,
  document,
  onDocumentSent,
}: SendDocumentDialogProps) {
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [signers, setSigners] = useState<Signer[]>([])
  const [errors, setErrors] = useState<{ [key: number]: string }>({})
  const [currentStep, setCurrentStep] = useState<'signers' | 'self-sign' | 'signing'>('signers')
  const [needsSelfSign, setNeedsSelfSign] = useState<boolean | null>(null)
  const [selectedSignerIndex, setSelectedSignerIndex] = useState<number | null>(null)
  const [selfSignatureData, setSelfSignatureData] = useState<{
    [areaId: string]: { type: string; data: string }
  } | null>(null)

  // Initialize signers when document changes
  useEffect(() => {
    if (document && signers.length === 0) {
      const initialSigners = Array.from({ length: document.numberOfSigners }, () => ({
        email: '',
        name: '',
      }))
      setSigners(initialSigners)
    }
  }, [document, signers.length])

  const updateSigner = (index: number, field: 'email' | 'name', value: string) => {
    const newSigners = [...signers]
    newSigners[index] = { ...newSigners[index], [field]: value }
    setSigners(newSigners)

    // Validate email
    const newErrors = { ...errors }
    if (field === 'email') {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[index] = 'Please enter a valid email address'
      } else {
        delete newErrors[index]
      }
    }
    setErrors(newErrors)
  }

  const handleSelfSignDecision = (needsSign: boolean) => {
    setNeedsSelfSign(needsSign)
    if (needsSign) {
      setCurrentStep('self-sign')
    } else {
      handleSubmit()
    }
  }

  const handleSignerSelection = (signerIndex: number) => {
    setSelectedSignerIndex(signerIndex)
    setCurrentStep('signing')
  }

  const handleSelfSigningComplete = (areaData: {
    [areaId: string]: { type: string; data: string }
  }) => {
    setSelfSignatureData(areaData)
    setCurrentStep('signers')
    // Continue with sending the document
    handleSubmit()
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!document) return

    // Check if document has signature areas
    if (!document.signatureAreas || document.signatureAreas.length === 0) {
      setError(
        'This document has no signature areas defined. Please edit the document to add signature areas before sending.'
      )
      return
    }

    // Validate all signers (skip validation for self-signed signer)
    const hasValidSigners = signers.every((signer, index) => {
      // Skip validation for the self-signed signer
      if (selfSignatureData && selectedSignerIndex === index) {
        return true
      }
      return signer.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer.email)
    })

    if (!hasValidSigners) {
      setError('Please provide valid email addresses for all signers')
      return
    }

    setIsSending(true)
    setError('')

    try {
      const response = await fetch('/api/documents/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: document.id,
          signers: signers,
          selfSignatureData: selfSignatureData,
          selfSignerIndex: selectedSignerIndex,
          selfSignerInfo:
            selfSignatureData && selectedSignerIndex !== null
              ? {
                  email: signers[selectedSignerIndex]?.email || '',
                  name: signers[selectedSignerIndex]?.name || 'Signer',
                }
              : null,
        }),
      })

      if (response.ok) {
        onDocumentSent()
        onOpenChange(false)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to send document')
      }
    } catch {
      setError('Failed to send document. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    if (!isSending) {
      onOpenChange(false)
      setError('')
      setCurrentStep('signers')
      setNeedsSelfSign(null)
      setSelectedSignerIndex(null)
      setSelfSignatureData(null)
    }
  }

  // Self-signing step
  if (currentStep === 'signing' && document && selectedSignerIndex !== null) {
    const signerAreas =
      document.signatureAreas?.filter(
        (area) => area.signerIndex === null || area.signerIndex === selectedSignerIndex
      ) || []

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className='sm:max-w-6xl max-h-[90vh] overflow-y-auto'>
          <InteractivePDFSigner
            pdfUrl={`/api/documents/${document.id}/view`}
            signatureAreas={signerAreas}
            signerName={signers[selectedSignerIndex]?.name || 'Signer'}
            signerDate={new Date().toLocaleDateString()}
            businessName=''
            onComplete={handleSelfSigningComplete}
            onCancel={() => setCurrentStep('self-sign')}
          />
        </DialogContent>
      </Dialog>
    )
  }

  // Self-sign selection step
  if (currentStep === 'self-sign') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Select Your Signer Position</DialogTitle>
            <DialogDescription>
              Which signer position are you? You&apos;ll sign the document before sending it to
              others.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-3'>
              {signers.map((_, index) => (
                <Button
                  key={index}
                  variant='outline'
                  className='w-full justify-start p-4 h-auto'
                  onClick={() => handleSignerSelection(index)}
                >
                  <User className='h-5 w-5 mr-3' />
                  <div className='text-left'>
                    <div className='font-medium'>Signer {index + 1}</div>
                    <div className='text-sm text-gray-500'>
                      {signers[index]?.name || 'No name provided'}
                    </div>
                    {signers[index]?.email && (
                      <div className='text-xs text-gray-400'>{signers[index].email}</div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
            <div className='flex justify-end space-x-2'>
              <Button type='button' variant='outline' onClick={() => setCurrentStep('signers')}>
                Back
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Main signers step
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Send Document for Signature</DialogTitle>
          <DialogDescription>
            Send &quot;{document?.title}&quot; to {document?.numberOfSigners || 0} signers
          </DialogDescription>
        </DialogHeader>

        {needsSelfSign === null && (
          <div className='space-y-4'>
            <div className='p-4 bg-blue-50 rounded-lg'>
              <h3 className='font-medium text-blue-900 mb-2'>Self-Signing Option</h3>
              <p className='text-sm text-blue-800 mb-4'>
                Do you need to sign this document yourself before sending it to others?
              </p>
              <div className='flex space-x-3'>
                <Button onClick={() => handleSelfSignDecision(true)} className='flex-1'>
                  <User className='h-4 w-4 mr-2' />
                  Yes, I need to sign first
                </Button>
                <Button
                  onClick={() => handleSelfSignDecision(false)}
                  variant='outline'
                  className='flex-1'
                >
                  <Send className='h-4 w-4 mr-2' />
                  No, send directly
                </Button>
              </div>
            </div>
          </div>
        )}

        {needsSelfSign !== null && (
          <form onSubmit={handleSubmit} className='space-y-4'>
            {selfSignatureData && (
              <div className='p-3 bg-green-50 rounded-lg flex items-center'>
                <CheckCircle className='h-5 w-5 text-green-600 mr-2' />
                <span className='text-sm text-green-800'>
                  You have successfully signed the document as Signer {selectedSignerIndex! + 1}
                </span>
              </div>
            )}

            <div className='space-y-4'>
              <Label>Signer Information</Label>
              <div className='space-y-3 max-h-64 overflow-y-auto'>
                {signers.map((signer, index) => {
                  // Skip showing input fields for the self-signed signer
                  if (selfSignatureData && selectedSignerIndex === index) {
                    return (
                      <div key={index} className='border rounded-lg p-4 space-y-3 bg-green-50'>
                        <div className='flex items-center justify-between'>
                          <h4 className='font-medium text-gray-900'>Signer {index + 1}</h4>
                          <CheckCircle className='h-5 w-5 text-green-600' />
                        </div>
                        <div className='text-sm text-green-700'>
                          ✓ You have already signed this document
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={index} className='border rounded-lg p-4 space-y-3'>
                      <div className='flex items-center justify-between'>
                        <h4 className='font-medium text-gray-900'>Signer {index + 1}</h4>
                      </div>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                        <div className='space-y-1'>
                          <Label htmlFor={`signer-${index}-email`}>Email Address *</Label>
                          <Input
                            id={`signer-${index}-email`}
                            type='email'
                            value={signer.email}
                            onChange={(e) => updateSigner(index, 'email', e.target.value)}
                            placeholder='signer@example.com'
                            disabled={isSending}
                            className={errors[index] ? 'border-red-500' : ''}
                          />
                          {errors[index] && <p className='text-sm text-red-600'>{errors[index]}</p>}
                        </div>

                        <div className='space-y-1'>
                          <Label htmlFor={`signer-${index}-name`}>Full Name (Optional)</Label>
                          <Input
                            id={`signer-${index}-name`}
                            type='text'
                            value={signer.name}
                            onChange={(e) => updateSigner(index, 'name', e.target.value)}
                            placeholder='John Doe'
                            disabled={isSending}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className='p-3 bg-amber-50 rounded-lg'>
              <p className='text-sm text-amber-800'>
                <strong>Parallel Signing:</strong> All signers will receive the document
                simultaneously and can sign in any order. The document will be completed once all
                signers have signed.
              </p>
            </div>

            {error && <div className='text-red-600 text-sm'>{error}</div>}
            <div className='flex justify-end space-x-2'>
              <Button type='button' variant='outline' onClick={handleClose} disabled={isSending}>
                Cancel
              </Button>
              <Button type='submit' disabled={signers.length === 0 || isSending}>
                <Send className='h-4 w-4 mr-2' />
                {isSending ? 'Sending...' : 'Send Document'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
