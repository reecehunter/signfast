'use client'

import { useState } from 'react'
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
  createdAt: string
  signatures: Array<{
    id: string
    signerEmail: string
    status: string
    signedAt: string | null
  }>
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
  const [signerEmail, setSignerEmail] = useState('')
  const [signerName, setSignerName] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!document || !signerEmail) return

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
          signerEmail,
          signerName: signerName || undefined,
        }),
      })

      if (response.ok) {
        onDocumentSent()
        onOpenChange(false)
        setSignerEmail('')
        setSignerName('')
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
      setSignerEmail('')
      setSignerName('')
      setError('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Send Document for Signature</DialogTitle>
          <DialogDescription>
            Send &quot;{document?.title}&quot; to someone for electronic signature
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='signerEmail'>Signer Email *</Label>
            <Input
              id='signerEmail'
              type='email'
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="Enter signer's email address"
              required
              disabled={isSending}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='signerName'>Signer Name (Optional)</Label>
            <Input
              id='signerName'
              type='text'
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Enter signer's name"
              disabled={isSending}
            />
          </div>
          {error && <div className='text-red-600 text-sm'>{error}</div>}
          <div className='flex justify-end space-x-2'>
            <Button type='button' variant='outline' onClick={handleClose} disabled={isSending}>
              Cancel
            </Button>
            <Button type='submit' disabled={!signerEmail || isSending}>
              <Send className='h-4 w-4 mr-2' />
              {isSending ? 'Sending...' : 'Send Document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
