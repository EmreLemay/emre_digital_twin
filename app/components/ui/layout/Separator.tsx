'use client'

import { forwardRef } from 'react'
import { cn } from '../../../../lib/utils'

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  variant?: 'default' | 'dashed' | 'dotted'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const Separator = forwardRef<HTMLDivElement, SeparatorProps>(({
  orientation = 'horizontal',
  variant = 'default',
  size = 'md',
  className,
  ...props
}, ref) => {
  const orientationClasses = {
    horizontal: 'w-full h-px',
    vertical: 'h-full w-px'
  }

  const variantClasses = {
    default: 'bg-gray-600',
    dashed: 'border-gray-600 border-dashed',
    dotted: 'border-gray-600 border-dotted'
  }

  const sizeClasses = {
    sm: orientation === 'horizontal' ? 'my-2' : 'mx-2',
    md: orientation === 'horizontal' ? 'my-4' : 'mx-4', 
    lg: orientation === 'horizontal' ? 'my-6' : 'mx-6'
  }

  if (variant === 'dashed' || variant === 'dotted') {
    return (
      <div
        ref={ref}
        className={cn(
          orientation === 'horizontal' ? 'w-full border-t' : 'h-full border-l',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }

  return (
    <div
      ref={ref}
      className={cn(
        orientationClasses[orientation],
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
})

Separator.displayName = 'Separator'

export default Separator