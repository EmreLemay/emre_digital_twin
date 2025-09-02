'use client'

import { forwardRef, ReactNode } from 'react'
import { cn } from '../../../../lib/utils'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
  tooltip?: string
  className?: string
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  children,
  variant = 'default',
  size = 'md',
  loading = false,
  disabled,
  tooltip,
  className,
  ...props
}, ref) => {
  const variantClasses = {
    default: 'bg-gray-600 hover:bg-gray-700 text-white border-gray-500',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-500',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-300 hover:text-white border-transparent',
    success: 'bg-green-600 hover:bg-green-700 text-white border-green-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500'
  }

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm', 
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  }

  const LoadingSpinner = () => (
    <svg className={cn(
      'animate-spin',
      size === 'xs' ? 'w-3 h-3' :
      size === 'sm' ? 'w-4 h-4' :
      size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
    )} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )

  const button = (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center border rounded-md',
        'font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-95',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? <LoadingSpinner /> : children}
    </button>
  )

  if (tooltip) {
    return (
      <div className="group relative">
        {button}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    )
  }

  return button
})

IconButton.displayName = 'IconButton'

export default IconButton