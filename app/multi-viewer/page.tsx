'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import MultiGLBViewer from '../components/MultiGLBViewer'

interface AssetFile {
  name: string
  type: 'glb' | 'panorama'
  size: number
  lastModified: string
  publicPath: string
}

interface RevitMetadata {
  id: number
  guid: string
  name: string
  category: string
  filePath: string | null
  createdAt: string
  updatedAt: string
  metadata: Array<{
    id: number
    parameterName: string
    parameterValue: string
    parameterType: string
  }>
}

export default function MultiViewerPage() {
  const [glbAssets, setGlbAssets] = useState<AssetFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGuid, setSelectedGuid] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [selectedMetadata, setSelectedMetadata] = useState<RevitMetadata | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)

  useEffect(() => {
    fetchGLBAssets()
  }, [])

  const fetchGLBAssets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/assets/list')
      const result = await response.json()

      if (result.success) {
        // Filter only GLB files
        const glbFiles = result.assets.filter((asset: AssetFile) => asset.type === 'glb')
        setGlbAssets(glbFiles)
      } else {
        setError(result.error || 'Failed to load assets')
      }
    } catch (err) {
      setError('Failed to fetch GLB assets')
      console.error('Error fetching GLB assets:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRevitMetadata = async (assetPath: string) => {
    try {
      setMetadataLoading(true)
      console.log('🔍 DEBUG: Fetching Revit metadata for:', assetPath)
      
      const apiUrl = `/api/assets/revit-metadata?filepath=${encodeURIComponent(assetPath)}`
      console.log('🔍 DEBUG: API URL:', apiUrl)
      
      const response = await fetch(apiUrl)
      console.log('🔍 DEBUG: Response status:', response.status)
      
      const result = await response.json()
      console.log('🔍 DEBUG: Full API response:', result)
      
      if (result.success && result.asset) {
        console.log('✅ DEBUG: Revit metadata loaded successfully:', result.asset)
        console.log('✅ DEBUG: API metadata object:', result.metadata)
        console.log('✅ DEBUG: Parameter count:', result.parameterCount)
        
        // Convert the metadata object to the expected format
        const metadataArray = result.metadata ? Object.entries(result.metadata).map(([key, value]: [string, any]) => ({
          parameterName: key,
          parameterValue: value.value,
          parameterType: value.type
        })) : []
        
        console.log('✅ DEBUG: Converted metadata array:', metadataArray)
        
        setSelectedMetadata({
          ...result.asset,
          metadata: metadataArray
        })
      } else {
        console.log('❌ DEBUG: No Revit metadata found:', result.error || 'No asset in response')
        setSelectedMetadata(null)
      }
    } catch (err) {
      console.error('💥 DEBUG: Error fetching Revit metadata:', err)
      setSelectedMetadata(null)
    } finally {
      setMetadataLoading(false)
      console.log('🔄 DEBUG: setMetadataLoading(false) called')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }


  const extractGuidFromPath = (path: string): string => {
    const filename = path.split('/').pop() || ''
    // Handle both GLB files (guid.glb) and panorama files (guid_360.jpg)
    return filename
      .replace(/\.(glb|GLB)$/, '')  // Remove .glb extension
      .replace(/_360\.(jpg|jpeg|png|JPG|JPEG|PNG)$/, '')  // Remove _360.jpg suffix
      .toLowerCase()
  }

  const handleModelSelect = useCallback((guid: string | null) => {
    console.log('🎯 DEBUG: handleModelSelect called with guid:', guid)
    setSelectedGuid(guid)
    // Update selectedIndex when 3D model is clicked
    if (guid) {
      console.log('🎯 DEBUG: Looking for asset with GUID:', guid)
      console.log('🎯 DEBUG: Available assets count:', glbAssets.length)
      
      const index = glbAssets.findIndex(asset => {
        const assetGuid = extractGuidFromPath(asset.publicPath)
        console.log('🎯 DEBUG: Comparing asset GUID:', assetGuid, 'with clicked GUID:', guid)
        return assetGuid === guid
      })
      
      if (index !== -1) {
        console.log('🎯 DEBUG: Found matching asset at index:', index)
        console.log('🎯 DEBUG: Asset path:', glbAssets[index].publicPath)
        setSelectedIndex(index)
        // Fetch metadata for the selected asset
        fetchRevitMetadata(glbAssets[index].publicPath)
      } else {
        console.log('❌ DEBUG: No matching asset found for GUID:', guid)
      }
    } else {
      console.log('🎯 DEBUG: Clearing selection')
      setSelectedIndex(-1)
      setSelectedMetadata(null)
    }
  }, [glbAssets, fetchRevitMetadata])

  const handleListItemClick = useCallback((asset: AssetFile) => {
    const guid = extractGuidFromPath(asset.publicPath)
    const index = glbAssets.findIndex(a => a.publicPath === asset.publicPath)
    console.log('📋 DEBUG: === LIST ITEM CLICKED ===')
    console.log('📋 DEBUG: Asset name:', asset.name)
    console.log('📋 DEBUG: Asset path:', asset.publicPath)
    console.log('📋 DEBUG: Extracted GUID:', guid)
    console.log('📋 DEBUG: Index:', index)
    console.log('📋 DEBUG: About to call fetchRevitMetadata with path:', asset.publicPath)
    setSelectedGuid(guid)
    setSelectedIndex(index)
    // Fetch Revit metadata for the selected asset
    fetchRevitMetadata(asset.publicPath)
    // Single click only highlights the model
  }, [glbAssets, fetchRevitMetadata])

  const [zoomTrigger, setZoomTrigger] = useState<{guid: string, timestamp: number} | null>(null)

  const handleListItemDoubleClick = useCallback((asset: AssetFile, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    const guid = extractGuidFromPath(asset.publicPath)
    const index = glbAssets.findIndex(a => a.publicPath === asset.publicPath)
    console.log('=== LIST ITEM DOUBLE CLICKED ===')
    console.log('Double-click zoom for GUID:', guid)
    
    setSelectedGuid(guid)
    setSelectedIndex(index)
    // Use timestamp to ensure unique trigger
    setZoomTrigger({ guid, timestamp: Date.now() })
  }, [glbAssets])

  // Keyboard navigation for GLB list
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (glbAssets.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const newIndex = selectedIndex < glbAssets.length - 1 ? selectedIndex + 1 : 0
      const asset = glbAssets[newIndex]
      const guid = extractGuidFromPath(asset.publicPath)
      console.log('Arrow down - selecting index:', newIndex, 'GUID:', guid)
      setSelectedIndex(newIndex)
      setSelectedGuid(guid)
      fetchRevitMetadata(asset.publicPath)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      const newIndex = selectedIndex > 0 ? selectedIndex - 1 : glbAssets.length - 1
      const asset = glbAssets[newIndex]
      const guid = extractGuidFromPath(asset.publicPath)
      console.log('Arrow up - selecting index:', newIndex, 'GUID:', guid)
      setSelectedIndex(newIndex)
      setSelectedGuid(guid)
      fetchRevitMetadata(asset.publicPath)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < glbAssets.length) {
        const asset = glbAssets[selectedIndex]
        const guid = extractGuidFromPath(asset.publicPath)
        console.log('Enter key - zooming to GUID:', guid)
        setZoomTrigger({ guid, timestamp: Date.now() })
      }
    }
  }, [glbAssets, selectedIndex])

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // Auto-scroll to selected item
  useEffect(() => {
    if (selectedIndex >= 0) {
      const element = document.getElementById(`asset-${selectedIndex}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Memoize modelUrls to prevent unnecessary re-renders
  const modelUrls = useMemo(() => {
    return glbAssets.map(asset => asset.publicPath)
  }, [glbAssets])

  // Memoize onModelsLoad callback
  const handleModelsLoad = useCallback((info: any) => {
    console.log('Models loaded:', info)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <span className="ml-3 text-gray-300">Loading GLB assets...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/30 border border-red-600 text-red-300 p-4 rounded-lg">
            <p className="font-medium">Error Loading GLB Assets</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-full mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Multi-GLB Viewer</h1>
            <p className="text-gray-300">
              View all {glbAssets.length} GLB models together in one 3D scene
            </p>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              ← Home
            </Link>
            <Link 
              href="/assets"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Asset Library
            </Link>
            <Link 
              href="/hierarchy"
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Asset Hierarchy
            </Link>
            <Link 
              href="/data"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Data Management
            </Link>
          </div>
        </div>

        {glbAssets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-medium mb-2">No GLB Models Found</h3>
            <p>Upload some GLB files from the main viewer to see them here.</p>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Left Panel - GLB List (25%) */}
            <div className="w-1/4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Loaded Models ({glbAssets.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {glbAssets.map((asset, index) => {
                    const guid = extractGuidFromPath(asset.publicPath)
                    const isSelected = selectedIndex === index
                    
                    return (
                      <div 
                        key={asset.publicPath}
                        id={`asset-${index}`}
                        className={`p-3 rounded text-sm cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-orange-600 border border-orange-400 hover:bg-orange-700' 
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                        onClick={() => handleListItemClick(asset)}
                        onDoubleClick={(event) => handleListItemDoubleClick(asset, event)}
                      >
                        <div className="font-medium text-white truncate" title={asset.name}>
                          {asset.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatFileSize(asset.size)}
                        </div>
                        {isSelected && (
                          <div className="text-xs text-orange-200 mt-1">
                            Selected
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Revit Parameters Panel */}
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <h4 className="text-sm font-semibold mb-3 text-gray-300">Revit Parameters</h4>
                {(() => {
                  console.log('🖼️ DEBUG: Rendering parameters panel')
                  console.log('🖼️ DEBUG: metadataLoading:', metadataLoading)
                  console.log('🖼️ DEBUG: selectedMetadata:', selectedMetadata)
                  console.log('🖼️ DEBUG: selectedMetadata?.metadata:', selectedMetadata?.metadata)
                  return null
                })()}
                {metadataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                    <span className="ml-2 text-xs text-gray-400">Loading parameters...</span>
                  </div>
                ) : selectedMetadata ? (
                  <div className="space-y-3">
                    {/* Basic Info */}
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-xs font-medium text-green-400 mb-2">Asset Info</div>
                      <div className="space-y-1 text-xs">
                        <div><span className="text-gray-400">Name:</span> <span className="text-white">{selectedMetadata.name}</span></div>
                        <div><span className="text-gray-400">Category:</span> <span className="text-white">{selectedMetadata.category}</span></div>
                      </div>
                    </div>

                    {/* Parameters */}
                    {selectedMetadata.metadata && selectedMetadata.metadata.length > 0 && (
                      <div className="bg-gray-700 p-3 rounded max-h-64 overflow-y-auto">
                        <div className="text-xs font-medium text-blue-400 mb-2">
                          Parameters ({selectedMetadata.metadata.length})
                        </div>
                        <div className="space-y-1">
                          {selectedMetadata.metadata.map((param) => (
                            <div key={param.parameterName} className="flex justify-between items-start py-1">
                              <span className="text-xs text-gray-400 flex-shrink-0">{param.parameterName}:</span>
                              <span className="text-xs text-white font-mono text-right ml-2 break-all">
                                {param.parameterValue || '<empty>'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-2xl mb-2">📋</div>
                    <p className="text-xs">Select an asset to view its parameters</p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <h4 className="text-sm font-semibold mb-2 text-gray-300">Controls:</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Left-click + drag: Rotate camera</li>
                  <li>• Right-click + drag: Pan camera</li>
                  <li>• Scroll wheel: Zoom in/out</li>
                  <li>• Click list item: Select & highlight model</li>
                  <li>• Double-click list/3D model: Zoom to model</li>
                  <li>• ↑/↓ arrows: Navigate list selection</li>
                  <li>• Enter key: Zoom to selected model</li>
                  <li>• F key: Zoom to fit all models</li>
                  <li>• WASD + QE: Fly camera</li>
                </ul>
              </div>
            </div>

            {/* Right Panel - 3D Viewer (75%) */}
            <div className="w-3/4">
              <div className="bg-gray-800 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
                <MultiGLBViewer 
                  modelUrls={modelUrls}
                  onModelsLoad={handleModelsLoad}
                  onModelSelect={handleModelSelect}
                  selectedGuid={selectedGuid}
                  zoomTrigger={zoomTrigger}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="fixed bottom-4 right-4">
        <p className="text-xs text-gray-500">designed by Emre</p>
      </div>
    </div>
  )
}