'use client'

import { forwardRef } from 'react'
import { cn } from '../../../../lib/utils'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  helperText?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  options,
  value,
  onChange,
  placeholder,
  label,
  error,
  helperText,
  disabled = false,
  size = 'md',
  className,
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg'
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!disabled && onChange) {
      onChange(e.target.value)
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-200">
          {label}
        </label>
      )}
      
      <select
        ref={ref}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'bg-gray-700 text-white border border-gray-600 rounded-md',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'hover:border-gray-500 transition-colors',
          sizeClasses[size],
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="bg-gray-700 text-white"
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <span className="text-sm text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </span>
      )}

      {helperText && !error && (
        <span className="text-sm text-gray-400">
          {helperText}
        </span>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select