import { cn } from '@/lib/utils'
import Button from '../form/Button'
import Tooltip from '../feedback/Tooltip'

interface Tool {
  id: string
  icon: string
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

interface ViewerToolbarProps {
  tools: Tool[]
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export default function ViewerToolbar({ 
  tools, 
  orientation = 'horizontal',
  className 
}: ViewerToolbarProps) {
  return (
    <div className={cn(
      'flex bg-gray-800 rounded-lg border border-gray-700 p-2',
      orientation === 'horizontal' ? 'flex-row space-x-1' : 'flex-col space-y-1',
      className
    )}>
      {tools.map((tool) => (
        <Tooltip key={tool.id} content={tool.label}>
          <Button
            variant={tool.active ? "primary" : "ghost"}
            size="sm"
            onClick={tool.onClick}
            disabled={tool.disabled}
            className="flex items-center justify-center min-w-[2.5rem] min-h-[2.5rem]"
          >
            <span className="text-lg">{tool.icon}</span>
          </Button>
        </Tooltip>
      ))}
    </div>
  )
}