'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle, Download, Eye } from 'lucide-react'

interface Document {
  id: string
  title: string
  fileName: string
  fileUrl: string
  status: string
  numberOfSigners: number
  finalDocumentUrl?: string
  createdAt: string
  signatures: Array<{
    id: string
    signerEmail: string
    signerName?: string
    signerIndex: number
    requestId?: string
    status: string
    signedAt: string | null
    signedDocumentUrl?: string
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

interface CompletedViewProps {
  documents: Document[]
  isLoading: boolean
}

export function CompletedView({ documents, isLoading }: CompletedViewProps) {
  // Filter documents that have been completed (all signatures are signed)
  const completedDocuments = documents.filter(
    (doc) =>
      doc.signatures.length > 0 &&
      doc.signatures.every((signature) => signature.status === 'signed')
  )

  // Group completed signatures by requestId
  const requestGroups = new Map<
    string,
    {
      requestId: string
      documentId: string
      documentTitle: string
      documentFileName: string
      documentFileUrl: string
      finalDocumentUrl?: string
      signatures: Array<{
        id: string
        signerEmail: string
        signerName?: string
        signerIndex: number
        status: string
        signedAt: string | null
        signedDocumentUrl?: string
      }>
    }
  >()

  completedDocuments.forEach((document) => {
    document.signatures.forEach((signature) => {
      const requestId = signature.requestId || signature.id // fallback to signature.id for existing records

      if (!requestGroups.has(requestId)) {
        requestGroups.set(requestId, {
          requestId,
          documentId: document.id,
          documentTitle: document.title,
          documentFileName: document.fileName,
          documentFileUrl: document.fileUrl,
          finalDocumentUrl: document.finalDocumentUrl,
          signatures: [],
        })
      }

      requestGroups.get(requestId)!.signatures.push({
        id: signature.id,
        signerEmail: signature.signerEmail,
        signerName: signature.signerName,
        signerIndex: signature.signerIndex,
        status: signature.status,
        signedAt: signature.signedAt,
        signedDocumentUrl: signature.signedDocumentUrl,
      })
    })
  })

  const completedSignatures = Array.from(requestGroups.values()).sort((a, b) => {
    const aLatestSignature = Math.max(
      ...a.signatures.map((sig) => new Date(sig.signedAt || '').getTime())
    )
    const bLatestSignature = Math.max(
      ...b.signatures.map((sig) => new Date(sig.signedAt || '').getTime())
    )
    return bLatestSignature - aLatestSignature
  })

  const handleDownloadSigned = async (request: {
    documentId: string
    documentTitle: string
    documentFileName: string
    documentFileUrl: string
    finalDocumentUrl?: string
    signatures: Array<{
      id: string
      signerEmail: string
      signerName?: string
      signerIndex: number
      status: string
      signedAt: string | null
      signedDocumentUrl?: string
    }>
  }) => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.error('Download function called in non-browser environment')
        return
      }

      // Use the final merged document URL if available, otherwise fall back to individual signed document
      const signedUrl = request.finalDocumentUrl || request.signatures[0]?.signedDocumentUrl
      if (signedUrl) {
        // Extract the filename from the signed document URL path
        const fileName = signedUrl.split('/').pop()
        if (fileName) {
          // Use the signed documents API endpoint for download
          const link = document.createElement('a')
          link.href = `/api/signed-documents/${fileName}`
          link.download = `signed-${request.documentFileName}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      } else {
        // Fallback to original document if no signed version
        const link = document.createElement('a')
        link.href = request.documentFileUrl
        link.download = request.documentFileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Failed to download document')
    }
  }

  const handleViewDocument = (request: {
    documentId: string
    documentTitle: string
    documentFileName: string
    documentFileUrl: string
    finalDocumentUrl?: string
    signatures: Array<{
      id: string
      signerEmail: string
      signerName?: string
      signerIndex: number
      status: string
      signedAt: string | null
      signedDocumentUrl?: string
    }>
  }) => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.error('View document function called in non-browser environment')
      return
    }

    // Use the final merged document URL if available, otherwise fall back to individual signed document
    const signedUrl = request.finalDocumentUrl || request.signatures[0]?.signedDocumentUrl
    if (signedUrl) {
      // Extract the filename from the signed document URL path
      const fileName = signedUrl.split('/').pop()
      if (fileName) {
        // Use the signed documents API endpoint
        window.open(`/api/signed-documents/${fileName}`, '_blank')
      }
    } else {
      // Fallback to original document if no signed version
      window.open(request.documentFileUrl, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto'></div>
          <p className='mt-2 text-gray-600'>Loading completed documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4'>
        <div>
          <h2 className='text-xl sm:text-2xl font-bold text-gray-900'>Completed Documents</h2>
          <p className='text-gray-600'>View all signed and completed documents</p>
        </div>
        <div className='text-sm text-gray-500'>
          {completedSignatures.length} completed signature
          {completedSignatures.length !== 1 ? 's' : ''}
        </div>
      </div>

      {completedSignatures.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <CheckCircle className='h-12 w-12 text-gray-400 mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>No completed documents</h3>
            <p className='text-gray-500 text-center mb-4'>
              Documents that have been fully signed will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className='p-0'>
            {/* Desktop Table */}
            <div className='hidden lg:block px-4'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Signers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedSignatures.map((request) => (
                    <TableRow key={request.requestId}>
                      <TableCell className='font-medium'>
                        <div className='flex flex-col items-start'>
                          <div className='font-medium'>{request.documentTitle}</div>
                          <div className='text-sm text-gray-500'>{request.documentFileName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='space-y-1'>
                          {request.signatures
                            .sort((a, b) => a.signerIndex - b.signerIndex)
                            .map((signature) => (
                              <div key={signature.id} className='text-sm'>
                                <div className='flex items-center space-x-2'>
                                  <div className='w-2 h-2 rounded-full bg-green-500' />
                                  <div>
                                    <div className='font-medium'>
                                      {signature.signerName || signature.signerEmail}
                                    </div>
                                    <div className='text-gray-500 text-xs'>
                                      {signature.signerEmail}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant='default' className='bg-green-100 text-green-800'>
                          <CheckCircle className='h-3 w-3 mr-1' />
                          All Signed
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.signatures[0]?.signedAt ? (
                          <div className='text-sm'>
                            <div className='font-medium'>
                              {new Date(request.signatures[0].signedAt).toLocaleDateString()}
                            </div>
                            <div className='text-gray-500'>
                              {new Date(request.signatures[0].signedAt).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <span className='text-gray-400'>Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className='flex space-x-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleViewDocument(request)}
                          >
                            <Eye className='h-4 w-4 mr-2' />
                            View
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleDownloadSigned(request)}
                          >
                            <Download className='h-4 w-4 mr-2' />
                            Download
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className='lg:hidden'>
              <div className='space-y-4 p-4'>
                {completedSignatures.map((request) => (
                  <div key={request.requestId} className='border rounded-lg p-4 space-y-3'>
                    <div>
                      <h3 className='font-medium text-gray-900'>{request.documentTitle}</h3>
                      <p className='text-sm text-gray-500'>{request.documentFileName}</p>
                      {request.signatures[0]?.signedAt && (
                        <p className='text-xs text-gray-400 mt-1'>
                          Completed {new Date(request.signatures[0].signedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className='text-sm font-medium text-gray-700 mb-2'>Signers:</h4>
                      <div className='space-y-2'>
                        {request.signatures
                          .sort((a, b) => a.signerIndex - b.signerIndex)
                          .map((signature) => (
                            <div key={signature.id} className='flex items-center space-x-2'>
                              <div className='w-2 h-2 rounded-full bg-green-500' />
                              <div className='flex-1'>
                                <div className='text-sm font-medium'>
                                  {signature.signerName || signature.signerEmail}
                                </div>
                                <div className='text-xs text-gray-500'>{signature.signerEmail}</div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className='flex items-center justify-between'>
                      <Badge variant='default' className='bg-green-100 text-green-800'>
                        <CheckCircle className='h-3 w-3 mr-1' />
                        All Signed
                      </Badge>
                      <div className='flex space-x-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleViewDocument(request)}
                        >
                          <Eye className='h-4 w-4 mr-2' />
                          View
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleDownloadSigned(request)}
                        >
                          <Download className='h-4 w-4 mr-2' />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
