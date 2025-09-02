'use client'

import { forwardRef, ReactNode } from 'react'
import { cn } from '../../../../lib/utils'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'yellow' | 'gray'
  size?: 'sm' | 'md' | 'lg'
  removable?: boolean
  onRemove?: () => void
  className?: string
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({
  children,
  variant = 'default',
  size = 'md',
  removable = false,
  onRemove,
  className,
  ...props
}, ref) => {
  const variantClasses = {
    default: 'bg-blue-600 text-white',
    success: 'bg-green-600 text-white',
    danger: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-black',
    info: 'bg-cyan-600 text-white',
    purple: 'bg-purple-600 text-white',
    yellow: 'bg-yellow-500 text-black',
    gray: 'bg-gray-600 text-white'
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onRemove) {
      onRemove()
    }
  }

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        'transition-colors duration-200',
        variantClasses[variant],
        sizeClasses[size],
        removable && 'pr-1',
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {removable && (
        <button
          onClick={handleRemove}
          className={cn(
            'ml-1 inline-flex items-center justify-center rounded-full',
            'hover:bg-black/20 transition-colors',
            size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
          )}
          aria-label="Remove"
        >
          <svg
            className={cn(
              'fill-current',
              size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-2.5 h-2.5'
            )}
            viewBox="0 0 20 20"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      )}
    </span>
  )
})

Badge.displayName = 'Badge'

export default Badge