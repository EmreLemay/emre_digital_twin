'use client'

import { useState, useCallback, useEffect } from 'react'
import MenuBar from '../components/MenuBar'
import ThreeViewer2 from '../components/ThreeViewer2'
import { FileUpload, Tabs, Button, Alert, LoadingSpinner, Badge } from '../components/ui'

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

// Hierarchy Node Component
const HierarchyNode = ({ node, level = 0 }: { node: any, level?: number }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2) // Auto-expand first 2 levels
  const hasChildren = node.children && node.children.length > 0
  const indent = level * 12

  const getNodeIcon = (node: any) => {
    if (node.isMesh) return '🔺'
    if (node.isGroup) return '📁'
    if (node.isScene) return '🌐'
    return '📄'
  }

  const getNodeTypeColor = (node: any) => {
    if (node.isMesh) return 'text-blue-400'
    if (node.isGroup) return 'text-yellow-400'
    if (node.isScene) return 'text-green-400'
    return 'text-gray-400'
  }

  return (
    <div>
      {/* Current Node */}
      <div 
        className="flex items-center gap-1 py-1 hover:bg-gray-600/30 rounded px-1 cursor-pointer"
        style={{ marginLeft: `${indent}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse Button */}
        <div className="w-4 text-center">
          {hasChildren ? (
            <span className="text-gray-500 text-xs">
              {isExpanded ? '▼' : '▶'}
            </span>
          ) : (
            <span className="text-gray-600 text-xs">•</span>
          )}
        </div>
        
        {/* Node Icon */}
        <span className="text-xs">{getNodeIcon(node)}</span>
        
        {/* Node Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium truncate ${getNodeTypeColor(node)}`}>
              {node.name}
            </span>
            {node.isMesh && (
              <span className="text-xs text-gray-500">
                ({node.vertexCount ? `${node.vertexCount}v` : 'mesh'})
              </span>
            )}
          </div>
          
          {/* Additional Info */}
          {(node.materialName || node.geometryType) && (
            <div className="text-xs text-gray-500 truncate">
              {node.materialName && `Material: ${node.materialName}`}
              {node.materialName && node.geometryType && ' • '}
              {node.geometryType && `Geometry: ${node.geometryType}`}
            </div>
          )}
        </div>
        
        {/* Node Type Badge */}
        <span className="text-xs text-gray-500 bg-gray-700 px-1 rounded">
          {node.type}
        </span>
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child: any, index: number) => (
            <HierarchyNode key={child.id || index} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Viewer2Page() {
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<'success' | 'error'>('success')
  
  // Selection state
  const [selectedGuid, setSelectedGuid] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [zoomTrigger, setZoomTrigger] = useState<{guid: string, timestamp: number} | null>(null)
  
  // BIM metadata state
  const [selectedMetadata, setSelectedMetadata] = useState<RevitMetadata | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)
  
  // Hierarchy state
  const [modelHierarchies, setModelHierarchies] = useState<Map<string, any[]>>(new Map())
  
  // Asset management state
  const [availableAssets, setAvailableAssets] = useState<AssetFile[]>([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [assetFilter, setAssetFilter] = useState<'all' | 'glb' | 'panorama'>('glb')

  // Extract GUID from GLB file path
  const extractGuidFromPath = useCallback((path: string): string | null => {
    const filename = path.split('/').pop() || ''
    
    // First try to match the extended format: GUID-extension (e.g., 21a96bfe-1d2f-4913-a727-8c72a07cf272-003cf9e2)
    let guidMatch = filename.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{8})\.glb$/i)
    let guid = guidMatch ? guidMatch[1] : null
    
    // If not found, try standard GUID format (allowing any alphanumeric characters for flexibility)
    if (!guid) {
      guidMatch = filename.match(/([0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12})\.glb$/i)
      guid = guidMatch ? guidMatch[1] : null
    }
    
    // If still not found, try to extract just the filename without extension as GUID
    if (!guid) {
      const nameWithoutExt = filename.replace(/\.glb$/i, '')
      if (nameWithoutExt.length > 0) {
        guid = nameWithoutExt
      }
    }
    
    console.log('🔍 Viewer2Page: GUID extraction:', { filename, guid })
    return guid
  }, [])

  // Fetch BIM metadata for selected asset using correct GUID extraction
  const fetchRevitMetadata = useCallback(async (assetPath: string) => {
    try {
      setMetadataLoading(true)
      console.log('🔍 Viewer2Page: Fetching Revit metadata for:', assetPath)
      
      const apiUrl = `/api/assets/revit-metadata?filepath=${encodeURIComponent(assetPath)}`
      console.log('🔍 Viewer2Page: API URL:', apiUrl)
      
      const response = await fetch(apiUrl)
      const result = await response.json()
      
      console.log('🔍 Viewer2Page: Metadata API response:', result)
      
      if (result.success && result.asset) {
        console.log('✅ Viewer2Page: Revit metadata loaded successfully:', result.asset)
        console.log('✅ Viewer2Page: Parameter count:', result.parameterCount)
        
        // Convert the metadata object to the expected format
        const metadataArray = result.metadata ? Object.entries(result.metadata).map(([key, value]: [string, any]) => ({
          id: 0, // API doesn't provide ID, use placeholder
          parameterName: key,
          parameterValue: value.value,
          parameterType: value.type
        })) : []
        
        console.log('✅ Viewer2Page: Converted metadata array:', metadataArray)
        
        setSelectedMetadata({
          ...result.asset,
          metadata: metadataArray
        })
      } else {
        console.log('❌ Viewer2Page: No Revit metadata found:', result.error || 'No asset in response')
        setSelectedMetadata(null)
      }
    } catch (err) {
      console.error('💥 Viewer2Page: Error fetching Revit metadata:', err)
      setSelectedMetadata(null)
    } finally {
      setMetadataLoading(false)
    }
  }, [])

  // Handle model selection from 3D viewer
  const handleModelSelect = useCallback((guid: string | null) => {
    console.log('🔥 Viewer2Page: handleModelSelect called with guid:', guid)
    setSelectedGuid(guid)
    
    // Update selectedIndex when 3D model is clicked
    if (guid) {
      const assetIndex = availableAssets.findIndex(asset => {
        const assetGuid = extractGuidFromPath(asset.publicPath)
        return assetGuid === guid
      })
      
      console.log('🔥 Viewer2Page: Found asset index for GUID:', assetIndex)
      setSelectedIndex(assetIndex)
      
      // Fetch metadata for the selected asset
      if (assetIndex >= 0) {
        fetchRevitMetadata(availableAssets[assetIndex].publicPath)
      }
    } else {
      setSelectedIndex(-1)
      setSelectedMetadata(null)
    }
  }, [availableAssets, extractGuidFromPath, fetchRevitMetadata])

  // Handle list item click
  const handleListItemClick = useCallback((asset: AssetFile, index: number) => {
    const guid = extractGuidFromPath(asset.publicPath)
    console.log('🔥 Viewer2Page: List item clicked:', { asset: asset.name, guid, index })
    
    setSelectedGuid(guid)
    setSelectedIndex(index)
    
    // Fetch metadata for the selected asset
    fetchRevitMetadata(asset.publicPath)
  }, [extractGuidFromPath, fetchRevitMetadata])

  // Handle list item double click (zoom)
  const handleListItemDoubleClick = useCallback((asset: AssetFile, event: React.MouseEvent) => {
    event.preventDefault()
    const guid = extractGuidFromPath(asset.publicPath)
    if (guid) {
      console.log('🔥 Viewer2Page: Double click - zooming to GUID:', guid)
      setZoomTrigger({ guid, timestamp: Date.now() })
    }
  }, [extractGuidFromPath])

  // Extract hierarchy from a 3D model
  const extractModelHierarchy = useCallback((scene: any, modelUrl: string) => {
    const hierarchy: any[] = []
    
    const traverseObject = (object: any, level: number = 0): any => {
      const nodeData = {
        id: object.id,
        name: object.name || `${object.type} ${object.id}`,
        type: object.type,
        level: level,
        visible: object.visible,
        position: object.position ? [
          Math.round(object.position.x * 100) / 100,
          Math.round(object.position.y * 100) / 100,
          Math.round(object.position.z * 100) / 100
        ] : null,
        rotation: object.rotation ? [
          Math.round((object.rotation.x * 180 / Math.PI) * 100) / 100,
          Math.round((object.rotation.y * 180 / Math.PI) * 100) / 100,
          Math.round((object.rotation.z * 180 / Math.PI) * 100) / 100
        ] : null,
        scale: object.scale ? [
          Math.round(object.scale.x * 100) / 100,
          Math.round(object.scale.y * 100) / 100,
          Math.round(object.scale.z * 100) / 100
        ] : null,
        children: [],
        isMesh: object.isMesh || false,
        isGroup: object.isGroup || false,
        isScene: object.isScene || false,
        materialName: object.material?.name || null,
        geometryType: object.geometry?.type || null,
        vertexCount: object.geometry?.attributes?.position?.count || null
      }
      
      // Recursively traverse children
      if (object.children && object.children.length > 0) {
        object.children.forEach((child: any) => {
          nodeData.children.push(traverseObject(child, level + 1))
        })
      }
      
      return nodeData
    }
    
    // Start traversal from the scene root
    const rootNode = traverseObject(scene, 0)
    hierarchy.push(rootNode)
    
    console.log('🌳 Extracted hierarchy for model:', modelUrl, hierarchy)
    return hierarchy
  }, [])

  // Keyboard navigation handlers
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Only handle keyboard if we have loaded GLB assets
    const glbAssets = availableAssets.filter(asset => 
      asset.type === 'glb' && selectedModels.includes(asset.publicPath)
    )
    
    if (glbAssets.length === 0) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault()
      const newIndex = selectedIndex < glbAssets.length - 1 ? selectedIndex + 1 : 0
      const asset = glbAssets[newIndex]
      const guid = extractGuidFromPath(asset.publicPath)
      if (guid) {
        setSelectedGuid(guid)
        const assetIndex = availableAssets.findIndex(a => a.publicPath === asset.publicPath)
        setSelectedIndex(assetIndex)
        fetchRevitMetadata(asset.publicPath)
      }
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const newIndex = selectedIndex > 0 ? selectedIndex - 1 : glbAssets.length - 1
      const asset = glbAssets[newIndex]
      const guid = extractGuidFromPath(asset.publicPath)
      if (guid) {
        setSelectedGuid(guid)
        const assetIndex = availableAssets.findIndex(a => a.publicPath === asset.publicPath)
        setSelectedIndex(assetIndex)
        fetchRevitMetadata(asset.publicPath)
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (selectedGuid) {
        console.log('🔥 Viewer2Page: Enter key - zooming to GUID:', selectedGuid)
        setZoomTrigger({ guid: selectedGuid, timestamp: Date.now() })
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setSelectedGuid(null)
      setSelectedIndex(-1)
      setSelectedMetadata(null)
    } else if (event.key === 'f' || event.key === 'F') {
      event.preventDefault()
      // Focus on all models - this will trigger the focus button in ThreeViewer2
      console.log('🔥 Viewer2Page: F key pressed - focusing on all models')
      // We can add a focus trigger similar to zoom trigger if needed
    }
  }, [availableAssets, selectedModels, selectedIndex, selectedGuid, extractGuidFromPath, fetchRevitMetadata])

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress])

  // Load available assets from database
  const loadAvailableAssets = useCallback(async () => {
    setLoadingAssets(true)
    try {
      const response = await fetch('/api/assets/list')
      const data = await response.json()
      
      if (data.success) {
        setAvailableAssets(data.assets)
      } else {
        setAlertType('error')
        setAlertMessage('Failed to load assets from database')
        setShowAlert(true)
      }
    } catch (error) {
      setAlertType('error')
      setAlertMessage('Error loading assets: ' + (error instanceof Error ? error.message : 'Unknown error'))
      setShowAlert(true)
    } finally {
      setLoadingAssets(false)
    }
  }, [])

  // Load assets on component mount
  useEffect(() => {
    loadAvailableAssets()
  }, [loadAvailableAssets])

  const handleFileUpload = useCallback(async (files: File[]) => {
    const glbFiles = files.filter(file => file.name.toLowerCase().endsWith('.glb'))
    
    if (glbFiles.length === 0) {
      setAlertType('error')
      setAlertMessage('Please select GLB files only')
      setShowAlert(true)
      return
    }

    try {
      // Process each GLB file
      const uploadedPaths: string[] = []
      
      for (const file of glbFiles) {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        const result = await response.json()
        
        if (result.success) {
          uploadedPaths.push(result.publicPath)
        } else {
          throw new Error(result.error)
        }
      }
      
      setSelectedModels(prev => [...prev, ...uploadedPaths])
      setAlertType('success')
      setAlertMessage(`Successfully uploaded ${glbFiles.length} GLB file(s)`)
      setShowAlert(true)
      
      // Refresh asset library to show newly uploaded files
      loadAvailableAssets()
      
    } catch (error) {
      setAlertType('error')
      setAlertMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setShowAlert(true)
    }
  }, [])

  const handleRemoveModel = useCallback((modelPath: string) => {
    setSelectedModels(prev => prev.filter(path => path !== modelPath))
    // Also remove hierarchy data
    setModelHierarchies(prev => {
      const newMap = new Map(prev)
      newMap.delete(modelPath)
      return newMap
    })
  }, [])

  // Add asset from database to viewer
  const handleAddAssetToViewer = useCallback((asset: AssetFile) => {
    if (!selectedModels.includes(asset.publicPath)) {
      setSelectedModels(prev => [...prev, asset.publicPath])
      setAlertType('success')
      setAlertMessage(`Added ${asset.name} to viewer`)
      setShowAlert(true)
    }
  }, [selectedModels])

  // Remove asset from viewer
  const handleRemoveAssetFromViewer = useCallback((assetPath: string) => {
    setSelectedModels(prev => prev.filter(path => path !== assetPath))
    // Also remove hierarchy data
    setModelHierarchies(prev => {
      const newMap = new Map(prev)
      newMap.delete(assetPath)
      return newMap
    })
  }, [])

  // Load all GLB assets from database
  const handleLoadAllGLBAssets = useCallback(() => {
    const glbAssets = (availableAssets || []).filter(asset => asset.type === 'glb')
    const newAssets = glbAssets.filter(asset => !selectedModels.includes(asset.publicPath))
    
    if (newAssets.length > 0) {
      setSelectedModels(prev => [...prev, ...newAssets.map(asset => asset.publicPath)])
      setAlertType('success')
      setAlertMessage(`Added ${newAssets.length} GLB file${newAssets.length !== 1 ? 's' : ''} to viewer`)
      setShowAlert(true)
    } else {
      setAlertType('info')
      setAlertMessage('All GLB files are already loaded')
      setShowAlert(true)
    }
  }, [availableAssets, selectedModels])

  // Auto-scroll to selected item
  useEffect(() => {
    if (selectedIndex >= 0) {
      const element = document.getElementById(`asset-${selectedIndex}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Filter assets based on type
  const filteredAssets = (availableAssets || []).filter(asset => {
    if (assetFilter === 'all') return true
    return asset.type === assetFilter
  })

  const leftPanelTabs = [
    { id: 'models', label: 'Models', icon: '🎲' },
    { id: 'assets', label: 'Asset Library', icon: '📦' },
    { id: 'hierarchy', label: 'Hierarchy', icon: '🌳' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ]

  const rightPanelTabs = [
    { id: 'properties', label: 'Properties', icon: '📋' },
    { id: 'metadata', label: 'BIM Data', icon: '🏗️' },
    { id: 'export', label: 'Export', icon: '💾' }
  ]

  const [activeLeftTab, setActiveLeftTab] = useState('models')
  const [activeRightTab, setActiveRightTab] = useState('properties')

  return (
    <>
      <MenuBar />
      <main className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="bg-gray-800 border-b border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">3D Viewer 2.0</h1>
                <p className="text-gray-300 text-sm">Advanced GLB viewer with hierarchy navigation and BIM data</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} loaded
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedModels([])}
                  disabled={selectedModels.length === 0}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>

          {/* Alert */}
          {showAlert && (
            <div className="p-4">
              <Alert
                type={alertType}
                message={alertMessage}
                dismissible
                onDismiss={() => setShowAlert(false)}
              />
            </div>
          )}

          {/* Main Layout */}
          <div className="flex h-[calc(100vh-140px)]">
            {/* Left Panel - Controls (30%) */}
            <div className="w-[30%] bg-gray-800 border-r border-gray-700 flex flex-col">
              <Tabs
                tabs={leftPanelTabs}
                activeTab={activeLeftTab}
                onTabChange={setActiveLeftTab}
                variant="default"
                className="border-b border-gray-700"
              >
                {activeLeftTab === 'models' && (
                  <div className="p-4 space-y-4">
                    <FileUpload
                      label="Upload GLB Models"
                      accept=".glb"
                      onFileSelect={handleFileUpload}
                      multiple={true}
                      dragAndDrop={true}
                      helperText="Drop GLB files here or click to browse"
                    />
                    
                    {selectedModels.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-300">Loaded Models:</h3>
                          <Badge variant="info" size="sm">{selectedModels.length}</Badge>
                        </div>
                        {selectedModels.map((modelPath, index) => (
                          <div key={modelPath} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                            <span className="text-sm truncate flex-1">
                              {modelPath.split('/').pop()?.replace('.glb', '') || `Model ${index + 1}`}
                            </span>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleRemoveModel(modelPath)}
                              className="text-red-400 hover:text-red-300"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeLeftTab === 'assets' && (
                  <div className="p-4 space-y-4">
                    {/* Asset Library Controls */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-300">Asset Library</h3>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={loadAvailableAssets}
                        disabled={loadingAssets}
                      >
                        🔄
                      </Button>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex gap-2">
                      <Button
                        variant={assetFilter === 'glb' ? 'primary' : 'ghost'}
                        size="xs"
                        onClick={() => setAssetFilter('glb')}
                      >
                        GLB ({(availableAssets || []).filter(a => a.type === 'glb').length})
                      </Button>
                      <Button
                        variant={assetFilter === 'panorama' ? 'primary' : 'ghost'}
                        size="xs"
                        onClick={() => setAssetFilter('panorama')}
                      >
                        360° ({(availableAssets || []).filter(a => a.type === 'panorama').length})
                      </Button>
                      <Button
                        variant={assetFilter === 'all' ? 'primary' : 'ghost'}
                        size="xs"
                        onClick={() => setAssetFilter('all')}
                      >
                        All ({(availableAssets || []).length})
                      </Button>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handleLoadAllGLBAssets}
                        disabled={(availableAssets || []).filter(a => a.type === 'glb').length === 0}
                        className="flex-1"
                      >
                        Load All GLBs
                      </Button>
                    </div>

                    {/* Asset List */}
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {loadingAssets ? (
                        <div className="flex items-center justify-center py-8">
                          <LoadingSpinner size="sm" text="Loading assets..." />
                        </div>
                      ) : filteredAssets.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <div className="text-2xl mb-2">📦</div>
                          <p className="text-sm">No assets found</p>
                          <p className="text-xs">Upload files from the main viewer or Assets page</p>
                        </div>
                      ) : (
                        filteredAssets.map((asset, index) => {
                          const isLoaded = selectedModels.includes(asset.publicPath)
                          const isGLB = asset.type === 'glb'
                          const assetGuid = extractGuidFromPath(asset.publicPath)
                          const isSelected = selectedGuid === assetGuid
                          
                          return (
                            <div 
                              key={asset.publicPath} 
                              id={`asset-${availableAssets.findIndex(a => a.publicPath === asset.publicPath)}`}
                              className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-orange-600 border border-orange-400 hover:bg-orange-700' 
                                  : 'bg-gray-700 hover:bg-gray-600'
                              }`}
                              onClick={() => handleListItemClick(asset, availableAssets.findIndex(a => a.publicPath === asset.publicPath))}
                              onDoubleClick={(e) => handleListItemDoubleClick(asset, e)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">
                                    {isGLB ? '🎲' : '🖼️'}
                                  </span>
                                  <span className="truncate font-medium">
                                    {asset.name.replace(/\.(glb|jpg|jpeg|png|webp)$/i, '')}
                                  </span>
                                  {isLoaded && <Badge variant="success" size="sm">Loaded</Badge>}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {(asset.size / 1024 / 1024).toFixed(1)} MB
                                </div>
                                {isSelected && (
                                  <div className="text-xs text-orange-200 mt-1">
                                    Selected
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {isGLB && !isLoaded && (
                                  <Button
                                    variant="success"
                                    size="xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAddAssetToViewer(asset)
                                    }}
                                  >
                                    +
                                  </Button>
                                )}
                                {isLoaded && (
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRemoveAssetFromViewer(asset.publicPath)
                                    }}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    ×
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}

                {activeLeftTab === 'hierarchy' && (
                  <div className="p-4 space-y-4">
                    {selectedModels.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        <div className="text-4xl mb-2">🌳</div>
                        <h3 className="font-medium mb-1">Model Hierarchy</h3>
                        <p className="text-sm">Load GLB models to explore their 3D structure</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-300">Loaded Models ({selectedModels.length})</h3>
                        </div>
                        
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {selectedModels.map((modelUrl) => {
                            const hierarchy = modelHierarchies.get(modelUrl)
                            const modelName = modelUrl.split('/').pop()?.replace('.glb', '') || 'Unknown Model'
                            const modelGuid = extractGuidFromPath(modelUrl)
                            const isSelected = selectedGuid === modelGuid
                            
                            return (
                              <div key={modelUrl} className={`border rounded-lg ${isSelected ? 'border-orange-500 bg-orange-900/20' : 'border-gray-600 bg-gray-700/50'}`}>
                                {/* Model Header */}
                                <div 
                                  className={`p-3 cursor-pointer hover:bg-gray-600/50 transition-colors ${isSelected ? 'bg-orange-800/30' : ''}`}
                                  onClick={() => {
                                    if (modelGuid) {
                                      const assetIndex = availableAssets.findIndex(asset => extractGuidFromPath(asset.publicPath) === modelGuid)
                                      handleListItemClick(availableAssets[assetIndex], assetIndex)
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">🎲</span>
                                      <div>
                                        <div className="text-sm font-medium text-white truncate">{modelName}</div>
                                        {modelGuid && (
                                          <div className="text-xs text-gray-400 font-mono">{modelGuid}</div>
                                        )}
                                      </div>
                                    </div>
                                    {isSelected && <Badge variant="info" size="sm">Selected</Badge>}
                                  </div>
                                </div>
                                
                                {/* Hierarchy Tree */}
                                {hierarchy && hierarchy.length > 0 && (
                                  <div className="border-t border-gray-600 p-3 bg-gray-800/30">
                                    <div className="text-xs text-gray-400 mb-2">3D Object Hierarchy:</div>
                                    <div className="space-y-1">
                                      {hierarchy.map((node, index) => (
                                        <HierarchyNode key={node.id || index} node={node} />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Loading/No hierarchy message */}
                                {(!hierarchy || hierarchy.length === 0) && (
                                  <div className="border-t border-gray-600 p-3 text-center">
                                    <div className="text-xs text-gray-500">
                                      {modelHierarchies.has(modelUrl) ? 'No hierarchy data' : 'Loading hierarchy...'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeLeftTab === 'settings' && (
                  <div className="p-4 space-y-4">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-300">Keyboard Shortcuts</h3>
                      <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>Navigate Models</span>
                          <span className="text-orange-300">Arrow Keys</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Zoom to Selected</span>
                          <span className="text-orange-300">Enter</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Clear Selection</span>
                          <span className="text-orange-300">Escape</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Focus All Models</span>
                          <span className="text-orange-300">F</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-gray-400 py-8">
                      <div className="text-4xl mb-2">⚙️</div>
                      <h3 className="font-medium mb-1">Viewer Settings</h3>
                      <p className="text-sm">Camera controls, performance options, and display settings</p>
                    </div>
                  </div>
                )}
              </Tabs>
            </div>

            {/* Center Panel - 3D Viewport (50%) */}
            <div className="flex-1 bg-gray-900 relative">
              <ThreeViewer2 
                modelUrls={selectedModels}
                className="w-full h-full"
                onModelLoad={(modelData) => {
                  console.log('🔥 Viewer2Page: Model loaded callback:', modelData)
                  // Extract hierarchy from the loaded model
                  const hierarchy = extractModelHierarchy(modelData.scene, modelData.url)
                  setModelHierarchies(prev => new Map(prev.set(modelData.url, hierarchy)))
                }}
                onObjectSelect={(object, modelData) => {
                  console.log('🔥 Viewer2Page: Object selected:', object, modelData)
                }}
                onModelSelect={handleModelSelect}
                selectedGuid={selectedGuid}
                zoomTrigger={zoomTrigger}
              />
            </div>

            {/* Right Panel - Properties (20%) */}
            <div className="w-[20%] bg-gray-800 border-l border-gray-700 flex flex-col">
              <Tabs
                tabs={rightPanelTabs}
                activeTab={activeRightTab}
                onTabChange={setActiveRightTab}
                variant="default"
                className="border-b border-gray-700"
              >
                {activeRightTab === 'properties' && (
                  <div className="p-4">
                    <div className="text-center text-gray-400 py-8">
                      <div className="text-4xl mb-2">📋</div>
                      <h3 className="font-medium mb-1">Object Properties</h3>
                      <p className="text-sm">Select an object to view properties</p>
                    </div>
                  </div>
                )}

                {activeRightTab === 'metadata' && (
                  <div className="p-4 space-y-4">
                    {metadataLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2 text-xs text-gray-400">Loading BIM data...</span>
                      </div>
                    ) : selectedMetadata ? (
                      <div className="space-y-4">
                        {/* Asset Info */}
                        <div className="bg-gray-700 p-3 rounded">
                          <div className="text-xs font-medium text-blue-400 mb-2">Asset Information</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Name:</span>
                              <span className="text-white text-right ml-2 break-all">{selectedMetadata.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Category:</span>
                              <span className="text-white text-right ml-2">{selectedMetadata.category}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">GUID:</span>
                              <span className="text-white text-right ml-2 font-mono text-xs break-all">{selectedMetadata.guid}</span>
                            </div>
                          </div>
                        </div>

                        {/* Parameters */}
                        {selectedMetadata.metadata && selectedMetadata.metadata.length > 0 && (
                          <div className="bg-gray-700 p-3 rounded max-h-96 overflow-y-auto">
                            <div className="text-xs font-medium text-blue-400 mb-2">
                              BIM Parameters ({selectedMetadata.metadata.length})
                            </div>
                            <div className="space-y-2">
                              {selectedMetadata.metadata.map((param, index) => (
                                <div key={`${param.parameterName}-${index}`} className="border-b border-gray-600 pb-2 last:border-b-0">
                                  <div className="flex justify-between items-start">
                                    <span className="text-xs text-gray-400 flex-shrink-0">{param.parameterName}:</span>
                                    <span className="text-xs text-white font-mono text-right ml-2 break-all">
                                      {param.parameterValue || 'N/A'}
                                    </span>
                                  </div>
                                  {param.parameterType && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Type: {param.parameterType}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No parameters message */}
                        {(!selectedMetadata.metadata || selectedMetadata.metadata.length === 0) && (
                          <div className="bg-gray-700 p-3 rounded">
                            <div className="text-center text-gray-400 py-4">
                              <div className="text-2xl mb-2">📋</div>
                              <p className="text-sm">No BIM parameters available</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : selectedGuid ? (
                      <div className="bg-gray-700 p-3 rounded">
                        <div className="text-center text-gray-400 py-4">
                          <div className="text-2xl mb-2">❌</div>
                          <p className="text-sm">No BIM data found for this asset</p>
                          <p className="text-xs mt-1">GUID: {selectedGuid}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <div className="text-4xl mb-2">🏗️</div>
                        <h3 className="font-medium mb-1">BIM Metadata</h3>
                        <p className="text-sm">Select a model to view BIM parameters</p>
                      </div>
                    )}
                  </div>
                )}

                {activeRightTab === 'export' && (
                  <div className="p-4">
                    <div className="text-center text-gray-400 py-8">
                      <div className="text-4xl mb-2">💾</div>
                      <h3 className="font-medium mb-1">Export Options</h3>
                      <p className="text-sm">Save models, screenshots, and reports</p>
                    </div>
                  </div>
                )}
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}