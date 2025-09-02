'use client'

import { forwardRef } from 'react'
import { cn } from '../../../../lib/utils'

interface ToggleProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'danger' | 'warning'
  className?: string
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(({
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
    sm: {
      switch: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4'
    },
    md: {
      switch: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5'
    },
    lg: {
      switch: 'w-14 h-8',
      thumb: 'w-7 h-7',
      translate: 'translate-x-6'
    }
  }

  const variantClasses = {
    default: checked ? 'bg-blue-600' : 'bg-gray-600',
    success: checked ? 'bg-green-600' : 'bg-gray-600', 
    danger: checked ? 'bg-red-600' : 'bg-gray-600',
    warning: checked ? 'bg-yellow-600' : 'bg-gray-600'
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && onChange) {
      onChange(e.target.checked)
    }
  }

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="relative">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            'relative inline-flex items-center rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out cursor-pointer',
            'focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
            sizeClasses[size].switch,
            variantClasses[variant]
          )}
          onClick={() => !disabled && onChange && onChange(!checked)}
        >
          <span
            className={cn(
              'inline-block bg-white rounded-full shadow-lg transform transition-transform duration-200 ease-in-out',
              sizeClasses[size].thumb,
              checked ? sizeClasses[size].translate : 'translate-x-0'
            )}
          />
        </div>
      </div>

      {(label || description) && (
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
      )}
    </div>
  )
})

Toggle.displayName = 'Toggle'

export default Toggle