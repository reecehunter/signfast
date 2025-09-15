'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'

// Note: react-pdf styles are imported in globals.css to avoid module resolution issues

// Minimum area size constants (in pixels)
const MIN_AREA_WIDTH = 50
const MIN_AREA_HEIGHT = 30

interface SignatureArea {
  id?: string
  x: number
  y: number
  width: number
  height: number
  pageNumber: number
  type: 'signature' | 'name' | 'date' | 'business'
  label?: string
  signerIndex?: number | null // Which signer this area belongs to (0-based, null for all signers)
}

interface ClientPDFSelectorProps {
  pdfUrl: string
  onAreasSelected: (areas: SignatureArea[]) => void
  onCancel: () => void
  existingAreas?: SignatureArea[]
  numberOfSigners?: number // Number of signers for this document
}

export function ClientPDFSelector({
  pdfUrl,
  onAreasSelected,
  onCancel,
  existingAreas = [],
  numberOfSigners = 1,
}: ClientPDFSelectorProps) {
  const [isClient, setIsClient] = useState(false)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [pageWidth, setPageWidth] = useState<number>(0)
  const [pageHeight, setPageHeight] = useState<number>(0)
  const [scale, setScale] = useState<number>(1)
  const [signatureAreas, setSignatureAreas] = useState<SignatureArea[]>([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 })
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 })
  const [currentAreaType, setCurrentAreaType] = useState<
    'signature' | 'name' | 'date' | 'business'
  >('signature')
  const [currentSignerIndex, setCurrentSignerIndex] = useState<number | null>(null) // null means all signers
  const [error, setError] = useState<string>('')
  const [isSelectionTooSmall, setIsSelectionTooSmall] = useState(false)

  // Dynamic imports for client-side only
  const [Document, setDocument] = useState<React.ComponentType<{
    file: string
    onLoadSuccess: (data: { numPages: number }) => void
    onLoadError: (error: Error) => void
    loading: React.ReactNode
    error: React.ReactNode
    children: React.ReactNode
  }> | null>(null)
  const [Page, setPage] = useState<React.ComponentType<{
    pageNumber: number
    scale: number
    onLoadSuccess: (page: {
      getViewport: (options: { scale: number }) => { width: number; height: number }
    }) => void
    className?: string
  }> | null>(null)

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

  // Load existing areas when component mounts or existingAreas changes
  useEffect(() => {
    if (existingAreas && existingAreas.length > 0) {
      setSignatureAreas(existingAreas)
    }
  }, [existingAreas])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }, [])

  const onPageLoadSuccess = useCallback(
    (page: { getViewport: (options: { scale: number }) => { width: number; height: number } }) => {
      const { width, height } = page.getViewport({ scale: 1 })
      setPageWidth(width)
      setPageHeight(height)
    },
    []
  )

  const handleSignatureAreaChange = (
    index: number,
    data: { x: number; y: number; width: number; height: number }
  ) => {
    setSignatureAreas((prev) => {
      const newAreas = [...prev]
      newAreas[index] = {
        ...newAreas[index],
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
      }
      return newAreas
    })
  }

  const handleRemoveSignatureArea = (index: number) => {
    console.log('Removing area at index:', index)
    console.log('Current areas:', signatureAreas)
    setSignatureAreas((prev) => {
      const newAreas = prev.filter((_, i) => i !== index)
      console.log('New areas after removal:', newAreas)
      return newAreas
    })
  }

  const handleConfirm = () => {
    if (signatureAreas.length > 0) {
      onAreasSelected(signatureAreas)
    }
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setSelectionStart({ x, y })
    setSelectionEnd({ x, y })
    setIsSelecting(true)
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isSelecting) return

    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setSelectionEnd({ x, y })

    // Check if current selection meets minimum size requirements
    const width = Math.abs(x - selectionStart.x)
    const height = Math.abs(y - selectionStart.y)
    const isTooSmall = width < MIN_AREA_WIDTH || height < MIN_AREA_HEIGHT
    setIsSelectionTooSmall(isTooSmall)
  }

  const handleMouseUp = () => {
    if (!isSelecting) return

    const width = Math.abs(selectionEnd.x - selectionStart.x)
    const height = Math.abs(selectionEnd.y - selectionStart.y)

    // Only create signature area if selection meets minimum size requirements
    if (width >= MIN_AREA_WIDTH && height >= MIN_AREA_HEIGHT) {
      const x = Math.min(selectionStart.x, selectionEnd.x)
      const y = Math.min(selectionStart.y, selectionEnd.y)

      // Convert screen coordinates to PDF coordinates
      // The screen coordinates are relative to the PDF container, so we need to account for scale
      const pdfX = x / scale
      const pdfY = y / scale
      const pdfWidth = width / scale
      const pdfHeight = height / scale

      const newArea: SignatureArea = {
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight,
        pageNumber: pageNumber,
        type: currentAreaType,
        signerIndex: currentSignerIndex,
        label: `${currentAreaType.charAt(0).toUpperCase() + currentAreaType.slice(1)} ${
          signatureAreas.filter((a) => a.type === currentAreaType).length + 1
        }${currentSignerIndex !== null ? ` (Signer ${currentSignerIndex + 1})` : ''}`,
      }

      setSignatureAreas((prev) => [...prev, newArea])
    }

    setIsSelecting(false)
    setIsSelectionTooSmall(false)
  }

  const convertToScreenCoordinates = (pdfCoord: number, isX: boolean) => {
    if (isX) {
      return (pdfCoord / pageWidth) * (pageWidth * scale)
    } else {
      return (pdfCoord / pageHeight) * (pageHeight * scale)
    }
  }

  const getAreaTypeColor = (type: 'signature' | 'name' | 'date' | 'business') => {
    switch (type) {
      case 'signature':
        return 'border-blue-500 bg-blue-100 bg-opacity-30 text-blue-700'
      case 'name':
        return 'border-green-500 bg-green-100 bg-opacity-30 text-green-700'
      case 'date':
        return 'border-purple-500 bg-purple-100 bg-opacity-30 text-purple-700'
      case 'business':
        return 'border-orange-500 bg-orange-100 bg-opacity-30 text-orange-700'
      default:
        return 'border-gray-500 bg-gray-100 bg-opacity-30 text-gray-700'
    }
  }

  // Show loading state while components are loading
  if (!isClient || !Document || !Page) {
    return (
      <div className='w-full max-w-6xl mx-auto'>
        <div className='flex items-center justify-center h-96'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
            <p>Loading PDF viewer...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='w-full max-w-6xl mx-auto'>
        <div className='flex items-center justify-center h-96'>
          <div className='text-center text-red-600'>
            <p>Error: {error}</p>
            <Button onClick={() => window.location.reload()} className='mt-4'>
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full max-w-6xl mx-auto space-y-4'>
      <div className='mb-6'>
        <h2 className='text-2xl font-bold text-gray-900'>Select Document Areas</h2>
        <p className='text-gray-600'>
          Choose the type of area to add, then click and drag on the PDF to create areas. You can
          then drag and resize the boxes.
        </p>
      </div>
      {/* Area Type Selection */}
      <div className='flex items-center space-x-4 p-3 bg-blue-50 rounded-lg'>
        <span className='text-sm font-medium text-gray-700'>Add area type:</span>
        <div className='flex space-x-2'>
          <Button
            variant={currentAreaType === 'signature' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setCurrentAreaType('signature')}
            className={currentAreaType === 'signature' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Signature
          </Button>
          <Button
            variant={currentAreaType === 'name' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setCurrentAreaType('name')}
            className={currentAreaType === 'name' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            Name
          </Button>
          <Button
            variant={currentAreaType === 'date' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setCurrentAreaType('date')}
            className={currentAreaType === 'date' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            Date
          </Button>
          <Button
            variant={currentAreaType === 'business' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setCurrentAreaType('business')}
            className={currentAreaType === 'business' ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            Business Name
          </Button>
        </div>
      </div>

      {/* Signer Selection */}
      {numberOfSigners > 1 && (
        <div className='flex items-center space-x-4 p-3 bg-green-50 rounded-lg'>
          <span className='text-sm font-medium text-gray-700'>Assign to signer:</span>
          <div className='flex space-x-2'>
            <Button
              variant={currentSignerIndex === null ? 'default' : 'outline'}
              size='sm'
              onClick={() => setCurrentSignerIndex(null)}
              className={currentSignerIndex === null ? 'bg-gray-600 hover:bg-gray-700' : ''}
            >
              All Signers
            </Button>
            {Array.from({ length: numberOfSigners }, (_, i) => (
              <Button
                key={i}
                variant={currentSignerIndex === i ? 'default' : 'outline'}
                size='sm'
                onClick={() => setCurrentSignerIndex(i)}
                className={currentSignerIndex === i ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
              >
                Signer {i + 1}
              </Button>
            ))}
          </div>
        </div>
      )}

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
      </div>

      {/* PDF Viewer */}
      <div className='border rounded-lg bg-white overflow-auto max-h-[70vh]'>
        <div className='flex justify-center p-4'>
          <div
            className='relative cursor-crosshair'
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsSelecting(false)}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error: Error) => setError(`Failed to load PDF: ${error.message}`)}
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

            {/* Selection rectangle */}
            {isSelecting && (
              <div
                className={`absolute border-2 pointer-events-none ${
                  isSelectionTooSmall
                    ? 'border-red-500 bg-red-100 bg-opacity-30'
                    : 'border-blue-500 bg-blue-100 bg-opacity-30'
                }`}
                style={{
                  left: Math.min(selectionStart.x, selectionEnd.x),
                  top: Math.min(selectionStart.y, selectionEnd.y),
                  width: Math.abs(selectionEnd.x - selectionStart.x),
                  height: Math.abs(selectionEnd.y - selectionStart.y),
                }}
              />
            )}

            {/* Signature Areas */}
            {signatureAreas
              .filter((area) => area.pageNumber === pageNumber)
              .map((area) => {
                // Find the actual index in the full array
                const actualIndex = signatureAreas.findIndex((a) => a === area)
                return (
                  <div
                    key={actualIndex}
                    className={`absolute border-2 ${getAreaTypeColor(area.type)}`}
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
                      cursor: 'move',
                      zIndex: 1000,
                      position: 'absolute',
                      pointerEvents: 'auto',
                    }}
                    onMouseDown={(e) => {
                      if (
                        e.target === e.currentTarget ||
                        (e.target as HTMLElement).classList.contains('drag-handle')
                      ) {
                        // Start dragging
                        const startX = e.clientX
                        const startY = e.clientY
                        const startAreaX = area.x
                        const startAreaY = area.y

                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const deltaX = moveEvent.clientX - startX
                          const deltaY = moveEvent.clientY - startY
                          const newPdfX = startAreaX + (deltaX / (pageWidth * scale)) * pageWidth
                          const newPdfY = startAreaY + (deltaY / (pageHeight * scale)) * pageHeight

                          handleSignatureAreaChange(actualIndex, {
                            ...area,
                            x: newPdfX,
                            y: newPdfY,
                          })
                        }

                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove)
                          document.removeEventListener('mouseup', handleMouseUp)
                        }

                        document.addEventListener('mousemove', handleMouseMove)
                        document.addEventListener('mouseup', handleMouseUp)
                      }
                    }}
                  >
                    <div className='text-center w-full h-full flex flex-col justify-center'>
                      <div className='drag-handle'>{area.label || area.type}</div>
                    </div>
                    {/* Remove button - positioned in top right corner */}
                    <button
                      className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors duration-200'
                      style={{ zIndex: 1001, pointerEvents: 'auto' }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log(
                          'Remove button clicked for area:',
                          area,
                          'actualIndex:',
                          actualIndex
                        )
                        handleRemoveSignatureArea(actualIndex)
                      }}
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className='text-sm text-gray-600'>
        {signatureAreas.length > 0 ? (
          <div className='space-y-2'>
            <div className='flex space-x-4'>
              <span>Total areas: {signatureAreas.length}</span>
              <span className='text-blue-600'>
                Signatures: {signatureAreas.filter((a) => a.type === 'signature').length}
              </span>
              <span className='text-green-600'>
                Names: {signatureAreas.filter((a) => a.type === 'name').length}
              </span>
              <span className='text-purple-600'>
                Dates: {signatureAreas.filter((a) => a.type === 'date').length}
              </span>
              <span className='text-orange-600'>
                Business: {signatureAreas.filter((a) => a.type === 'business').length}
              </span>
            </div>
            {numberOfSigners > 1 && (
              <div className='flex space-x-4'>
                <span>Signer assignments:</span>
                {Array.from({ length: numberOfSigners }, (_, i) => (
                  <span key={i} className='text-indigo-600'>
                    Signer {i + 1}: {signatureAreas.filter((a) => a.signerIndex === i).length} areas
                  </span>
                ))}
                <span className='text-gray-500'>
                  All signers: {signatureAreas.filter((a) => a.signerIndex === null).length} areas
                </span>
              </div>
            )}
          </div>
        ) : (
          'No areas added yet'
        )}
      </div>

      {/* Action buttons */}
      <div className='flex justify-between items-center pt-4 border-t'>
        <div>
          {signatureAreas.length > 0 && (
            <Button variant='outline' size='sm' onClick={() => setSignatureAreas([])}>
              Clear All
            </Button>
          )}
        </div>
        <div className='flex space-x-2'>
          <Button variant='outline' onClick={onCancel}>
            <X className='h-4 w-4 mr-2' />
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={signatureAreas.length === 0}
            className='bg-blue-600 hover:bg-blue-700'
          >
            <Check className='h-4 w-4 mr-2' />
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}
