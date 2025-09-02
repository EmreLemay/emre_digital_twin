'use client'

import { forwardRef } from 'react'
import { cn } from '../../../../lib/utils'

interface CheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'danger'
  className?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  checked = false,
  onChange,
  disabled = false,
  label,
  description,
  size = 'md',
  variant = 'default',
  className,
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  }

  const variantClasses = {
    default: 'text-blue-600 focus:ring-blue-500 border-gray-500',
    success: 'text-green-600 focus:ring-green-500 border-gray-500',
    danger: 'text-red-600 focus:ring-red-500 border-gray-500'
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && onChange) {
      onChange(e.target.checked)
    }
  }

  if (label || description) {
    return (
      <div className={cn('flex items-start gap-2', className)}>
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'bg-gray-600 border rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
            'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
            sizeClasses[size],
            variantClasses[variant]
          )}
          {...props}
        />
        <div className="flex flex-col">
          {label && (
            <label className={cn(
              'font-medium text-white cursor-pointer',
              disabled && 'opacity-50 cursor-not-allowed',
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
            )}>
              {label}
            </label>
          )}
          {description && (
            <span className={cn(
              'text-gray-400 mt-1',
              size === 'sm' ? 'text-xs' : 'text-sm'
            )}>
              {description}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
      className={cn(
        'bg-gray-600 border rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
        'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
})

Checkbox.displayName = 'Checkbox'

export default Checkbox