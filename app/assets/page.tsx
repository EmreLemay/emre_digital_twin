'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import MenuBar from '../components/MenuBar'
import ThreeViewer from '../components/ThreeViewer'
import PanoramaViewer from '../components/PanoramaViewer'
import { Checkbox, Tabs, IconButton, Input, Badge, Button, Alert, LoadingSpinner } from '../components/ui'

interface AssetFile {
  name: string
  type: 'glb' | 'panorama'
  size: number
  lastModified: string
  publicPath: string
}

interface AssetMetadata {
  id: number
  description: string | null
  tags: Array<{ id: number; name: string; color: string | null }>
}

interface AssetData {
  success: boolean
  asset?: {
    id: number
    guid: string
    name: string
    category: string
    filePath: string
    createdAt: string
    updatedAt: string
    metadata: Array<{
      id: number
      parameterName: string
      parameterValue: string
      parameterType: string
    }>
  }
  error?: string
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'glb' | 'panorama'>('all')
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [deleting, setDeleting] = useState<string[]>([])
  
  // Inline editing state
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editingNameValue, setEditingNameValue] = useState('')
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [originalNameValue, setOriginalNameValue] = useState('')
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [assetMetadata, setAssetMetadata] = useState<{[key: string]: AssetMetadata}>({})
  const [assetData, setAssetData] = useState<{[key: string]: AssetData}>({})
  const [editingParameters, setEditingParameters] = useState<{[key: string]: string}>({})
  const [editingDescriptions, setEditingDescriptions] = useState<{[key: string]: string}>({})
  const [editingTags, setEditingTags] = useState<{[key: string]: string[]}>({})
  const [newTags, setNewTags] = useState<{[key: string]: string}>({})
  
  // GLB Preview state
  const [selectedAssetForPreview, setSelectedAssetForPreview] = useState<AssetFile | null>(null)

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/assets/list')
      const result = await response.json()

      if (result.success) {
        setAssets(result.assets)
      } else {
        setError(result.error || 'Failed to load assets')
      }
    } catch (err) {
      setError('Failed to fetch assets')
      console.error('Error fetching assets:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredAssets = assets.filter(asset => {
    if (filter === 'all') return true
    return asset.type === filter
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Define filter tabs
  const filterTabs = [
    { id: 'all', label: `All Assets (${assets.length})`, icon: '📁' },
    { id: 'glb', label: `3D Models (${assets.filter(a => a.type === 'glb').length})`, icon: '🎲' },
    { id: 'panorama', label: `Panoramas (${assets.filter(a => a.type === 'panorama').length})`, icon: '🖼️' }
  ]

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  }

  const toggleActionMenu = (assetPath: string) => {
    setOpenActionMenu(openActionMenu === assetPath ? null : assetPath)
  }

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null)
    if (openActionMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openActionMenu])

  const handleDeleteSingle = async (assetPath: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    setDeleting(prev => [...prev, assetPath])

    try {
      const response = await fetch(`/api/assets/delete?path=${encodeURIComponent(assetPath)}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setAssets(prev => prev.filter(asset => asset.publicPath !== assetPath))
      } else {
        alert(`Failed to delete file: ${result.error}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete file')
    } finally {
      setDeleting(prev => prev.filter(path => path !== assetPath))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedAssets.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedAssets.length} files?`)) return

    setDeleting(prev => [...prev, ...selectedAssets])

    try {
      const response = await fetch('/api/assets/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePaths: selectedAssets })
      })

      const result = await response.json()

      if (result.success || result.successCount > 0) {
        const successfulDeletes = result.results
          .filter((r: any) => r.success)
          .map((r: any) => r.path)

        setAssets(prev => prev.filter(asset => !successfulDeletes.includes(asset.publicPath)))
        setSelectedAssets([])

        if (result.errorCount > 0) {
          alert(`Deleted ${result.successCount} files. ${result.errorCount} files failed to delete.`)
        }
      } else {
        alert(`Failed to delete files: ${result.error}`)
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      alert('Failed to delete files')
    } finally {
      setDeleting(prev => prev.filter(path => !selectedAssets.includes(path)))
    }
  }

  const toggleAssetSelection = (assetPath: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetPath)
        ? prev.filter(path => path !== assetPath)
        : [...prev, assetPath]
    )
  }

  const selectAll = () => {
    setSelectedAssets(filteredAssets.map(asset => asset.publicPath))
  }

  const clearSelection = () => {
    setSelectedAssets([])
  }

  // GLB Preview functions
  const selectAssetForPreview = (asset: AssetFile) => {
    setSelectedAssetForPreview(asset)
  }

  // Row expansion and metadata loading
  const toggleRow = async (assetPath: string) => {
    if (expandedRows.includes(assetPath)) {
      setExpandedRows(expandedRows.filter(path => path !== assetPath))
    } else {
      setExpandedRows([...expandedRows, assetPath])
      
      // Load file metadata if not already loaded
      if (!assetMetadata[assetPath]) {
        try {
          const response = await fetch(`/api/assets/metadata?filepath=${encodeURIComponent(assetPath)}`)
          const result = await response.json()
          
          if (result.success) {
            setAssetMetadata(prev => ({...prev, [assetPath]: result.metadata}))
            setEditingDescriptions(prev => ({...prev, [assetPath]: result.metadata.description || ''}))
            setEditingTags(prev => ({...prev, [assetPath]: result.metadata.tags.map((tag: any) => tag.name)}))
          }
        } catch (error) {
          console.error('Error loading file metadata:', error)
        }
      }

      // Load real asset data for GLB and panorama files
      if ((assetPath.includes('.glb') || assetPath.includes('.jpg')) && !assetData[assetPath]) {
        try {
          let guid = ''
          if (assetPath.includes('.glb')) {
            // For GLB files: use full filename as GUID (remove .glb extension)
            guid = assetPath.split('/').pop()?.replace('.glb', '') || ''
          } else if (assetPath.includes('.jpg')) {
            // For panoramas: extract GUID from [guid]_360.jpg format
            const filename = assetPath.split('/').pop() || ''
            guid = filename.replace('_360.jpg', '').toLowerCase()
          }
          
          if (guid) {
            const response = await fetch(`/api/assets/${encodeURIComponent(guid)}`)
            const result = await response.json()
            setAssetData(prev => ({...prev, [assetPath]: result}))
          } else {
            setAssetData(prev => ({...prev, [assetPath]: { success: false, error: 'Could not extract GUID from filename' }}))
          }
        } catch (error) {
          console.error('Error loading asset data:', error)
          setAssetData(prev => ({...prev, [assetPath]: { success: false, error: 'Failed to load asset data' }}))
        }
      }
    }
  }

  const saveMetadata = async (assetPath: string) => {
    try {
      const response = await fetch('/api/assets/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filepath: assetPath,
          description: editingDescriptions[assetPath] || '',
          tags: editingTags[assetPath] || []
        })
      })

      const result = await response.json()
      if (result.success) {
        setAssetMetadata(prev => ({...prev, [assetPath]: result.metadata}))
      } else {
        alert(`Failed to save metadata: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving metadata:', error)
      alert('Failed to save metadata')
    }
  }

  const startNameEdit = (assetPath: string, currentName: string) => {
    setEditingName(assetPath)
    const nameWithoutExt = currentName.replace(/\.[^/.]+$/, "")
    setEditingNameValue(nameWithoutExt)
    // Store the original name for comparison
    setOriginalNameValue(nameWithoutExt)
  }

  const cancelNameEdit = () => {
    setEditingName(null)
    setEditingNameValue('')
    setOriginalNameValue('')
  }

  const handleNameSave = async (assetPath: string, force: boolean = false) => {
    const trimmedValue = editingNameValue.trim()
    
    // If empty or same as original, just cancel
    if (!trimmedValue || trimmedValue === originalNameValue) {
      cancelNameEdit()
      return
    }

    try {
      const response = await fetch('/api/assets/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          oldPath: assetPath, 
          newName: trimmedValue 
        })
      })

      const result = await response.json()

      if (result.success) {
        setAssets(prev => prev.map(asset => 
          asset.publicPath === assetPath 
            ? { ...asset, name: result.newName, publicPath: result.newPath }
            : asset
        ))
        cancelNameEdit()
      } else {
        // Show error but don't exit edit mode so user can fix it
        if (force) {
          // If forced (on blur), just cancel to avoid infinite alerts
          cancelNameEdit()
        } else {
          // On enter key, show error and keep editing
          alert(`Failed to rename file: ${result.error}. Please fix the filename.`)
        }
      }
    } catch (error) {
      console.error('Rename error:', error)
      if (force) {
        // If forced (on blur), just cancel to avoid infinite alerts
        cancelNameEdit()
      } else {
        alert('Failed to rename file. Please check the filename and try again.')
      }
    }
  }

  const handleNameKeyPress = (e: React.KeyboardEvent, assetPath: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleNameSave(assetPath, false) // Don't force, show errors
    } else if (e.key === 'Escape') {
      cancelNameEdit()
    }
  }

  const addTag = async (assetPath: string) => {
    const newTag = newTags[assetPath]?.trim()
    const currentTags = editingTags[assetPath] || []
    
    if (newTag && !currentTags.includes(newTag)) {
      const updatedTags = [...currentTags, newTag]
      setEditingTags(prev => ({...prev, [assetPath]: updatedTags}))
      setNewTags(prev => ({...prev, [assetPath]: ''}))
      
      // Auto-save
      await saveMetadata(assetPath)
    }
  }

  const removeTag = async (assetPath: string, tagToRemove: string) => {
    const currentTags = editingTags[assetPath] || []
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove)
    setEditingTags(prev => ({...prev, [assetPath]: updatedTags}))
    
    // Auto-save
    await saveMetadata(assetPath)
  }

  const handleTagKeyPress = (e: React.KeyboardEvent, assetPath: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(assetPath)
    }
  }

  // Parameter editing functions
  const startParameterEdit = (parameterId: number, currentValue: string) => {
    const key = parameterId.toString()
    setEditingParameters(prev => ({...prev, [key]: currentValue}))
  }

  const saveParameter = async (assetPath: string, parameterId: number) => {
    const key = parameterId.toString()
    const newValue = editingParameters[key]
    
    if (newValue === undefined) return

    try {
      let guid = ''
      if (assetPath.includes('.glb')) {
        guid = assetPath.split('/').pop()?.replace('.glb', '') || ''
      } else if (assetPath.includes('.jpg')) {
        // For panoramas: extract GUID from [guid]_360.jpg format
        const filename = assetPath.split('/').pop() || ''
        guid = filename.replace('_360.jpg', '').toLowerCase()
      }
      
      const response = await fetch(`/api/assets/${encodeURIComponent(guid)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parameterId,
          parameterValue: newValue
        })
      })

      const result = await response.json()
      if (result.success) {
        // Update the local asset data
        setAssetData(prev => {
          const updated = {...prev}
          if (updated[assetPath]?.asset?.metadata) {
            updated[assetPath].asset.metadata = updated[assetPath].asset.metadata.map(param => 
              param.id === parameterId ? {...param, parameterValue: newValue} : param
            )
          }
          return updated
        })
        // Clear editing state
        setEditingParameters(prev => {
          const updated = {...prev}
          delete updated[key]
          return updated
        })
      } else {
        alert(`Failed to save parameter: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving parameter:', error)
      alert('Failed to save parameter')
    }
  }

  const handleParameterKeyPress = (e: React.KeyboardEvent, assetPath: string, parameterId: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveParameter(assetPath, parameterId)
    } else if (e.key === 'Escape') {
      const key = parameterId.toString()
      setEditingParameters(prev => {
        const updated = {...prev}
        delete updated[key]
        return updated
      })
    }
  }

  const formatParameterValue = (value: string, type: string): string => {
    switch (type.toUpperCase()) {
      case 'AREA':
        return `${value} m²`
      case 'VOLUME':
        return `${value} m³`
      case 'LENGTH':
        return `${value} m`
      case 'ANGLE':
        return `${value}°`
      case 'NUMBER':
        const num = parseFloat(value)
        return isNaN(num) ? value : num.toLocaleString()
      case 'BOOLEAN':
        return value.toLowerCase() === 'true' ? 'Yes' : 'No'
      case 'DATE':
        try {
          return new Date(value).toLocaleDateString()
        } catch {
          return value
        }
      default:
        return value
    }
  }

  const getParameterIcon = (type: string): string => {
    switch (type.toUpperCase()) {
      case 'AREA': return '📐'
      case 'VOLUME': return '📦'
      case 'LENGTH': return '📏'
      case 'ANGLE': return '🔄'
      case 'NUMBER': return '🔢'
      case 'BOOLEAN': return '✓'
      case 'DATE': return '📅'
      default: return '📝'
    }
  }

  return (
    <>
      <MenuBar />
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Asset Database</h1>
          <p className="text-gray-300">Manage your 3D models and panoramic images</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-between items-end mb-6">
          <div className="flex-1">
            <Tabs
              tabs={filterTabs}
              activeTab={filter}
              onTabChange={(tabId: string) => setFilter(tabId as "all" | "glb" | "panorama")}
              variant="green"
            >
              {/* Tab content is handled by the filteredAssets logic below */}
            </Tabs>
          </div>

          {/* Bulk Actions */}
          {filteredAssets.length > 0 && (
            <div className="flex items-center gap-3 pb-3">
              {selectedAssets.length > 0 ? (
                <>
                  <span className="text-sm text-gray-400">
                    {selectedAssets.length} selected
                  </span>
                  <Button
                    onClick={handleBulkDelete}
                    disabled={deleting.length > 0}
                    variant="danger"
                    size="sm"
                  >
                    Delete Selected
                  </Button>
                  <Button
                    onClick={clearSelection}
                    variant="ghost"
                    size="sm"
                  >
                    Clear
                  </Button>
                </>
              ) : (
                <Button
                  onClick={selectAll}
                  variant="ghost"
                  size="sm"
                >
                  Select All
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
            <span className="ml-4 text-lg">Loading assets...</span>
          </div>
        ) : error ? (
          <Alert
            type="error"
            title="Error Loading Assets"
            message={error}
          />
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-medium mb-2">No Assets Found</h3>
            <p>Upload some files from the main viewer to see them here.</p>
          </div>
        ) : (
          /* Split View Layout - Asset List (75%) + GLB Preview (25%) */
          <div className="flex gap-6">
            {/* Left Panel - Asset List (75%) */}
            <div className="w-3/4">
              {/* Database-style List View */}
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Table Header */}
                    <div className="grid gap-4 p-4 bg-gray-700 border-b border-gray-600 text-sm font-medium text-gray-300" style={{gridTemplateColumns: 'auto auto 1fr auto auto 1fr 50px'}}>
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={selectedAssets.length === filteredAssets.length && filteredAssets.length > 0}
                          onChange={(checked) => {
                            if (checked) {
                              selectAll()
                            } else {
                              clearSelection()
                            }
                          }}
                        />
                      </div>
                      <div>Type</div>
                      <div>Name</div>
                      <div>Size</div>
                      <div>Modified</div>
                      <div>Description</div>
                      <div>Actions</div>
                    </div>

            {/* Table Rows */}
            {filteredAssets.map((asset, index) => {
              const isSelected = selectedAssets.includes(asset.publicPath)
              const isDeleting = deleting.includes(asset.publicPath)
              const isExpanded = expandedRows.includes(asset.publicPath)
              const isSelectedForPreview = selectedAssetForPreview?.publicPath === asset.publicPath
              const metadata = assetMetadata[asset.publicPath]
              
              return (
                <div key={index}>
                  {/* Main Row */}
                  <div 
                    className={`grid gap-4 p-4 border-b border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer ${
                      isSelected ? 'bg-green-900/20' : ''
                    } ${isSelectedForPreview ? 'bg-blue-900/30 border-blue-600' : ''} ${isDeleting ? 'opacity-50' : ''}`}
                    style={{gridTemplateColumns: 'auto auto 1fr auto auto 1fr 50px'}}
                    onClick={() => selectAssetForPreview(asset)}
                  >
                    
                    {/* Checkbox */}
                    <div className="flex items-center justify-center">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleAssetSelection(asset.publicPath)}
                          disabled={isDeleting}
                        />
                      </div>
                    </div>

                    {/* Type */}
                    <div className="flex items-center">
                      <div className="relative">
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-lg ${
                          asset.type === 'glb' ? 'bg-blue-600' : 'bg-green-600'
                        }`}>
                          {asset.type === 'glb' ? '🎲' : '🖼️'}
                        </div>
                        {/* BIM Data Indicator */}
                        {assetData[asset.publicPath]?.success && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-yellow-900">🏗️</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name */}
                    <div className="flex items-center min-w-0">
                      {editingName === asset.publicPath ? (
                        <div className="w-full">
                          <Input
                            value={editingNameValue}
                            onChange={setEditingNameValue}
                            onKeyDown={(e) => handleNameKeyPress(e, asset.publicPath)}
                            onBlur={() => handleNameSave(asset.publicPath, true)}
                            placeholder="Enter new name..."
                            className="font-medium"
                          />
                        </div>
                      ) : (
                        <span 
                          className="font-medium text-white truncate cursor-pointer hover:text-green-400 transition-colors" 
                          title={`${asset.name} (click to rename)`}
                          onClick={(e) => {
                            e.stopPropagation()
                            startNameEdit(asset.publicPath, asset.name)
                          }}
                        >
                          {asset.name}
                        </span>
                      )}
                    </div>

                    {/* Size */}
                    <div className="flex items-center text-gray-400 text-sm whitespace-nowrap">
                      {formatFileSize(asset.size)}
                    </div>

                    {/* Modified */}
                    <div className="flex items-center text-gray-400 text-sm whitespace-nowrap">
                      {formatDate(asset.lastModified)}
                    </div>

                    {/* Description */}
                    <div className="flex items-center min-w-0">
                      <Input
                        value={editingDescriptions[asset.publicPath] || ''}
                        onChange={(value) => setEditingDescriptions(prev => ({...prev, [asset.publicPath]: value}))}
                        onBlur={() => saveMetadata(asset.publicPath)}
                        size="sm"
                        placeholder="Add description..."
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 justify-end">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleRow(asset.publicPath)
                        }}
                        variant="primary"
                        size="xs"
                        tooltip="Toggle metadata"
                      >
                        {isExpanded ? '▲' : '▼'}
                      </IconButton>
                      <div className="relative">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleActionMenu(asset.publicPath)
                          }}
                          variant="ghost"
                          size="xs"
                          tooltip="Actions"
                        >
                          ⋯
                        </IconButton>
                        {openActionMenu === asset.publicPath && (
                          <div 
                            className="absolute right-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50 min-w-[120px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                handleDeleteSingle(asset.publicPath)
                                setOpenActionMenu(null)
                              }}
                              disabled={isDeleting}
                              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {isDeleting ? (
                                <>
                                  <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <span>×</span>
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Metadata Row */}
                  {isExpanded && (
                    <div className="bg-gray-750 border-b border-gray-700 overflow-hidden">
                      <div className="p-4 ml-4 sm:ml-8 lg:ml-16 max-w-[calc(100vw-2rem)]">
                        <div className="space-y-6 max-w-full overflow-hidden">
                          {/* Asset BIM Data Section for GLB files and Panoramas */}
                          {(asset.type === 'glb' || asset.type === 'panorama') && (
                            <div className="max-w-full overflow-hidden">
                              <label className="block text-sm font-medium text-blue-400 mb-3 flex items-center">
                                <span className="mr-2">{asset.type === 'glb' ? '🏗️' : '🏢'}</span>
                                {asset.type === 'glb' ? 'Asset BIM Data' : 'Space Data'}
                                {assetData[asset.publicPath]?.success && (
                                  <Badge 
                                    variant="success" 
                                            className="ml-2"
                                  >
                                    {assetData[asset.publicPath]?.asset?.metadata?.length || 0} parameters
                                  </Badge>
                                )}
                              </label>
                              
                              {assetData[asset.publicPath] ? (
                                assetData[asset.publicPath].success ? (
                                  <div className="space-y-4">
                                    {/* Asset Basic Info */}
                                    <div className="bg-gray-800 p-3 rounded border border-gray-600 max-w-full overflow-hidden">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-gray-400">Name:</span> <span className="text-white break-all">{assetData[asset.publicPath].asset?.name || 'Unnamed Asset'}</span></div>
                                        <div><span className="text-gray-400">Category:</span> <span className="text-white break-words">{assetData[asset.publicPath].asset?.category || 'Unknown'}</span></div>
                                      </div>
                                      <div className="mt-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                          <span className="text-gray-400">GUID:</span> 
                                          <span className="text-blue-300 font-mono text-xs bg-gray-700 px-2 py-1 rounded break-all">
                                            {assetData[asset.publicPath].asset?.guid}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Editable Parameters */}
                                    <div className="space-y-2">
                                      <h4 className="text-sm font-medium text-gray-300 mb-2">Parameters (Click to edit)</h4>
                                      {(assetData[asset.publicPath].asset?.metadata || []).length === 0 ? (
                                        <div className="text-gray-400 italic p-3 bg-gray-800 rounded border border-gray-600">
                                          No parameters found for this asset
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto overflow-x-hidden">
                                          {(assetData[asset.publicPath].asset?.metadata || []).map((param) => {
                                            const editKey = param.id.toString()
                                            const isEditing = editKey in editingParameters
                                            
                                            return (
                                              <div key={param.id} className="bg-gray-800 p-3 rounded border border-gray-600 max-w-full">
                                                <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                                                  <div className="flex-1 min-w-0 max-w-full">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-sm">{getParameterIcon(param.parameterType)}</span>
                                                        <span className="text-sm font-medium text-white break-words max-w-full">
                                                          {param.parameterName}
                                                        </span>
                                                      </div>
                                                      <span className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded whitespace-nowrap">
                                                        {param.parameterType.toLowerCase()}
                                                      </span>
                                                    </div>
                                                    
                                                    {isEditing ? (
                                                      <input
                                                        type="text"
                                                        value={editingParameters[editKey]}
                                                        onChange={(e) => setEditingParameters(prev => ({...prev, [editKey]: e.target.value}))}
                                                        onKeyDown={(e) => handleParameterKeyPress(e, asset.publicPath, param.id)}
                                                        onBlur={() => saveParameter(asset.publicPath, param.id)}
                                                        className="w-full max-w-full bg-gray-700 text-white px-2 py-1 rounded text-sm border border-gray-500 focus:border-blue-500 focus:outline-none break-all"
                                                        autoFocus
                                                      />
                                                    ) : (
                                                      <div 
                                                        className="text-gray-200 text-sm cursor-pointer hover:bg-gray-700 p-1 rounded transition-colors break-words"
                                                        onClick={() => startParameterEdit(param.id, param.parameterValue)}
                                                        title="Click to edit"
                                                      >
                                                        {formatParameterValue(param.parameterValue, param.parameterType)}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-400 italic p-3 bg-gray-800 rounded border border-gray-600">
                                    {assetData[asset.publicPath].error || 'No asset data available'}
                                    <div className="mt-1 text-xs">
                                      Make sure the GLB file is named with its GUID and the asset data has been imported.
                                    </div>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center text-sm text-gray-400">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                                  Loading asset data...
                                </div>
                              )}
                            </div>
                          )}

                          {/* Tags Section */}
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">File Tags</label>
                            
                            {/* Existing Tags */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {(editingTags[asset.publicPath] || []).map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="inline-flex items-center bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium"
                                >
                                  {tag}
                                  <button
                                    onClick={() => removeTag(asset.publicPath, tag)}
                                    className="ml-2 hover:text-red-300 transition-colors text-sm leading-none"
                                    title="Remove tag"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                              {(!editingTags[asset.publicPath] || editingTags[asset.publicPath].length === 0) && (
                                <span className="text-xs text-gray-500 italic">No tags yet</span>
                              )}
                            </div>
                            
                            {/* Add New Tag */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newTags[asset.publicPath] || ''}
                                onChange={(e) => setNewTags(prev => ({...prev, [asset.publicPath]: e.target.value}))}
                                onKeyDown={(e) => handleTagKeyPress(e, asset.publicPath)}
                                className="flex-1 bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
                                placeholder="Add new tag..."
                              />
                              <button
                                onClick={() => addTag(asset.publicPath)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                                title="Add tag"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Additional Actions */}
                          <div className="flex gap-2 pt-2 border-t border-gray-600">
                            <Link
                              href={`/?file=${encodeURIComponent(asset.publicPath)}&type=${asset.type}`}
                              className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
                            >
                              Open in Viewer
                            </Link>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this file?')) {
                                  handleDeleteSingle(asset.publicPath)
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
                            >
                              Delete File
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - GLB Preview (25%) */}
            <div className="w-1/4">
              <div className="bg-gray-800 rounded-lg p-6 sticky top-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Asset Preview</h3>
                  <span className="text-xs text-gray-400">Click any asset row to preview</span>
                </div>
                
                {selectedAssetForPreview ? (
                  selectedAssetForPreview.type === 'glb' ? (
                    <div className="space-y-4">
                      {/* Asset Info */}
                      <div className="bg-gray-700 p-3 rounded">
                        <h4 className="font-medium text-white mb-2">{selectedAssetForPreview.name}</h4>
                        <div className="text-sm text-gray-400 space-y-1">
                          <div>Size: {formatFileSize(selectedAssetForPreview.size)}</div>
                          <div>Modified: {formatDate(selectedAssetForPreview.lastModified)}</div>
                        </div>
                      </div>
                      
                      {/* 3D Viewer */}
                      <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ height: '400px' }}>
                        <ThreeViewer 
                          key={selectedAssetForPreview.publicPath} // Force re-mount when URL changes
                          modelUrl={selectedAssetForPreview.publicPath}
                          autoFit={true}
                          unlit={true}
                          onModelLoad={(info) => {
                            console.log('Model loaded:', info)
                          }}
                        />
                      </div>
                      
                      {/* Model Info */}
                      <div className="text-sm text-gray-400">
                        <div>Click and drag to rotate • Scroll to zoom • Right-click and drag to pan</div>
                      </div>
                    </div>
                  ) : selectedAssetForPreview.type === 'panorama' ? (
                    <div className="space-y-4">
                      {/* Asset Info */}
                      <div className="bg-gray-700 p-3 rounded">
                        <h4 className="font-medium text-white mb-2">{selectedAssetForPreview.name}</h4>
                        <div className="text-sm text-gray-400 space-y-1">
                          <div>Size: {formatFileSize(selectedAssetForPreview.size)}</div>
                          <div>Modified: {formatDate(selectedAssetForPreview.lastModified)}</div>
                          <div className="text-blue-400">360° Panoramic Image</div>
                        </div>
                      </div>
                      
                      {/* Panorama Viewer */}
                      <div className="bg-black rounded-lg overflow-hidden" style={{ height: '400px' }}>
                        <PanoramaViewer 
                          key={selectedAssetForPreview.publicPath} // Force re-mount when URL changes
                          imageUrl={selectedAssetForPreview.publicPath}
                          onImageLoad={(info) => {
                            console.log('Panorama loaded:', info)
                          }}
                        />
                      </div>
                      
                      {/* Panorama Info */}
                      <div className="text-sm text-gray-400">
                        <div>Click and drag to look around • Scroll to zoom • Full 360° view</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-4">📄</div>
                      <p>Preview not available for this file type.</p>
                      <p className="text-sm mt-2">Select a GLB or panorama file to preview.</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-4">🎯</div>
                    <p>Select an asset to preview</p>
                    <p className="text-sm mt-2">Click on any GLB file for 3D preview or panorama file for 360° view.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
          {/* Footer */}  
          <div className="fixed bottom-4 right-4">
            <p className="text-xs text-gray-500">designed by Emre</p>
          </div>
        </div>
      </main>
    </>
  )
}