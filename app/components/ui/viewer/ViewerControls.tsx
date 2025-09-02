import { cn } from '@/lib/utils'
import Button from '../form/Button'
import Tooltip from '../feedback/Tooltip'

interface ViewerControlsProps {
  onReset?: () => void
  onToggleWireframe?: () => void
  onToggleAxes?: () => void
  onToggleGrid?: () => void
  onZoomToFit?: () => void
  loading?: boolean
  disabled?: boolean
  wireframeActive?: boolean
  axesActive?: boolean
  gridActive?: boolean
  className?: string
}

export default function ViewerControls({
  onReset,
  onToggleWireframe,
  onToggleAxes,
  onToggleGrid,
  onZoomToFit,
  loading = false,
  disabled = false,
  wireframeActive = false,
  axesActive = false,
  gridActive = false,
  className
}: ViewerControlsProps) {
  return (
    <div className={cn(
      'flex items-center space-x-2 p-3 bg-gray-800 rounded-lg border border-gray-700',
      className
    )}>
      {onReset && (
        <Tooltip content="Reset camera to default position">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={disabled || loading}
          >
            🔄 Reset
          </Button>
        </Tooltip>
      )}

      {onZoomToFit && (
        <Tooltip content="Zoom to fit all objects">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomToFit}
            disabled={disabled || loading}
          >
            🎯 Fit
          </Button>
        </Tooltip>
      )}

      {onToggleWireframe && (
        <Tooltip content="Toggle wireframe view">
          <Button
            variant={wireframeActive ? "primary" : "ghost"}
            size="sm"
            onClick={onToggleWireframe}
            disabled={disabled || loading}
          >
            🔲 Wire
          </Button>
        </Tooltip>
      )}

      {onToggleAxes && (
        <Tooltip content="Toggle coordinate axes">
          <Button
            variant={axesActive ? "primary" : "ghost"}
            size="sm"
            onClick={onToggleAxes}
            disabled={disabled || loading}
          >
            📐 Axes
          </Button>
        </Tooltip>
      )}

      {onToggleGrid && (
        <Tooltip content="Toggle floor grid">
          <Button
            variant={gridActive ? "primary" : "ghost"}
            size="sm"
            onClick={onToggleGrid}
            disabled={disabled || loading}
          >
            ⚏ Grid
          </Button>
        </Tooltip>
      )}

      {loading && (
        <div className="flex items-center space-x-2 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-gray-500 border-t-green-500 rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      )}
    </div>
  )
}