import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BillingRestrictionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message?: string
}

export function BillingRestrictionDialog({
  open,
  onOpenChange,
  message = 'No free signatures remaining and no active paid subscription. Please upgrade to a paid plan to continue sending documents.',
}: BillingRestrictionDialogProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    onOpenChange(false)
    router.push('/dashboard/billing')
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <CreditCard className='h-5 w-5 text-amber-500' />
            Upgrade Required
          </DialogTitle>
          <DialogDescription className='text-left'>{message}</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col sm:flex-row gap-3 pt-4'>
          <Button variant='outline' onClick={handleClose} className='flex-1'>
            Close
          </Button>
          <Button onClick={handleUpgrade} className='flex-1 bg-amber-500 hover:bg-amber-600'>
            <CreditCard className='h-4 w-4 mr-2' />
            Upgrade Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
