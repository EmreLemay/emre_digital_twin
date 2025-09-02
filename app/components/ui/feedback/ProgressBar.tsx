import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number // 0-100
  showPercentage?: boolean
  color?: 'green' | 'blue' | 'red' | 'yellow'
  size?: 'sm' | 'md' | 'lg'
  label?: string
  animated?: boolean
  className?: string
}

export default function ProgressBar({
  progress,
  showPercentage = true,
  color = 'green',
  size = 'md',
  label,
  animated = true,
  className
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))

  const colors = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  }

  const sizes = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className={cn('font-medium text-gray-300', textSizes[size])}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={cn('text-gray-400', textSizes[size])}>
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      
      <div className={cn(
        'w-full bg-gray-700 rounded-full overflow-hidden',
        sizes[size]
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            colors[color],
            animated && 'transition-transform'
          )}
          style={{ width: `${clampedProgress}%` }}
        >
          {animated && (
            <div className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          )}
        </div>
      </div>
      
      {clampedProgress === 100 && (
        <div className="flex items-center mt-1">
          <span className="text-green-400 text-xs">✓ Complete</span>
        </div>
      )}
    </div>
  )
}