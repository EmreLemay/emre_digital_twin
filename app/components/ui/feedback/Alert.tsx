import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info'
  message: string
  title?: string
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

export default function Alert({ 
  type = 'info',
  message,
  title,
  dismissible = false,
  onDismiss,
  className 
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  const variants = {
    success: {
      container: 'bg-green-900 border-green-700 text-green-100',
      icon: '✅',
      iconColor: 'text-green-400'
    },
    error: {
      container: 'bg-red-900 border-red-700 text-red-100',
      icon: '❌',
      iconColor: 'text-red-400'
    },
    warning: {
      container: 'bg-yellow-900 border-yellow-700 text-yellow-100',
      icon: '⚠️',
      iconColor: 'text-yellow-400'
    },
    info: {
      container: 'bg-blue-900 border-blue-700 text-blue-100',
      icon: 'ℹ️',
      iconColor: 'text-blue-400'
    }
  }

  const variant = variants[type]

  return (
    <div
      className={cn(
        'border rounded-lg p-4',
        variant.container,
        className
      )}
      role="alert"
    >
      <div className="flex items-start">
        <div className={cn('flex-shrink-0 mr-3', variant.iconColor)}>
          <span className="text-lg">{variant.icon}</span>
        </div>
        
        <div className="flex-1">
          {title && (
            <h4 className="font-semibold mb-1">
              {title}
            </h4>
          )}
          <p className="text-sm">
            {message}
          </p>
        </div>
        
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-3 text-gray-400 hover:text-white transition-colors"
            aria-label="Dismiss alert"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}