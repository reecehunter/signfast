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
import { Send } from 'lucide-react'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!document) return

    // Validate all signers
    const hasValidSigners = signers.every(
      (signer) => signer.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer.email)
    )

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
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Send Document for Signature</DialogTitle>
          <DialogDescription>
            Send &quot;{document?.title}&quot; to {document?.numberOfSigners || 0} signers
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-4'>
            <Label>Signer Information</Label>
            <div className='space-y-3 max-h-64 overflow-y-auto'>
              {signers.map((signer, index) => (
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
              ))}
            </div>
          </div>

          <div className='p-3 bg-blue-50 rounded-lg'>
            <p className='text-sm text-blue-800'>
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
      </DialogContent>
    </Dialog>
  )
}
