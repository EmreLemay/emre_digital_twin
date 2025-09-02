import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: string
  disabled?: boolean
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  children: React.ReactNode
  variant?: 'default' | 'pills' | 'green'
  responsive?: boolean
  className?: string
}

export default function Tabs({ 
  tabs,
  activeTab,
  onTabChange,
  children,
  variant = 'default',
  responsive = false,
  className 
}: TabsProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Tab Headers */}
      <div className={cn(
        'flex',
        variant === 'default' ? 'border-b border-gray-600' :
        variant === 'green' ? 'border-b border-gray-600' : 'space-x-1 p-1 bg-gray-800 rounded-lg'
      )}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          
          const buttonContent = (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                'flex items-center text-sm font-medium transition-colors',
                responsive ? 'px-2 py-2 sm:px-4' : 'px-4 py-2',
                variant === 'default' && [
                  'border-b-2 -mb-px',
                  isActive
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                ],
                variant === 'pills' && [
                  'rounded-md',
                  isActive
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                ],
                variant === 'green' && [
                  'border-b-2 -mb-px rounded-t',
                  isActive
                    ? 'bg-green-600 text-white border-green-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                ],
                tab.disabled && 'opacity-50 cursor-not-allowed hover:text-gray-400 hover:border-transparent hover:bg-transparent'
              )}
            >
              {tab.icon && (
                <span className={cn(
                  'text-base',
                  responsive ? 'mr-0 sm:mr-2' : 'mr-2'
                )}>
                  {tab.icon}
                </span>
              )}
              <span className={cn(
                responsive ? 'hidden sm:inline' : 'inline'
              )}>
                {tab.label}
              </span>
            </button>
          )

          // Wrap with tooltip for responsive mode
          if (responsive) {
            return (
              <div key={tab.id} className="group relative">
                {buttonContent}
                {/* Tooltip for small screens */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 sm:hidden">
                  {tab.label}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            )
          }

          return buttonContent
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {children}
      </div>
    </div>
  )
}