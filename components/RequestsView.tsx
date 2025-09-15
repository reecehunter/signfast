'use client'

import { useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Send, Plus, Clock, FileText, Trash2 } from 'lucide-react'
import { SendDocumentDialog } from '@/components/SendDocumentDialog'

interface Document {
  id: string
  title: string
  fileName: string
  fileUrl: string
  status: string
  numberOfSigners: number
  createdAt: string
  signatures: Array<{
    id: string
    signerEmail: string
    signerName?: string
    signerIndex: number
    requestId?: string
    status: string
    signedAt: string | null
    createdAt: string
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

interface RequestsViewProps {
  documents: Document[]
  isLoading: boolean
  onRefresh: () => void
}

export function RequestsView({ documents, isLoading, onRefresh }: RequestsViewProps) {
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null)

  // Filter documents that have been sent for signature (have signatures)
  const sentDocuments = documents.filter((doc) => doc.signatures.length > 0)

  // Group signatures by requestId to show requests with multiple signers together
  const requestGroups = new Map<
    string,
    {
      requestId: string
      documentId: string
      documentTitle: string
      documentFileName: string
      documentFileUrl: string
      documentCreatedAt: string
      signatures: Array<{
        id: string
        signerEmail: string
        signerName?: string
        signerIndex: number
        status: string
        signedAt: string | null
        signatureCreatedAt: string
      }>
    }
  >()

  sentDocuments.forEach((document) => {
    document.signatures.forEach((signature) => {
      const requestId = signature.requestId || signature.id // fallback to signature.id for existing records

      if (!requestGroups.has(requestId)) {
        requestGroups.set(requestId, {
          requestId,
          documentId: document.id,
          documentTitle: document.title,
          documentFileName: document.fileName,
          documentFileUrl: document.fileUrl,
          documentCreatedAt: document.createdAt,
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
        signatureCreatedAt: signature.createdAt,
      })
    })
  })

  // Filter to only show requests that have pending signatures
  const signatureRequests = Array.from(requestGroups.values())
    .filter((group) => group.signatures.some((sig) => sig.status !== 'signed'))
    .sort((a, b) => {
      const aLatestSignature = Math.max(
        ...a.signatures.map((sig) => new Date(sig.signatureCreatedAt).getTime())
      )
      const bLatestSignature = Math.max(
        ...b.signatures.map((sig) => new Date(sig.signatureCreatedAt).getTime())
      )
      return bLatestSignature - aLatestSignature
    })

  // Filter documents that are available to send (draft status or any status - documents are reusable)
  const availableDocuments = documents.filter(
    (doc) => doc.status === 'draft' || doc.status === 'sent' || doc.status === 'completed'
  )

  const handleCreateRequest = (document: Document) => {
    setSelectedDocument(document)
    setShowSendDialog(true)
    setShowNewRequestDialog(false)
  }

  const handleDeleteRequest = async (requestId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this signature request? This action cannot be undone.'
      )
    ) {
      return
    }

    setDeletingRequestId(requestId)
    try {
      const response = await fetch(`/api/signature-requests/${requestId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onRefresh() // Refresh the list
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete signature request')
      }
    } catch (error) {
      console.error('Error deleting signature request:', error)
      alert('Failed to delete signature request')
    } finally {
      setDeletingRequestId(null)
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto'></div>
          <p className='mt-2 text-gray-600'>Loading requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4'>
        <div>
          <h2 className='text-xl sm:text-2xl font-bold text-gray-900'>Signature Requests</h2>
          <p className='text-gray-600'>Manage outgoing signature requests</p>
        </div>
        <Button onClick={() => setShowNewRequestDialog(true)} className='w-full sm:w-auto'>
          <Plus className='h-4 w-4 mr-2' />
          New Request
        </Button>
      </div>

      {/* Active Requests */}
      <Card>
        <CardContent className='p-0'>
          {signatureRequests.length === 0 ? (
            <div className='text-center py-8 px-4'>
              <Clock className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-gray-900 mb-2'>No active requests</h3>
              <p className='text-gray-500 mb-4'>
                Documents sent for signature that are pending completion will appear here.
              </p>
              <Button onClick={() => setShowNewRequestDialog(true)}>
                <Plus className='h-4 w-4 mr-2' />
                Create Request
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className='hidden lg:block'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signatureRequests.map((request) => {
                      const pendingSignatures = request.signatures.filter(
                        (sig) => sig.status !== 'signed'
                      )
                      const completedSignatures = request.signatures.filter(
                        (sig) => sig.status === 'signed'
                      )
                      const allSigned =
                        request.signatures.length > 0 &&
                        request.signatures.every((sig) => sig.status === 'signed')

                      return (
                        <TableRow key={request.requestId}>
                          <TableCell className='font-medium'>
                            <div className='flex flex-col items-start'>
                              <div className='font-medium'>{request.documentTitle}</div>
                              <div className='text-sm text-gray-500'>
                                {request.documentFileName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-1'>
                              {request.signatures
                                .sort((a, b) => a.signerIndex - b.signerIndex)
                                .map((signature) => (
                                  <div key={signature.id} className='text-sm'>
                                    <div className='flex items-center space-x-2'>
                                      <div
                                        className={`w-2 h-2 rounded-full ${
                                          signature.status === 'signed'
                                            ? 'bg-green-500'
                                            : 'bg-yellow-500'
                                        }`}
                                      />
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
                            <div className='text-sm'>
                              {allSigned ? (
                                <Badge variant='default' className='bg-green-600'>
                                  Completed
                                </Badge>
                              ) : (
                                <Badge variant='secondary'>
                                  {completedSignatures.length}/{request.signatures.length} signed
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(request.documentCreatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center space-x-2'>
                              <div className='text-sm text-gray-500'>
                                {allSigned ? (
                                  <span className='text-green-600'>All signed</span>
                                ) : (
                                  <span className='text-yellow-600'>
                                    {pendingSignatures.length} pending
                                  </span>
                                )}
                              </div>
                              {!allSigned && (
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() => handleDeleteRequest(request.requestId)}
                                  disabled={deletingRequestId === request.requestId}
                                  className='text-red-600 hover:text-red-700 hover:bg-red-50'
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className='lg:hidden'>
                <div className='space-y-4 p-4'>
                  {signatureRequests.map((request) => {
                    const completedSignatures = request.signatures.filter(
                      (sig) => sig.status === 'signed'
                    )
                    const allSigned =
                      request.signatures.length > 0 &&
                      request.signatures.every((sig) => sig.status === 'signed')

                    return (
                      <div key={request.requestId} className='border rounded-lg p-4 space-y-3'>
                        <div>
                          <h3 className='font-medium text-gray-900'>{request.documentTitle}</h3>
                          <p className='text-sm text-gray-500'>{request.documentFileName}</p>
                          <p className='text-xs text-gray-400 mt-1'>
                            Sent {new Date(request.documentCreatedAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div>
                          <h4 className='text-sm font-medium text-gray-700 mb-2'>Recipients:</h4>
                          <div className='space-y-2'>
                            {request.signatures
                              .sort((a, b) => a.signerIndex - b.signerIndex)
                              .map((signature) => (
                                <div key={signature.id} className='flex items-center space-x-2'>
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      signature.status === 'signed'
                                        ? 'bg-green-500'
                                        : 'bg-yellow-500'
                                    }`}
                                  />
                                  <div className='flex-1'>
                                    <div className='text-sm font-medium'>
                                      {signature.signerName || signature.signerEmail}
                                    </div>
                                    <div className='text-xs text-gray-500'>
                                      {signature.signerEmail}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>

                        <div className='flex items-center justify-between'>
                          <div>
                            {allSigned ? (
                              <Badge variant='default' className='bg-green-600'>
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant='secondary'>
                                {completedSignatures.length}/{request.signatures.length} signed
                              </Badge>
                            )}
                          </div>
                          {!allSigned && (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleDeleteRequest(request.requestId)}
                              disabled={deletingRequestId === request.requestId}
                              className='text-red-600 hover:text-red-700 hover:bg-red-50'
                            >
                              <Trash2 className='h-4 w-4 mr-2' />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* New Request Dialog */}
      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Create New Signature Request</DialogTitle>
            <DialogDescription>Select a document to send for signature</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            {availableDocuments.length === 0 ? (
              <div className='text-center py-8'>
                <FileText className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>No available documents</h3>
                <p className='text-gray-500 mb-4'>
                  Upload a document first to create a signature request.
                </p>
              </div>
            ) : (
              <div className='space-y-2'>
                <Label>Select Document</Label>
                <div className='grid gap-2 max-h-60 overflow-y-auto'>
                  {availableDocuments.map((document) => (
                    <Card
                      key={document.id}
                      className='cursor-pointer hover:bg-gray-50 transition-colors'
                      onClick={() => handleCreateRequest(document)}
                    >
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <h4 className='font-medium'>{document.title}</h4>
                            <p className='text-sm text-gray-500'>{document.fileName}</p>
                            <p className='text-xs text-gray-400'>
                              Uploaded {new Date(document.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button size='sm'>
                            <Send className='h-4 w-4 mr-2' />
                            Use
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SendDocumentDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        document={selectedDocument}
        onDocumentSent={onRefresh}
      />
    </div>
  )
}
