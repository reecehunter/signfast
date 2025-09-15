'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { InteractivePDFSigner } from '@/components/InteractivePDFSigner'

interface DocumentData {
  id: string
  title: string
  fileName: string
  fileUrl: string
  status: string
  signatures: Array<{
    id: string
    signerEmail: string
    signerName: string
    signerIndex: number
    status: string
    signedAt: string | null
  }>
  signatureAreas: Array<{
    id: string
    type: string
    x: number
    y: number
    width: number
    height: number
    pageNumber: number
    label?: string
    signerIndex?: number | null
  }>
  currentSignature?: {
    id: string
    status: string
    signerEmail: string
    signerName: string
    signerIndex: number
    signedAt: string | null
  }
  signingInfo?: {
    currentSignerIndex: number
    totalSigners: number
    isLastSigner: boolean
  }
}

export default function SigningPage() {
  const params = useParams()
  const token = params.token as string
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigning, setIsSigning] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signerDate, setSignerDate] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showSignatureCapture, setShowSignatureCapture] = useState(false)

  const fetchDocument = useCallback(async () => {
    try {
      const response = await fetch(`/api/sign/${token}`)
      if (response.ok) {
        const data = await response.json()
        setDocument(data)
        if (data.currentSignature?.signerName) {
          setSignerName(data.currentSignature.signerName)
        }
      } else if (response.status === 410) {
        setError('This signature request has been deleted')
      } else {
        setError('Document not found or link has expired')
      }
    } catch {
      setError('Failed to load document')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchDocument()
    }
  }, [token, fetchDocument])

  // Set current date as default when document loads and has date signature areas
  useEffect(() => {
    if (document?.signatureAreas?.some((area) => area.type === 'date')) {
      setSignerDate(new Date().toLocaleDateString())
    }
  }, [document])

  const isFormValid = () => {
    if (!document) return false

    const hasNameAreas = document.signatureAreas.some((area) => area.type === 'name')
    const hasDateAreas = document.signatureAreas.some((area) => area.type === 'date')
    const hasBusinessAreas = document.signatureAreas.some((area) => area.type === 'business')

    // If there are no areas requiring form input, form is valid
    if (!hasNameAreas && !hasDateAreas && !hasBusinessAreas) return true

    if (hasNameAreas && !signerName) return false
    if (hasDateAreas && !signerDate) return false
    if (hasBusinessAreas && !businessName) return false

    return true
  }

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!document || !isFormValid()) return

    setShowSignatureCapture(true)
  }

  const handleSignatureCancel = () => {
    setShowSignatureCapture(false)
  }

  const handleInteractiveSigningComplete = async (completedAreaData: {
    [areaId: string]: { type: string; data: string }
  }) => {
    setIsSigning(true)
    setError('')

    try {
      const response = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signerName,
          signerDate,
          areaData: completedAreaData,
        }),
      })

      if (response.ok) {
        setSuccess(true)
        setShowSignatureCapture(false)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to sign document')
        setShowSignatureCapture(false)
      }
    } catch {
      setError('Failed to sign document. Please try again.')
      setShowSignatureCapture(false)
    } finally {
      setIsSigning(false)
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900'></div>
          <p className='mt-4 text-gray-600'>Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isDeleted = error === 'This signature request has been deleted'
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <Card className='w-full max-w-md'>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <AlertCircle className='h-12 w-12 text-red-500 mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              {isDeleted ? 'Signature Request Deleted' : 'Error'}
            </h3>
            <p className='text-gray-500 text-center'>
              {isDeleted ? 'This signature request was either deleted or does not exist.' : error}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    // Check if all signers have signed
    const allSignersSigned = document?.signatures.every((sig) => sig.status === 'signed') ?? false

    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <Card className='w-full max-w-md'>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <CheckCircle className='h-12 w-12 text-green-500 mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              Document Signed Successfully!
            </h3>
            <p className='text-gray-500 text-center'>
              {allSignersSigned
                ? 'Thank you for signing the document. All parties have been notified and the document is now complete.'
                : 'Thank you for signing the document. All parties will receive the completed document once all recipients have signed it.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!document) {
    return null
  }

  const isAlreadySigned = document.currentSignature?.status === 'signed'

  if (showSignatureCapture) {
    return (
      <div className='min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-6xl mx-auto'>
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold text-gray-900'>Sign Document</h1>
            <p className='mt-2 text-gray-600'>
              Please complete all required areas for: {document.title}
            </p>
          </div>
          <InteractivePDFSigner
            pdfUrl={document.fileUrl}
            signatureAreas={document.signatureAreas || []}
            signerName={signerName}
            signerDate={signerDate}
            businessName={businessName}
            onComplete={handleInteractiveSigningComplete}
            onCancel={handleSignatureCancel}
            isSigning={isSigning}
          />
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-3xl mx-auto'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>
            {isAlreadySigned ? 'Already Signed' : 'eSignature Request'}
          </h1>
          <p className='mt-2 text-gray-600'>Please review and sign the document below</p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Document Info */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center'>
                <FileText className='h-5 w-5 mr-2' />
                Document Information
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <Label className='text-sm font-medium text-gray-500'>Document Title</Label>
                <p className='text-lg font-semibold'>{document.title}</p>
              </div>
              <div>
                <Label className='text-sm font-medium text-gray-500'>File Name</Label>
                <p className='text-sm text-gray-700'>{document.fileName}</p>
              </div>
              <div>
                <Label className='text-sm font-medium text-gray-500'>Status</Label>
                <div className='mt-1'>
                  <Badge variant={document.status === 'completed' ? 'default' : 'secondary'}>
                    {document.status}
                  </Badge>
                </div>
              </div>
              {document.signatures.length > 0 && (
                <div>
                  <Label className='text-sm font-medium text-gray-500'>Signatures</Label>
                  <div className='mt-2 space-y-2'>
                    {document.signatures.map((signature) => (
                      <div key={signature.id} className='flex items-center justify-between'>
                        <span className='text-sm'>{signature.signerEmail}</span>
                        <Badge variant={signature.status === 'signed' ? 'default' : 'secondary'}>
                          {signature.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {document.signatureAreas && document.signatureAreas.length > 0 && (
                <div>
                  <Label className='text-sm font-medium text-gray-500'>Areas to Fill</Label>
                  <div className='mt-2 space-y-2'>
                    {document.signatureAreas.map((area) => (
                      <div key={area.id} className='flex items-center justify-between'>
                        <span className='text-sm capitalize'>{area.label || area.type}</span>
                        <Badge
                          variant='outline'
                          className={
                            area.type === 'signature'
                              ? 'border-blue-500 text-blue-700'
                              : area.type === 'name'
                              ? 'border-green-500 text-green-700'
                              : 'border-purple-500 text-purple-700'
                          }
                        >
                          {area.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signing Form */}
          <Card>
            {!isAlreadySigned && (
              <CardHeader>
                <CardTitle>Sign Document</CardTitle>
                <CardDescription>
                  Enter your name to sign this document electronically.
                </CardDescription>
              </CardHeader>
            )}
            <CardContent>
              {isAlreadySigned ? (
                <div className='text-center py-8'>
                  <CheckCircle className='h-12 w-12 text-green-500 mx-auto mb-4' />
                  <h3 className='text-lg font-medium text-gray-900 mb-2'>
                    Document Already Signed
                  </h3>
                  <p className='text-gray-600 mb-4'>
                    This document has already been signed by{' '}
                    {document.currentSignature?.signerName || 'the signer'}.
                  </p>
                  {document.currentSignature?.signedAt && (
                    <p className='text-sm text-gray-500'>
                      Signed on: {new Date(document.currentSignature.signedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSign} className='space-y-4'>
                  {/* Only show name field if there are name signature areas */}
                  {document.signatureAreas.some((area) => area.type === 'name') && (
                    <div className='space-y-2'>
                      <Label htmlFor='signerName'>Your Full Name *</Label>
                      <Input
                        id='signerName'
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder='Enter your full name'
                        required
                        disabled={isSigning}
                      />
                    </div>
                  )}

                  {/* Only show date field if there are date signature areas */}
                  {document.signatureAreas.some((area) => area.type === 'date') && (
                    <div className='space-y-2'>
                      <Label htmlFor='signerDate'>Date *</Label>
                      <Input
                        id='signerDate'
                        value={signerDate}
                        onChange={(e) => setSignerDate(e.target.value)}
                        placeholder='Enter the date'
                        required
                        disabled={isSigning}
                      />
                    </div>
                  )}

                  {/* Only show business name field if there are business signature areas */}
                  {document.signatureAreas.some((area) => area.type === 'business') && (
                    <div className='space-y-2'>
                      <Label htmlFor='businessName'>Business Name *</Label>
                      <Input
                        id='businessName'
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder='Enter business name'
                        required
                        disabled={isSigning}
                      />
                    </div>
                  )}

                  {/* Show message if no form fields are needed */}
                  {!document.signatureAreas.some((area) =>
                    ['name', 'date', 'business'].includes(area.type)
                  ) && (
                    <div className='p-4 bg-blue-50 rounded-lg'>
                      <p className='text-sm text-blue-700'>
                        This document only requires your signature. Click &quot;Continue to
                        Sign&quot; to proceed.
                      </p>
                    </div>
                  )}

                  {error && <div className='text-red-600 text-sm'>{error}</div>}
                  <Button type='submit' className='w-full' disabled={isSigning || !isFormValid()}>
                    {isSigning ? 'Processing...' : 'Continue to Sign'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Document Preview */}
        <Card className='mt-8'>
          <CardHeader>
            <CardTitle>Document Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='border rounded-lg p-4 bg-white'>
              <iframe
                src={`${document.fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&disableprint=1&disablesave=1&disablecopy=1&disableannotate=1&disableforms=1`}
                className='w-full h-96 border-0'
                title='Document Preview'
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
