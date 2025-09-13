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
import { Upload, FileText, MapPin } from 'lucide-react'
import { ClientPDFSelector } from './ClientPDFSelector'

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDocumentUploaded: () => void
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onDocumentUploaded,
}: DocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [showSignatureAreaSelector, setShowSignatureAreaSelector] = useState(false)
  const [signatureAreas, setSignatureAreas] = useState<
    {
      x: number
      y: number
      width: number
      height: number
      pageNumber?: number
      type: 'signature' | 'name' | 'date' | 'business'
      label?: string
    }[]
  >([])
  const [uploadedFileUrl, setUploadedFileUrl] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title) return

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setUploadedFileUrl(data.document.fileUrl)
        setShowSignatureAreaSelector(true)
      } else {
        const data = await response.json()
        setError(data.error || 'Upload failed')
      }
    } catch (error) {
      setError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

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
    try {
      // Update the document with signature area coordinates
      const response = await fetch('/api/documents/signature-areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: uploadedFileUrl,
          signatureAreas: areas,
        }),
      })

      if (response.ok) {
        onDocumentUploaded()
        onOpenChange(false)
        setFile(null)
        setTitle('')
        setSignatureAreas([])
        setUploadedFileUrl('')
        setShowSignatureAreaSelector(false)
      } else {
        setError('Failed to save signature areas')
      }
    } catch (error) {
      setError('Failed to save signature areas')
    }
  }

  const handleSignatureAreaCancel = () => {
    setShowSignatureAreaSelector(false)
    setUploadedFileUrl('')
  }

  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false)
      setFile(null)
      setTitle('')
      setSignatureAreas([])
      setError('')
    }
  }

  if (showSignatureAreaSelector) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className='sm:max-w-6xl max-h-[90vh] overflow-y-auto'>
          <ClientPDFSelector
            pdfUrl={uploadedFileUrl}
            onAreasSelected={handleSignatureAreasSelected}
            onCancel={handleSignatureAreaCancel}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>Upload a document to request electronic signatures</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='file'>Document</Label>
            <div className='flex items-center justify-center w-full'>
              <label
                htmlFor='file'
                className='flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100'
              >
                {file ? (
                  <div className='flex flex-col items-center'>
                    <FileText className='h-8 w-8 text-gray-400 mb-2' />
                    <p className='text-sm text-gray-500'>{file.name}</p>
                  </div>
                ) : (
                  <div className='flex flex-col items-center'>
                    <Upload className='h-8 w-8 text-gray-400 mb-2' />
                    <p className='text-sm text-gray-500'>
                      <span className='font-semibold'>Click to upload</span> or drag and drop
                    </p>
                    <p className='text-xs text-gray-500'>PDF, DOC, DOCX (MAX. 10MB)</p>
                  </div>
                )}
                <Input
                  id='file'
                  type='file'
                  className='hidden'
                  accept='.pdf,.doc,.docx'
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='title'>Document Title</Label>
            <Input
              id='title'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Enter document title'
              required
              disabled={isUploading}
            />
          </div>
          {error && <div className='text-red-600 text-sm'>{error}</div>}
          <div className='flex justify-end space-x-2'>
            <Button type='button' variant='outline' onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button type='submit' disabled={!file || !title || isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
