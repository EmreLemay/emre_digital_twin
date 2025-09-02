import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string | React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export default function Tooltip({
  content,
  position = 'top',
  delay = 500,
  children,
  disabled = false,
  className
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const showTooltip = () => {
    if (disabled) return

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop

        let x = 0
        let y = 0

        switch (position) {
          case 'top':
            x = rect.left + scrollLeft + rect.width / 2
            y = rect.top + scrollTop - 8
            break
          case 'bottom':
            x = rect.left + scrollLeft + rect.width / 2
            y = rect.bottom + scrollTop + 8
            break
          case 'left':
            x = rect.left + scrollLeft - 8
            y = rect.top + scrollTop + rect.height / 2
            break
          case 'right':
            x = rect.right + scrollLeft + 8
            y = rect.top + scrollTop + rect.height / 2
            break
        }

        setCoords({ x, y })
        setIsVisible(true)
      }
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const getTooltipStyles = () => {
    const baseStyles = 'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg border border-gray-600 max-w-xs pointer-events-none'
    
    let positionStyles = ''
    let transform = ''

    switch (position) {
      case 'top':
        positionStyles = 'mb-2'
        transform = 'translate(-50%, -100%)'
        break
      case 'bottom':
        positionStyles = 'mt-2'
        transform = 'translate(-50%, 0)'
        break
      case 'left':
        positionStyles = 'mr-2'
        transform = 'translate(-100%, -50%)'
        break
      case 'right':
        positionStyles = 'ml-2'
        transform = 'translate(0, -50%)'
        break
    }

    return {
      className: cn(baseStyles, positionStyles),
      style: {
        left: coords.x,
        top: coords.y,
        transform
      }
    }
  }

  const getArrowStyles = () => {
    const arrowSize = 4
    const arrowStyles: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid'
    }

    switch (position) {
      case 'top':
        return {
          ...arrowStyles,
          top: '100%',
          left: '50%',
          marginLeft: -arrowSize,
          borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
          borderColor: '#374151 transparent transparent transparent'
        }
      case 'bottom':
        return {
          ...arrowStyles,
          bottom: '100%',
          left: '50%',
          marginLeft: -arrowSize,
          borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
          borderColor: 'transparent transparent #374151 transparent'
        }
      case 'left':
        return {
          ...arrowStyles,
          left: '100%',
          top: '50%',
          marginTop: -arrowSize,
          borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
          borderColor: 'transparent transparent transparent #374151'
        }
      case 'right':
        return {
          ...arrowStyles,
          right: '100%',
          top: '50%',
          marginTop: -arrowSize,
          borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
          borderColor: 'transparent #374151 transparent transparent'
        }
    }
  }

  const tooltipStyles = getTooltipStyles()

  const tooltip = isVisible && (
    <div {...tooltipStyles}>
      <div style={getArrowStyles()} />
      {content}
    </div>
  )

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={cn('inline-block', className)}
      >
        {children}
      </div>
      {tooltip && createPortal(tooltip, document.body)}
    </>
  )
}