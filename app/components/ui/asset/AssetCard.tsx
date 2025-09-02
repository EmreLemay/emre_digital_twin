import { useState } from 'react'
import { cn } from '@/lib/utils'
import Button from '../form/Button'
import Tooltip from '../feedback/Tooltip'

interface Asset {
  id: string
  name: string
  type: 'glb' | 'panorama' | 'texture' | 'material'
  size: string
  thumbnail?: string
  lastModified?: Date
  description?: string
  guid?: string
}

interface AssetCardProps {
  asset: Asset
  selected?: boolean
  loading?: boolean
  onClick?: () => void
  onDelete?: () => void
  onRename?: (newName: string) => void
  onDownload?: () => void
  showActions?: boolean
  className?: string
}

export default function AssetCard({
  asset,
  selected = false,
  loading = false,
  onClick,
  onDelete,
  onRename,
  onDownload,
  showActions = true,
  className
}: AssetCardProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(asset.name)

  const handleRename = () => {
    if (newName.trim() && newName !== asset.name) {
      onRename?.(newName.trim())
    }
    setIsRenaming(false)
  }

  const getTypeIcon = () => {
    switch (asset.type) {
      case 'glb': return '🎯'
      case 'panorama': return '🌐'
      case 'texture': return '🖼️'
      case 'material': return '🎨'
      default: return '📄'
    }
  }

  const getTypeColor = () => {
    switch (asset.type) {
      case 'glb': return 'bg-green-600'
      case 'panorama': return 'bg-blue-600'
      case 'texture': return 'bg-purple-600'
      case 'material': return 'bg-orange-600'
      default: return 'bg-gray-600'
    }
  }

  return (
    <div
      className={cn(
        'bg-gray-800 rounded-lg border-2 transition-all duration-200 cursor-pointer group',
        selected 
          ? 'border-green-500 bg-gray-700' 
          : 'border-gray-700 hover:border-gray-600 hover:bg-gray-750',
        loading && 'opacity-50 pointer-events-none',
        className
      )}
      onClick={onClick}
    >
      {/* Thumbnail/Preview */}
      <div className="relative aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
        {asset.thumbnail ? (
          <img 
            src={asset.thumbnail} 
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-50">{getTypeIcon()}</span>
          </div>
        )}
        
        {/* Type badge */}
        <div className={cn(
          'absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium text-white',
          getTypeColor()
        )}>
          {asset.type.toUpperCase()}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name */}
        <div className="mb-2">
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setIsRenaming(false)
              }}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
              autoFocus
            />
          ) : (
            <h3 className="font-medium text-white text-sm truncate" title={asset.name}>
              {asset.name}
            </h3>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-1 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Size:</span>
            <span>{asset.size}</span>
          </div>
          {asset.lastModified && (
            <div className="flex justify-between">
              <span>Modified:</span>
              <span>{asset.lastModified.toLocaleDateString()}</span>
            </div>
          )}
          {asset.guid && (
            <div className="flex justify-between">
              <span>GUID:</span>
              <Tooltip content={asset.guid}>
                <span className="truncate max-w-16">{asset.guid}</span>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Description */}
        {asset.description && (
          <p className="mt-2 text-xs text-gray-500 line-clamp-2">
            {asset.description}
          </p>
        )}

        {/* Actions */}
        {showActions && (
          <div className="mt-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              {onRename && (
                <Tooltip content="Rename asset">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsRenaming(true)
                    }}
                    className="p-1 h-6 w-6"
                  >
                    ✏️
                  </Button>
                </Tooltip>
              )}
              
              {onDownload && (
                <Tooltip content="Download asset">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownload()
                    }}
                    className="p-1 h-6 w-6"
                  >
                    ⬇️
                  </Button>
                </Tooltip>
              )}
            </div>

            {onDelete && (
              <Tooltip content="Delete asset">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="p-1 h-6 w-6"
                >
                  🗑️
                </Button>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  )
}