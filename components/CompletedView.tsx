'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  createdAt: string
  signatures: Array<{
    id: string
    signerEmail: string
    signerName?: string
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

interface CompletedSignature {
  id: string
  documentId: string
  documentTitle: string
  documentFileName: string
  documentFileUrl: string
  signerEmail: string
  signerName?: string
  status: string
  signedAt: string | null
  signedDocumentUrl?: string
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

  // Flatten signatures into individual rows for the table
  const completedSignatures: CompletedSignature[] = completedDocuments
    .flatMap((document) =>
      document.signatures.map((signature) => ({
        id: signature.id,
        documentId: document.id,
        documentTitle: document.title,
        documentFileName: document.fileName,
        documentFileUrl: document.fileUrl,
        signerEmail: signature.signerEmail,
        signerName: signature.signerName,
        status: signature.status,
        signedAt: signature.signedAt,
        signedDocumentUrl: signature.signedDocumentUrl,
      }))
    )
    .sort((a, b) => new Date(b.signedAt || '').getTime() - new Date(a.signedAt || '').getTime())

  const handleDownloadSigned = async (signature: CompletedSignature) => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.error('Download function called in non-browser environment')
        return
      }

      // Use the signed document URL from the signature
      const signedUrl = signature.signedDocumentUrl
      if (signedUrl) {
        // Extract the filename from the signed document URL path
        const fileName = signedUrl.split('/').pop()
        if (fileName) {
          // Use the signed documents API endpoint for download
          const link = document.createElement('a')
          link.href = `/api/signed-documents/${fileName}`
          link.download = `signed-${signature.documentFileName}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      } else {
        // Fallback to original document if no signed version
        const link = document.createElement('a')
        link.href = signature.documentFileUrl
        link.download = signature.documentFileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Failed to download document')
    }
  }

  const handleViewDocument = (signature: CompletedSignature) => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.error('View document function called in non-browser environment')
      return
    }

    // Open the signed document in a new tab
    const signedUrl = signature.signedDocumentUrl
    if (signedUrl) {
      // Extract the filename from the signed document URL path
      const fileName = signedUrl.split('/').pop()
      if (fileName) {
        // Use the signed documents API endpoint
        window.open(`/api/signed-documents/${fileName}`, '_blank')
      }
    } else {
      // Fallback to original document if no signed version
      window.open(signature.documentFileUrl, '_blank')
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
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>Completed Documents</h2>
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
          <CardHeader>
            <CardTitle>Completed Documents</CardTitle>
            <CardDescription>
              All documents that have been fully signed by all recipients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Signer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedSignatures.map((signature) => (
                  <TableRow key={signature.id}>
                    <TableCell className='font-medium'>{signature.documentTitle}</TableCell>
                    <TableCell>
                      <div className='text-sm'>
                        <div className='font-medium'>
                          {signature.signerName || signature.signerEmail}
                        </div>
                        <div className='text-gray-500'>{signature.signerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant='default' className='bg-green-100 text-green-800'>
                        <CheckCircle className='h-3 w-3 mr-1' />
                        Signed
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {signature.signedAt ? (
                        <div className='text-sm'>
                          <div className='font-medium'>
                            {new Date(signature.signedAt).toLocaleDateString()}
                          </div>
                          <div className='text-gray-500'>
                            {new Date(signature.signedAt).toLocaleTimeString()}
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
                          onClick={() => handleViewDocument(signature)}
                        >
                          <Eye className='h-4 w-4 mr-2' />
                          View
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleDownloadSigned(signature)}
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
