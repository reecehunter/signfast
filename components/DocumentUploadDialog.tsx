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
import { Upload, FileText } from 'lucide-react'
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
  const [uploadedFileUrl, setUploadedFileUrl] = useState('')
  const [uploadedDocumentId, setUploadedDocumentId] = useState('')
  const [numberOfSigners, setNumberOfSigners] = useState(1)
  const [currentStep, setCurrentStep] = useState<'upload' | 'signers' | 'areas'>('upload')

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
        // Store the actual S3 URL for the signature areas API
        setUploadedFileUrl(data.document.fileUrl)
        setUploadedDocumentId(data.document.id)
        setCurrentStep('signers')
      } else {
        const data = await response.json()
        setError(data.error || 'Upload failed')
      }
    } catch {
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
          numberOfSigners: numberOfSigners,
        }),
      })

      if (response.ok) {
        onDocumentUploaded()
        onOpenChange(false)
        setFile(null)
        setTitle('')
        setUploadedFileUrl('')
        setUploadedDocumentId('')
        setCurrentStep('upload')
        setNumberOfSigners(1)
      } else {
        setError('Failed to save signature areas')
      }
    } catch {
      setError('Failed to save signature areas')
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
    if (currentStep === 'signers') {
      setCurrentStep('upload')
    } else if (currentStep === 'areas') {
      setCurrentStep('signers')
    }
    setError('')
  }

  const handleSignatureAreaCancel = () => {
    setCurrentStep('signers')
  }

  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false)
      setFile(null)
      setTitle('')
      setError('')
      setCurrentStep('upload')
      setNumberOfSigners(1)
      setUploadedFileUrl('')
      setUploadedDocumentId('')
    }
  }

  if (currentStep === 'areas') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className='sm:max-w-6xl max-h-[90vh] overflow-y-auto'>
          <ClientPDFSelector
            pdfUrl={`/api/documents/${uploadedDocumentId}/view`}
            onAreasSelected={handleSignatureAreasSelected}
            onCancel={handleSignatureAreaCancel}
            numberOfSigners={numberOfSigners}
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

        {/* Step indicator */}
        <div className='flex items-center justify-center space-x-4 mb-6'>
          <div
            className={`flex items-center space-x-2 ${
              currentStep === 'upload' ? 'text-amber-600' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'upload' ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              1
            </div>
            <span className='font-medium'>Upload</span>
          </div>
          <div className='w-8 h-px bg-gray-300'></div>
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
              2
            </div>
            <span className='font-medium'>Configure Signers</span>
          </div>
        </div>

        {currentStep === 'upload' && (
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
            {error && <div className='text-red-600 text-sm'>{error}</div>}
            <div className='flex justify-end space-x-2'>
              <Button type='button' variant='outline' onClick={handleBackStep}>
                Back
              </Button>
              <Button onClick={handleNextStep}>Next: Select Areas</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
