'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X, Loader2 } from 'lucide-react'
import { SignatureCapture } from '@/components/SignatureCapture'

interface SignatureArea {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  pageNumber: number
  label?: string
}

interface InteractivePDFSignerProps {
  pdfUrl: string
  signatureAreas: SignatureArea[]
  signerName: string
  signerDate: string
  businessName: string
  onComplete: (areaData: { [areaId: string]: { type: string; data: string } }) => void
  onCancel: () => void
  isSigning?: boolean
}

export function InteractivePDFSigner({
  pdfUrl,
  signatureAreas,
  signerName,
  signerDate,
  businessName,
  onComplete,
  onCancel,
  isSigning = false,
}: InteractivePDFSignerProps) {
  const [isClient, setIsClient] = useState(false)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [pageWidth, setPageWidth] = useState<number>(0)
  const [pageHeight, setPageHeight] = useState<number>(0)
  const [scale, setScale] = useState<number>(1)
  const [error, setError] = useState<string>('')
  const [showSignatureCapture, setShowSignatureCapture] = useState(false)
  const [selectedArea, setSelectedArea] = useState<SignatureArea | null>(null)
  const [completedAreas, setCompletedAreas] = useState<{
    [areaId: string]: { type: string; data: string }
  }>({})
  const [capturedSignature, setCapturedSignature] = useState<string>('')

  // Dynamic imports for client-side only
  const [Document, setDocument] = useState<any>(null)
  const [Page, setPage] = useState<any>(null)

  useEffect(() => {
    setIsClient(true)

    // Load react-pdf components only on client side
    const loadComponents = async () => {
      try {
        const { Document: Doc, Page: PageComp, pdfjs } = await import('react-pdf')

        // Use the worker that matches the react-pdf version
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

        setDocument(() => Doc)
        setPage(() => PageComp)
      } catch (err) {
        console.error('Error loading PDF components:', err)
        setError('Failed to load PDF viewer components. Please try refreshing the page.')
      }
    }

    loadComponents()
  }, [])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }, [])

  const onPageLoadSuccess = useCallback((page: any) => {
    const { width, height } = page.getViewport({ scale: 1 })
    setPageWidth(width)
    setPageHeight(height)
  }, [])

  const convertToScreenCoordinates = (pdfCoord: number, isX: boolean) => {
    return pdfCoord * scale
  }

  const getAreaTypeColor = (type: string, isCompleted: boolean) => {
    if (isCompleted) {
      return 'border-green-500 bg-green-500 bg-opacity-60 text-white'
    }

    // All unsigned areas are red
    return 'border-red-500 bg-red-500 bg-opacity-60 text-white'
  }

  const handleAreaClick = (area: SignatureArea) => {
    if (completedAreas[area.id]) {
      return // Area already completed
    }

    setSelectedArea(area)

    if (area.type === 'signature') {
      if (capturedSignature) {
        // Use the already captured signature
        setCompletedAreas((prev) => ({
          ...prev,
          [area.id]: { type: area.type, data: capturedSignature },
        }))
        setSelectedArea(null)
      } else {
        // Show signature capture dialog
        setShowSignatureCapture(true)
      }
    } else {
      // For name, date, and business, automatically fill with the provided data
      let data = ''
      if (area.type === 'name') {
        data = signerName
      } else if (area.type === 'date') {
        data = signerDate
      } else if (area.type === 'business') {
        data = businessName
      }

      if (data) {
        setCompletedAreas((prev) => ({
          ...prev,
          [area.id]: { type: area.type, data },
        }))
      }
      setSelectedArea(null)
    }
  }

  const handleSignatureComplete = (signature: string) => {
    // Store the captured signature for reuse
    setCapturedSignature(signature)

    if (selectedArea) {
      setCompletedAreas((prev) => ({
        ...prev,
        [selectedArea.id]: { type: selectedArea.type, data: signature },
      }))
    }
    setShowSignatureCapture(false)
    setSelectedArea(null)
  }

  const handleSignatureCancel = () => {
    setShowSignatureCapture(false)
    setSelectedArea(null)
  }

  const handleComplete = () => {
    onComplete(completedAreas)
  }

  const areasToRender = signatureAreas.filter((area) => area.pageNumber === pageNumber)

  const isAllAreasCompleted = areasToRender.every((area) => completedAreas[area.id])

  // Show loading state while components are loading
  if (!isClient || !Document || !Page) {
    return (
      <Card className='w-full max-w-6xl mx-auto'>
        <CardContent className='flex items-center justify-center h-96'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
            <p>Loading PDF viewer...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className='w-full max-w-6xl mx-auto'>
        <CardContent className='flex items-center justify-center h-96'>
          <div className='text-center text-red-600'>
            <p>Error: {error}</p>
            <Button onClick={() => window.location.reload()} className='mt-4'>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (showSignatureCapture) {
    return (
      <div className='min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-3xl mx-auto'>
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold text-gray-900'>Sign Document</h1>
            <p className='mt-2 text-gray-600'>
              Please provide your signature. This signature will be used for all signature areas.
            </p>
            <p className='mt-1 text-sm text-gray-500'>
              Area: {selectedArea?.label || selectedArea?.type}
            </p>
          </div>
          <SignatureCapture
            onSignatureComplete={handleSignatureComplete}
            onCancel={handleSignatureCancel}
          />
        </div>
      </div>
    )
  }

  return (
    <Card className='w-full max-w-6xl mx-auto'>
      <CardHeader>
        <CardTitle>Sign Document</CardTitle>
        <CardDescription>
          Click on the highlighted areas to add your signature, name, or date. All areas must be
          completed before you can finish signing.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Controls */}
        <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
          <div className='flex items-center space-x-4'>
            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                disabled={pageNumber <= 1}
              >
                Previous
              </Button>
              <span className='text-sm'>
                Page {pageNumber} of {numPages}
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPageNumber((prev) => Math.min(numPages, prev + 1))}
                disabled={pageNumber >= numPages}
              >
                Next
              </Button>
            </div>
            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setScale((prev) => Math.max(0.5, prev - 0.25))}
                disabled={scale <= 0.5}
              >
                Zoom Out
              </Button>
              <span className='text-sm min-w-[60px] text-center'>{Math.round(scale * 100)}%</span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setScale((prev) => Math.min(2, prev + 0.25))}
                disabled={scale >= 2}
              >
                Zoom In
              </Button>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            <span className='text-sm text-gray-600'>Click on highlighted areas to fill them</span>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className='border rounded-lg bg-white overflow-auto max-h-[70vh]'>
          <div className='flex justify-center p-4'>
            <div className='relative'>
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error: any) => setError(`Failed to load PDF: ${error.message}`)}
                loading={<div className='text-center p-8'>Loading PDF...</div>}
                error={<div className='text-center p-8 text-red-600'>Failed to load PDF</div>}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  onLoadSuccess={onPageLoadSuccess}
                  className='shadow-lg'
                />
              </Document>

              {/* Signature Areas */}
              {areasToRender
                .filter((area) => area.pageNumber === pageNumber)
                .map((area) => {
                  const isCompleted = !!completedAreas[area.id]
                  console.log(
                    'Rendering area:',
                    area,
                    'isCompleted:',
                    isCompleted,
                    'coordinates:',
                    {
                      x: convertToScreenCoordinates(area.x, true),
                      y: convertToScreenCoordinates(area.y, false),
                      width: convertToScreenCoordinates(area.width, true),
                      height: convertToScreenCoordinates(area.height, false),
                    }
                  )
                  return (
                    <div
                      key={area.id}
                      className={`absolute border-2 cursor-pointer transition-all duration-200 hover:shadow-lg z-10 ${getAreaTypeColor(
                        area.type,
                        isCompleted
                      )}`}
                      style={{
                        left: convertToScreenCoordinates(area.x, true),
                        top: convertToScreenCoordinates(area.y, false),
                        width: convertToScreenCoordinates(area.width, true),
                        height: convertToScreenCoordinates(area.height, false),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        pointerEvents: 'auto',
                        zIndex: 10,
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleAreaClick(area)
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                    >
                      <div className='text-center'>
                        <div>{area.label || area.type}</div>
                        {isCompleted && (
                          <div className='text-xs mt-1'>
                            <Check className='h-3 w-3 mx-auto' />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className='text-sm text-gray-600'>
          <div className='flex space-x-4'>
            <span>
              Areas completed: {Object.keys(completedAreas).length} / {areasToRender.length}
            </span>
            <span className='text-blue-600'>
              Signatures:{' '}
              {areasToRender.filter((a) => a.type === 'signature' && completedAreas[a.id]).length} /{' '}
              {areasToRender.filter((a) => a.type === 'signature').length}
            </span>
            <span className='text-green-600'>
              Names: {areasToRender.filter((a) => a.type === 'name' && completedAreas[a.id]).length}{' '}
              / {areasToRender.filter((a) => a.type === 'name').length}
            </span>
            <span className='text-purple-600'>
              Dates: {areasToRender.filter((a) => a.type === 'date' && completedAreas[a.id]).length}{' '}
              / {areasToRender.filter((a) => a.type === 'date').length}
            </span>
            <span className='text-orange-600'>
              Business:{' '}
              {areasToRender.filter((a) => a.type === 'business' && completedAreas[a.id]).length} /{' '}
              {areasToRender.filter((a) => a.type === 'business').length}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className='flex justify-between items-center pt-4 border-t'>
          <div>
            <Button variant='outline' onClick={onCancel}>
              <X className='h-4 w-4 mr-2' />
              Cancel
            </Button>
          </div>
          <div className='flex space-x-2'>
            <Button onClick={handleComplete} disabled={!isAllAreasCompleted || isSigning}>
              {isSigning ? (
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
              ) : (
                <Check className='h-4 w-4 mr-2' />
              )}
              {isSigning ? 'Signing...' : 'Complete Signing'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
