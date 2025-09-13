'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Upload, FileText, Trash2, Edit } from 'lucide-react'
import { DocumentUploadDialog } from '@/components/DocumentUploadDialog'
import { EditDocumentDialog } from '@/components/EditDocumentDialog'

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
  }>
}

interface DocumentsViewProps {
  documents: Document[]
  isLoading: boolean
  onRefresh: () => void
}

export function DocumentsView({ documents, isLoading, onRefresh }: DocumentsViewProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)

  const handleEditDocument = (document: Document) => {
    setSelectedDocument(document)
    setShowEditDialog(true)
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onRefresh()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete document')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Failed to delete document')
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto'></div>
          <p className='mt-2 text-gray-600'>Loading documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>Documents</h2>
          <p className='text-gray-600'>Manage your uploaded documents</p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className='h-4 w-4 mr-2' />
          Upload Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <FileText className='h-12 w-12 text-gray-400 mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>No documents yet</h3>
            <p className='text-gray-500 text-center mb-4'>
              Upload your first document to get started with electronic signatures.
            </p>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className='h-4 w-4 mr-2' />
              Upload Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Documents</CardTitle>
            <CardDescription>View and manage your uploaded documents</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className='font-medium'>{document.title}</TableCell>
                    <TableCell>{new Date(document.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className='flex space-x-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleEditDocument(document)}
                        >
                          <Edit className='h-4 w-4 mr-2' />
                          Edit
                        </Button>
                        {(document.status === 'draft' ||
                          document.status === 'completed' ||
                          (document.signatures.length > 0 &&
                            document.signatures[0].status === 'signed')) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant='outline'
                                size='sm'
                                className='text-red-600 hover:text-red-700'
                              >
                                <Trash2 className='h-4 w-4 mr-2' />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{document.title}&quot;?
                                  {document.status === 'completed'
                                    ? ' This will permanently remove the completed document and all signature data.'
                                    : ' This action cannot be undone.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteDocument(document.id)}
                                  className='bg-red-600 hover:bg-red-700'
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <DocumentUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onDocumentUploaded={onRefresh}
      />

      <EditDocumentDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        document={selectedDocument}
        onDocumentEdited={onRefresh}
      />
    </div>
  )
}
