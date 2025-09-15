import React from 'react'
import { PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Logo({ size = 'md', className }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-primary text-primary-foreground',
        sizeClasses[size],
        className
      )}
    >
      <PenLine className={iconSizeClasses[size]} />
    </div>
  )
}
