'use client'

import { forwardRef, useState } from 'react'
import { cn } from '../../../../lib/utils'

interface SearchInputProps {
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  onClear?: () => void
  placeholder?: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  showSearchButton?: boolean
  debounceMs?: number
  className?: string
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  value = '',
  onChange,
  onSearch,
  onClear,
  placeholder = 'Search...',
  label,
  size = 'md',
  loading = false,
  disabled = false,
  showSearchButton = false,
  className,
  ...props
}, ref) => {
  const [localValue, setLocalValue] = useState(value)

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-4 py-3 text-lg'
  }

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    if (onChange) {
      onChange(newValue)
    }
  }

  const handleSearch = () => {
    if (onSearch) {
      onSearch(localValue)
    }
  }

  const handleClear = () => {
    setLocalValue('')
    if (onChange) {
      onChange('')
    }
    if (onClear) {
      onClear()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
    if (e.key === 'Escape') {
      handleClear()
    }
  }

  const LoadingSpinner = () => (
    <svg className={cn('animate-spin', iconSizeClasses[size])} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )

  const SearchIcon = () => (
    <svg className={iconSizeClasses[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )

  const ClearIcon = () => (
    <svg className={iconSizeClasses[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-200">
          {label}
        </label>
      )}
      
      <div className="relative flex items-center">
        {/* Search Icon */}
        <div className={cn(
          'absolute left-3 text-gray-400',
          loading ? 'text-blue-400' : ''
        )}>
          {loading ? <LoadingSpinner /> : <SearchIcon />}
        </div>

        {/* Input Field */}
        <input
          ref={ref}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || loading}
          className={cn(
            'w-full bg-gray-700 text-white border border-gray-600 rounded-md',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hover:border-gray-500 transition-colors',
            'pl-10', // Space for search icon
            showSearchButton ? 'pr-20' : localValue ? 'pr-10' : 'pr-4', // Space for buttons
            sizeClasses[size]
          )}
          {...props}
        />

        {/* Clear Button */}
        {localValue && !showSearchButton && (
          <button
            onClick={handleClear}
            disabled={disabled || loading}
            className="absolute right-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Clear search"
          >
            <ClearIcon />
          </button>
        )}

        {/* Search Button */}
        {showSearchButton && (
          <div className="absolute right-2 flex items-center gap-1">
            {localValue && (
              <button
                onClick={handleClear}
                disabled={disabled || loading}
                className="p-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50 rounded"
                aria-label="Clear search"
              >
                <ClearIcon />
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={disabled || loading || !localValue}
              className={cn(
                'px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
              )}
              aria-label="Search"
            >
              Search
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

SearchInput.displayName = 'SearchInput'

export default SearchInput