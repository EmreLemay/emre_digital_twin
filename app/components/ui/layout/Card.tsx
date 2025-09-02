import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  children: React.ReactNode
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ title, subtitle, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-gray-800 rounded-lg border border-gray-700 shadow-lg',
          className
        )}
        {...props}
      >
        {(title || subtitle) && (
          <div className="px-6 py-4 border-b border-gray-700">
            {title && (
              <h3 className="text-lg font-semibold text-white">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card