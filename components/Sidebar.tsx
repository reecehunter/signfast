'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileText, Send, CheckCircle, Menu, X, LogOut, CreditCard } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Logo } from '@/components/Logo'

export type SidebarView = 'documents' | 'requests' | 'completed' | 'billing'

interface SidebarProps {
  userName?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  isMobileOpen?: boolean
  onMobileToggle?: () => void
}

const navigationItems = [
  {
    id: 'documents' as SidebarView,
    label: 'Documents',
    icon: FileText,
    path: '/dashboard/documents',
  },
  {
    id: 'requests' as SidebarView,
    label: 'Requests',
    icon: Send,
    path: '/dashboard/requests',
  },
  {
    id: 'completed' as SidebarView,
    label: 'Completed',
    icon: CheckCircle,
    path: '/dashboard/completed',
  },
  {
    id: 'billing' as SidebarView,
    label: 'Billing',
    icon: CreditCard,
    path: '/dashboard/billing',
  },
]

export function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileToggle,
}: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    // Close mobile sidebar after navigation
    if (isMobile && onMobileToggle) {
      onMobileToggle()
    }
  }

  const getCurrentView = (): SidebarView => {
    if (pathname.includes('/dashboard/requests')) return 'requests'
    if (pathname.includes('/dashboard/completed')) return 'completed'
    if (pathname.includes('/dashboard/billing')) return 'billing'
    return 'documents' // default to documents
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden'
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col',
          // Desktop styles
          !isMobile && (isCollapsed ? 'w-16' : 'w-64'),
          // Mobile styles
          isMobile && [
            'fixed top-0 left-0 h-full z-50',
            isMobileOpen ? 'w-64' : '-translate-x-full',
          ]
        )}
      >
        {/* Header */}
        <div className='p-6'>
          <div className='flex items-center justify-between'>
            {(!isCollapsed || isMobile) && (
              <div className='flex items-center space-x-2'>
                <Logo size='sm' />
                <h1 className='text-lg font-semibold text-gray-900'>SignFast</h1>
              </div>
            )}
            <div className='flex items-center space-x-2'>
              {/* Mobile close button */}
              {isMobile && onMobileToggle && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={onMobileToggle}
                  className='p-1 hover:bg-gray-200'
                >
                  <X className='h-4 w-4' />
                </Button>
              )}
              {/* Desktop collapse button */}
              {!isMobile && onToggleCollapse && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={onToggleCollapse}
                  className='p-1 hover:bg-gray-200'
                >
                  {isCollapsed ? <Menu className='h-4 w-4' /> : <X className='h-4 w-4' />}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className='flex-1 px-4'>
          <ul className='space-y-2'>
            {navigationItems.map((item) => {
              const Icon = item.icon
              const currentView = getCurrentView()
              const isActive = currentView === item.id

              return (
                <li key={item.id}>
                  <Button
                    variant='ghost'
                    className={cn(
                      'w-full justify-start h-auto py-3 px-3',
                      isCollapsed ? 'px-2' : 'px-3',
                      isActive && 'text-amber-500 bg-amber-50'
                    )}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <Icon className={cn('h-5 w-5', (!isCollapsed || isMobile) && 'mr-3')} />
                    {(!isCollapsed || isMobile) && (
                      <span className='font-medium text-sm'>{item.label}</span>
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className='p-4'>
          <Button
            variant='ghost'
            className={cn(
              'w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-white h-auto py-3 px-3',
              isCollapsed ? 'px-2' : 'px-3'
            )}
            onClick={handleSignOut}
          >
            <LogOut className={cn('h-5 w-5', (!isCollapsed || isMobile) && 'mr-3')} />
            {(!isCollapsed || isMobile) && <span className='font-medium text-sm'>Sign Out</span>}
          </Button>
        </div>
      </div>
    </>
  )
}
