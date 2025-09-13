'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileText, Send, CheckCircle, Menu, X, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

export type SidebarView = 'documents' | 'requests' | 'completed'

interface SidebarProps {
  userName?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
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
]

export function Sidebar({ userName, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const getCurrentView = (): SidebarView => {
    if (pathname.includes('/dashboard/requests')) return 'requests'
    if (pathname.includes('/dashboard/completed')) return 'completed'
    return 'documents' // default to documents
  }

  return (
    <div
      className={cn(
        'bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className='p-6'>
        <div className='flex items-center justify-between'>
          {!isCollapsed && (
            <div className='flex items-center space-x-2'>
              <h1 className='text-lg font-semibold text-gray-900'>SignFast</h1>
            </div>
          )}
          {onToggleCollapse && (
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
                    isActive && 'text-sky-500 bg-blue-50'
                  )}
                  onClick={() => handleNavigation(item.path)}
                >
                  <Icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
                  {!isCollapsed && <span className='font-medium text-sm'>{item.label}</span>}
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
          <LogOut className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
          {!isCollapsed && <span className='font-medium text-sm'>Sign Out</span>}
        </Button>
      </div>
    </div>
  )
}
