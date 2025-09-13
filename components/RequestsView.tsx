'use client'

import { useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Send, Plus, Clock, FileText } from 'lucide-react'
import { SendDocumentDialog } from '@/components/SendDocumentDialog'

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

interface SignatureRequest {
  id: string
  documentId: string
  documentTitle: string
  documentFileName: string
  documentFileUrl: string
  documentCreatedAt: string
  signerEmail: string
  signerName?: string
  status: string
  signedAt: string | null
  signatureCreatedAt: string
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

  // Filter documents that have been sent for signature (have signatures)
  const sentDocuments = documents.filter((doc) => doc.signatures.length > 0)

  // Flatten signatures into individual rows for the table and filter out completed ones
  const signatureRequests: SignatureRequest[] = sentDocuments
    .flatMap((document) =>
      document.signatures.map((signature) => ({
        id: signature.id,
        documentId: document.id,
        documentTitle: document.title,
        documentFileName: document.fileName,
        documentFileUrl: document.fileUrl,
        documentCreatedAt: document.createdAt,
        signerEmail: signature.signerEmail,
        signerName: signature.signerName,
        status: signature.status,
        signedAt: signature.signedAt,
        signatureCreatedAt: signature.createdAt,
      }))
    )
    .filter((request) => request.status !== 'signed' && request.status !== 'completed')
    .sort(
      (a, b) => new Date(b.signatureCreatedAt).getTime() - new Date(a.signatureCreatedAt).getTime()
    )

  // Filter documents that are available to send (draft status or any status - documents are reusable)
  const availableDocuments = documents.filter(
    (doc) => doc.status === 'draft' || doc.status === 'sent' || doc.status === 'completed'
  )

  const handleCreateRequest = (document: Document) => {
    setSelectedDocument(document)
    setShowSendDialog(true)
    setShowNewRequestDialog(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant='secondary'>Pending</Badge>
      case 'sent':
        return <Badge variant='default'>Sent</Badge>
      case 'signed':
        return <Badge variant='default'>Signed</Badge>
      case 'completed':
        return <Badge variant='default'>Completed</Badge>
      default:
        return <Badge variant='outline'>{status}</Badge>
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
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>Signature Requests</h2>
          <p className='text-gray-600'>Manage outgoing signature requests</p>
        </div>
        <Button onClick={() => setShowNewRequestDialog(true)}>
          <Plus className='h-4 w-4 mr-2' />
          New Request
        </Button>
      </div>

      {/* Active Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Active Requests</CardTitle>
          <CardDescription>
            Documents sent for signature that are pending completion
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signatureRequests.length === 0 ? (
            <div className='text-center py-8'>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signatureRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className='font-medium'>{request.documentTitle}</TableCell>
                    <TableCell>
                      <div className='text-sm'>
                        <div className='font-medium'>
                          {request.signerName || request.signerEmail}
                        </div>
                        <div className='text-gray-500'>{request.signerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {new Date(request.documentCreatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className='text-sm text-gray-500'>
                        {request.status === 'signed' ? (
                          <span className='text-green-600'>Completed</span>
                        ) : (
                          <span className='text-yellow-600'>Pending</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
