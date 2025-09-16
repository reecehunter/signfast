import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the base URL for the application, with fallback handling
 * This ensures URLs are constructed correctly in all environments
 */
export function getBaseUrl(): string {
  console.log('🔍 DEBUG getBaseUrl():')
  console.log('  - NODE_ENV:', process.env.NODE_ENV)
  console.log('  - NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
  console.log('  - NEXTAUTH_URL type:', typeof process.env.NEXTAUTH_URL)
  console.log('  - NEXTAUTH_URL length:', process.env.NEXTAUTH_URL?.length)

  // Check if NEXTAUTH_URL is set and valid
  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL !== 'undefined') {
    console.log('  - Using NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
    return process.env.NEXTAUTH_URL
  }

  // Fallback for development
  if (process.env.NODE_ENV === 'development') {
    console.log('  - Using development fallback: http://localhost:3000')
    return 'http://localhost:3000'
  }

  // For production, try to construct from request headers if available
  // This is a fallback that should not be relied upon
  console.warn('⚠️ NEXTAUTH_URL is not set in production environment')
  console.warn('⚠️ Please set NEXTAUTH_URL environment variable to your production domain')
  console.log('  - Using production fallback: https://your-domain.com')

  // Return a placeholder that will help identify the issue
  return 'https://your-domain.com'
}

/**
 * Construct a full URL for the application
 */
export function constructAppUrl(path: string): string {
  const baseUrl = getBaseUrl()
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}
