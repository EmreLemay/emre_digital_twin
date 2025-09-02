import { useState } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  title: string
  subtitle?: string
  collapsible?: boolean
  defaultExpanded?: boolean
  children: React.ReactNode
  className?: string
  headerActions?: React.ReactNode
}

export default function Panel({
  title,
  subtitle,
  collapsible = false,
  defaultExpanded = true,
  children,
  className,
  headerActions
}: PanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div className={cn('bg-gray-800 rounded-lg border border-gray-700 shadow-lg', className)}>
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b border-gray-700',
          collapsible && 'cursor-pointer hover:bg-gray-700 transition-colors'
        )}
        onClick={toggleExpanded}
      >
        <div className="flex items-center space-x-3">
          {collapsible && (
            <div className={cn('transition-transform duration-200', isExpanded ? 'rotate-90' : '')}>
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {headerActions && !collapsible && (
          <div onClick={(e) => e.stopPropagation()}>
            {headerActions}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  )
}