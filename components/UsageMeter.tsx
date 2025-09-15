'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CreditCard, Zap, Infinity, AlertCircle, TrendingUp } from 'lucide-react'

interface UsageStats {
  freeSignaturesRemaining: number
  planType: string
  subscriptionStatus: string
  currentMonthUsage: number
  currentMonthBilled: number
  totalUsage: number
}

export default function UsageMeter() {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

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
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='h-20 bg-gray-200 animate-pulse rounded'></div>
        </CardContent>
      </Card>
    )
  }

  if (!usageStats) {
    return null
  }

  const {
    planType,
    freeSignaturesRemaining,
    currentMonthUsage,
    currentMonthBilled,
    subscriptionStatus,
  } = usageStats

  const getPlanIcon = () => {
    switch (planType) {
      case 'free':
        return <Zap className='h-4 w-4' />
      case 'metered':
        return <TrendingUp className='h-4 w-4' />
      case 'unlimited':
        return <Infinity className='h-4 w-4' />
      default:
        return <Zap className='h-4 w-4' />
    }
  }

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

  const getUsageText = () => {
    switch (planType) {
      case 'free':
        return `${freeSignaturesRemaining} free signatures remaining`
      case 'metered':
        return `${currentMonthUsage} signatures this month (${currentMonthBilled} billed)`
      case 'unlimited':
        return 'Unlimited signatures'
      default:
        return 'Unknown plan'
    }
  }

  const getUsageProgress = () => {
    if (planType === 'free') {
      return ((5 - freeSignaturesRemaining) / 5) * 100
    }
    return 0 // For metered and unlimited, we don't show progress
  }

  const shouldShowUpgrade = planType === 'free' && freeSignaturesRemaining <= 1

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          {getPlanIcon()}
          Usage & Billing
        </CardTitle>
        <CardDescription>Your current plan and signature usage</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>Plan:</span>
            {getPlanBadge()}
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => (window.location.href = '/dashboard/billing')}
          >
            <CreditCard className='h-3 w-3 mr-1' />
            Manage
          </Button>
        </div>

        <div className='space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span>Usage:</span>
            <span className='font-medium'>{getUsageText()}</span>
          </div>

          {planType === 'free' && <Progress value={getUsageProgress()} className='h-2' />}

          {planType === 'metered' && currentMonthBilled > 0 && (
            <div className='text-sm text-gray-600'>Estimated cost: ${currentMonthBilled}.00</div>
          )}
        </div>

        {shouldShowUpgrade && (
          <div className='flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded-lg'>
            <AlertCircle className='h-4 w-4' />
            <span className='flex-1'>
              Running low on free signatures. Consider upgrading to continue signing documents.
            </span>
            <Button size='sm' onClick={() => (window.location.href = '/dashboard/billing')}>
              Upgrade
            </Button>
          </div>
        )}

        {subscriptionStatus === 'past_due' && (
          <div className='flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg'>
            <AlertCircle className='h-4 w-4' />
            <span className='flex-1'>
              Payment failed. Please update your payment method to continue using the service.
            </span>
            <Button size='sm' variant='destructive' onClick={openBillingPortal}>
              Fix Payment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
