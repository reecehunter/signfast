'use client'

import { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RotateCcw, Check, X } from 'lucide-react'

interface SignatureCaptureProps {
  onSignatureComplete: (signatureData: string) => void
  onCancel: () => void
}

export function SignatureCapture({ onSignatureComplete, onCancel }: SignatureCaptureProps) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    // Ensure canvas is properly sized after component mounts
    if (sigCanvas.current) {
      const canvas = sigCanvas.current.getCanvas()
      // Set explicit canvas dimensions to match the style
      canvas.width = 400
      canvas.height = 200
      console.log('Canvas initialized with dimensions:', {
        width: canvas.width,
        height: canvas.height,
      })
    }
  }, [])

  const clear = () => {
    sigCanvas.current?.clear()
    setIsEmpty(true)
  }

  const save = () => {
    if (sigCanvas.current && !isEmpty) {
      // Get the canvas and ensure we're getting the actual canvas dimensions
      const canvas = sigCanvas.current.getCanvas()
      console.log('Canvas dimensions:', {
        width: canvas.width,
        height: canvas.height,
        styleWidth: canvas.style.width,
        styleHeight: canvas.style.height,
      })

      const signatureData = sigCanvas.current.toDataURL('image/png')
      onSignatureComplete(signatureData)
    }
  }

  const handleBegin = () => {
    setIsEmpty(false)
  }

  const handleEnd = () => {
    if (sigCanvas.current) {
      setIsEmpty(sigCanvas.current.isEmpty())
    }
  }

  return (
    <Card className='w-full max-w-2xl mx-auto'>
      <CardHeader>
        <CardTitle>Sign Document</CardTitle>
        <CardDescription>
          Please sign in the box below using your mouse, touchpad, or touchscreen
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white'>
          <div className='flex justify-center'>
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'border border-gray-200 rounded',
                style: {
                  touchAction: 'none',
                  width: '400px',
                  height: '200px',
                },
              }}
              onBegin={handleBegin}
              onEnd={handleEnd}
              backgroundColor={undefined}
              penColor='black'
              minWidth={2}
              maxWidth={3}
              velocityFilterWeight={0.7}
            />
          </div>
        </div>

        <div className='flex justify-between items-center'>
          <div className='text-sm text-gray-500'>
            {isEmpty ? 'Please sign above' : 'Signature captured'}
          </div>
          <div className='flex space-x-2'>
            <Button variant='outline' size='sm' onClick={clear} disabled={isEmpty}>
              <RotateCcw className='h-4 w-4 mr-2' />
              Clear
            </Button>
          </div>
        </div>

        <div className='flex justify-end space-x-2 pt-4 border-t'>
          <Button variant='outline' onClick={onCancel}>
            <X className='h-4 w-4 mr-2' />
            Cancel
          </Button>
          <Button onClick={save} disabled={isEmpty}>
            <Check className='h-4 w-4 mr-2' />
            Sign Document
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
