'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, User } from 'lucide-react'

interface Signer {
  email: string
  name: string
}

interface SignerManagerProps {
  signers: Signer[]
  onSignersChange: (signers: Signer[]) => void
  disabled?: boolean
}

export function SignerManager({ signers, onSignersChange, disabled = false }: SignerManagerProps) {
  const [errors, setErrors] = useState<{ [key: number]: string }>({})

  const addSigner = () => {
    if (signers.length < 10) {
      // Limit to 10 signers
      onSignersChange([...signers, { email: '', name: '' }])
    }
  }

  const removeSigner = (index: number) => {
    if (signers.length > 1) {
      // Keep at least one signer
      const newSigners = signers.filter((_, i) => i !== index)
      onSignersChange(newSigners)

      // Clear error for removed signer
      const newErrors = { ...errors }
      delete newErrors[index]
      setErrors(newErrors)
    }
  }

  const updateSigner = (index: number, field: 'email' | 'name', value: string) => {
    const newSigners = [...signers]
    newSigners[index] = { ...newSigners[index], [field]: value }
    onSignersChange(newSigners)

    // Validate email
    const newErrors = { ...errors }
    if (field === 'email') {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[index] = 'Please enter a valid email address'
      } else {
        delete newErrors[index]
      }
    }
    setErrors(newErrors)
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center space-x-2'>
          <User className='h-5 w-5' />
          <span>Document Signers</span>
        </CardTitle>
        <p className='text-sm text-gray-600'>
          Specify who needs to sign this document. You can add multiple signers who will sign in
          order.
        </p>
      </CardHeader>
      <CardContent className='space-y-4'>
        {signers.map((signer, index) => (
          <div key={index} className='border rounded-lg p-4 space-y-3'>
            <div className='flex items-center justify-between'>
              <h4 className='font-medium text-gray-900'>Signer {index + 1}</h4>
              {signers.length > 1 && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => removeSigner(index)}
                  disabled={disabled}
                  className='text-red-600 hover:text-red-700 hover:bg-red-50'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              )}
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <Label htmlFor={`signer-${index}-email`}>Email Address *</Label>
                <Input
                  id={`signer-${index}-email`}
                  type='email'
                  value={signer.email}
                  onChange={(e) => updateSigner(index, 'email', e.target.value)}
                  placeholder='signer@example.com'
                  disabled={disabled}
                  className={errors[index] ? 'border-red-500' : ''}
                />
                {errors[index] && <p className='text-sm text-red-600'>{errors[index]}</p>}
              </div>

              <div className='space-y-1'>
                <Label htmlFor={`signer-${index}-name`}>Full Name (Optional)</Label>
                <Input
                  id={`signer-${index}-name`}
                  type='text'
                  value={signer.name}
                  onChange={(e) => updateSigner(index, 'name', e.target.value)}
                  placeholder='John Doe'
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        ))}

        {signers.length < 10 && (
          <Button
            type='button'
            variant='outline'
            onClick={addSigner}
            disabled={disabled}
            className='w-full'
          >
            <Plus className='h-4 w-4 mr-2' />
            Add Another Signer
          </Button>
        )}

        {hasErrors && (
          <div className='text-sm text-red-600'>
            Please fix the email validation errors before proceeding.
          </div>
        )}

        <div className='text-sm text-gray-500'>
          <p>• Signers will receive emails in the order listed above</p>
          <p>• Each signer must complete their signature before the next signer is notified</p>
          <p>
            • You can assign specific signature areas to individual signers during document editing
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
