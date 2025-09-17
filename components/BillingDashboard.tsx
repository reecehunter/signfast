'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CreditCard, Zap, Infinity, AlertCircle } from 'lucide-react'
import { BillingLoadingSkeleton } from '@/components/LoadingSkeletons'

interface UsageStats {
  freeSignaturesRemaining: number
  planType: string
  subscriptionStatus: string
  currentMonthUsage: number
  currentMonthBilled: number
  totalUsage: number
}

export default function BillingDashboard() {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    fetchUsageStats()
  }, [])

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/billing/usage')
      if (response.ok) {
        const stats = await response.json()
        setUsageStats(stats)
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (planType: string) => {
    setUpgrading(true)
    try {
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planType }),
      })

      if (response.ok) {
        const result = await response.json()

        // If we get a checkout URL, redirect to Stripe Checkout
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl
        } else {
          // For existing subscriptions that were updated directly
          await fetchUsageStats() // Refresh stats
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to upgrade plan')
      }
    } catch (error) {
      console.error('Error upgrading plan:', error)
      alert('Failed to upgrade plan')
    } finally {
      setUpgrading(false)
    }
  }

  const openBillingPortal = async () => {
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      if (response.ok) {
        const { url } = await response.json()
        window.open(url, '_blank')
      } else {
        alert('Failed to open billing portal')
      }
    } catch (error) {
      console.error('Error opening billing portal:', error)
      alert('Failed to open billing portal')
    }
  }

  if (loading) {
    return <BillingLoadingSkeleton />
  }

  if (!usageStats) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='text-center text-gray-500'>Failed to load billing information</div>
        </CardContent>
      </Card>
    )
  }

  const {
    planType,
    freeSignaturesRemaining,
    currentMonthUsage,
    currentMonthBilled,
    subscriptionStatus,
  } = usageStats

  const getPlanBadge = () => {
    switch (planType) {
      case 'free':
        return <Badge variant='secondary'>Free</Badge>
      case 'metered':
        return <Badge variant='default'>Pay-per-use</Badge>
      case 'unlimited':
        return (
          <Badge variant='default' className='bg-green-600'>
            Unlimited
          </Badge>
        )
      default:
        return <Badge variant='outline'>Unknown</Badge>
    }
  }

  const getStatusBadge = () => {
    switch (subscriptionStatus) {
      case 'active':
        return (
          <Badge variant='default' className='bg-green-600'>
            Active
          </Badge>
        )
      case 'past_due':
        return <Badge variant='destructive'>Past Due</Badge>
      case 'canceled':
        return <Badge variant='secondary'>Canceled</Badge>
      case 'incomplete':
        return <Badge variant='outline'>Incomplete</Badge>
      default:
        return <Badge variant='outline'>Unknown</Badge>
    }
  }

  return (
    <div className='space-y-6'>
      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <CreditCard className='h-5 w-5' />
            Current Plan
          </CardTitle>
          <CardDescription>Your current billing plan and usage information</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Plan:</span>
              {getPlanBadge()}
            </div>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Status:</span>
              {getStatusBadge()}
            </div>
          </div>

          {planType === 'free' && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span>Free signatures remaining</span>
                <span className='font-medium'>{freeSignaturesRemaining}/5</span>
              </div>
              <Progress value={((5 - freeSignaturesRemaining) / 5) * 100} className='h-2' />
              {freeSignaturesRemaining === 0 && (
                <div className='flex items-center gap-2 text-amber-600 text-sm'>
                  <AlertCircle className='h-4 w-4' />
                  <span>No free signatures remaining. Upgrade to continue signing documents.</span>
                </div>
              )}
            </div>
          )}

          {planType === 'metered' && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span>Signatures this month</span>
                <span className='font-medium'>{currentMonthUsage}</span>
              </div>
              <div className='flex items-center justify-between text-sm text-gray-600'>
                <span>Billed signatures</span>
                <span>{currentMonthBilled}</span>
              </div>
              <div className='flex items-center justify-between text-sm text-gray-600'>
                <span>Estimated cost</span>
                <span>${currentMonthBilled}.00</span>
              </div>
            </div>
          )}

          {planType === 'unlimited' && (
            <div className='flex items-center gap-2 text-green-600'>
              <Infinity className='h-4 w-4' />
              <span className='text-sm'>Unlimited signatures included</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Options */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Zap className='h-5 w-5' />
            Plan Options
          </CardTitle>
          <CardDescription>Choose the plan that works best for you</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            {/* Metered Plan */}
            <div className='border rounded-lg p-4 space-y-3'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                <h3 className='font-semibold'>Pay-per-use</h3>
                <Badge variant={planType === 'metered' ? 'default' : 'outline'}>
                  {planType === 'metered' ? 'Current' : '$1/signature'}
                </Badge>
              </div>
              <p className='text-sm text-gray-600'>
                Pay only for what you use. $1 per signature after your free 5 signatures.
              </p>
              <ul className='text-sm space-y-1'>
                <li>• 5 free signatures</li>
                <li>• $1 per additional signature</li>
                <li>• Monthly billing</li>
                <li>• No monthly minimum</li>
              </ul>
              {planType !== 'metered' && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleUpgrade('metered')}
                  disabled={upgrading}
                  className='w-full'
                >
                  {upgrading ? 'Upgrading...' : 'Switch to Pay-per-use'}
                </Button>
              )}
            </div>

            {/* Unlimited Plan */}
            <div className='border rounded-lg p-4 space-y-3'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                <h3 className='font-semibold'>Unlimited</h3>
                <Badge variant={planType === 'unlimited' ? 'default' : 'outline'}>
                  {planType === 'unlimited' ? 'Current' : '$15/month'}
                </Badge>
              </div>
              <p className='text-sm text-gray-600'>
                Unlimited signatures for a flat monthly fee. Perfect for heavy users.
              </p>
              <ul className='text-sm space-y-1'>
                <li>• Unlimited signatures</li>
                <li>• $15 per month</li>
                <li>• No per-signature charges</li>
                <li>• Cancel anytime</li>
              </ul>
              {planType !== 'unlimited' && (
                <Button
                  size='sm'
                  onClick={() => handleUpgrade('unlimited')}
                  disabled={upgrading}
                  className='w-full'
                >
                  {upgrading ? 'Upgrading...' : 'Upgrade to Unlimited'}
                </Button>
              )}
            </div>
          </div>

          {/* Billing Portal */}
          <div className='pt-4 border-t'>
            <Button variant='outline' onClick={openBillingPortal} className='w-full'>
              <CreditCard className='h-4 w-4 mr-2' />
              Manage Billing & Payment Methods
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
