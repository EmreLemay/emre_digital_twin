'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import MotherGLBViewer from '../components/MotherGLBViewer'

export default function MotherViewerPage() {
  const [motherFile, setMotherFile] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string>('No file uploaded')
  const [uploading, setUploading] = useState(false)
  const [selectedVolume, setSelectedVolume] = useState<any>(null)
  const [revitData, setRevitData] = useState<any>(null)
  const [hierarchyData, setHierarchyData] = useState<any>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [hasExistingFile, setHasExistingFile] = useState(false)
  const [fileLastModified, setFileLastModified] = useState<string>('')
  const [panelSplit, setPanelSplit] = useState(70) // Default 70% for 3D viewer, 30% for right panel
  const [isResizing, setIsResizing] = useState(false)

  // Load panel split from localStorage and check for existing file
  useEffect(() => {
    checkForExistingFile()
    
    // Load saved panel split
    const savedSplit = localStorage.getItem('mother-viewer-panel-split')
    if (savedSplit) {
      const splitValue = parseFloat(savedSplit)
      if (splitValue >= 40 && splitValue <= 85) {
        setPanelSplit(splitValue)
      }
    }
  }, [])

  // Save panel split to localStorage
  useEffect(() => {
    localStorage.setItem('mother-viewer-panel-split', panelSplit.toString())
  }, [panelSplit])

  const checkForExistingFile = async () => {
    try {
      const response = await fetch('/api/mother-glb/check')
      const result = await response.json()
      
      if (result.exists) {
        setHasExistingFile(true)
        setFileLastModified(result.lastModified || '')
        setUploadedFileName(result.fileName || 'mother.glb')
        // Auto-load the existing file
        setMotherFile('/mother-glb/mother.glb')
        console.log('📁 Found existing mother GLB file:', result.fileName)
      } else {
        setHasExistingFile(false)
        console.log('📂 No existing mother GLB file found')
      }
    } catch (error) {
      console.error('Error checking for existing file:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.glb')) {
      alert('Please select a GLB file')
      return
    }

    // Check file size (reasonable limit for mother file)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      alert(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB.`)
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/mother-glb/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!result.success) {
        alert(`Upload failed: ${result.error}`)
        return
      }

      console.log(`Mother GLB uploaded successfully: ${result.publicPath}`)
      setMotherFile(result.publicPath)
      setUploadedFileName(file.name)
      
      // Update file status after successful upload
      await checkForExistingFile()
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload mother GLB file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const clearPersistentFile = async () => {
    if (!confirm('Are you sure you want to delete the persistent mother GLB file?')) {
      return
    }

    try {
      const response = await fetch('/api/mother-glb/clear', {
        method: 'DELETE'
      })
      const result = await response.json()
      
      if (result.success) {
        console.log('🗑️ Persistent mother GLB file cleared')
        setHasExistingFile(false)
        setMotherFile(null)
        setUploadedFileName('No file uploaded')
        setFileLastModified('')
        setHierarchyData(null)
        setSelectedVolume(null)
        setRevitData(null)
      } else {
        alert(`Failed to clear file: ${result.error}`)
      }
    } catch (error) {
      console.error('Error clearing persistent file:', error)
      alert('Failed to clear persistent file.')
    }
  }

  // Panel resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
    
    const startY = e.clientY
    let currentResizing = true
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!currentResizing) return
      
      const containerRect = document.querySelector('.resize-container')?.getBoundingClientRect()
      if (!containerRect) return
      
      const x = e.clientX - containerRect.left
      const percentage = Math.round((x / containerRect.width) * 100)
      
      // Constrain between 40% and 85%
      const constrainedPercentage = Math.max(40, Math.min(85, percentage))
      setPanelSplit(constrainedPercentage)
    }
    
    const handleMouseUp = () => {
      currentResizing = false
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Double-click to reset to default 70/30 split
  const handleDoubleClick = () => {
    setPanelSplit(70)
  }

  const handleVolumeSelect = async (volumeData: any, hierarchyInfo?: any) => {
    setSelectedVolume(volumeData)
    
    // Update hierarchy data if provided
    if (hierarchyInfo) {
      setHierarchyData(hierarchyInfo)
    }
    
    if (volumeData?.guid) {
      try {
        // Fetch Revit data using the existing API
        const response = await fetch(`/api/assets/revit-metadata?filepath=${volumeData.guid}.glb`)
        const result = await response.json()
        
        if (result.success && result.metadata) {
          // Convert metadata object to array format
          const metadataArray = Object.entries(result.metadata).map(([key, value]: [string, any]) => ({
            parameterName: key,
            parameterValue: value.value,
            parameterType: value.type
          }))
          
          setRevitData({
            ...result.asset,
            metadata: metadataArray
          })
        } else {
          setRevitData(null)
        }
      } catch (error) {
        console.error('Error fetching Revit data:', error)
        setRevitData(null)
      }
    }
  }

  // Toggle expanded state for a node
  const toggleNodeExpansion = (nodeGuid: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeGuid)) {
        newSet.delete(nodeGuid)
      } else {
        newSet.add(nodeGuid)
      }
      return newSet
    })
  }

  // Hierarchy Structure Panel Component (Apple HIG Style)
  const HierarchyStructurePanel = () => {
    if (!hierarchyData) {
      return (
        <div className="text-sm text-gray-400">
          No hierarchy data available yet. Upload and interact with a GLB file.
        </div>
      )
    }

    const renderHierarchyNode = (node: any, level: number = 0, parentGuid: string = 'root') => {
      const hasChildren = node.children && node.children.length > 0
      const isExpanded = expandedNodes.has(node.guid)
      const isSelected = selectedVolume?.guid === node.guid
      const uniqueKey = `${node.guid}-${parentGuid}-${level}`
      
      // Apple HIG style indentation (16px per level)
      const indentWidth = level * 16
      
      return (
        <div key={uniqueKey}>
          {/* Node Row */}
          <div 
            className={`group flex items-center h-6 cursor-pointer transition-colors ${
              isSelected 
                ? 'bg-blue-600/20 text-blue-300' 
                : 'hover:bg-gray-700/50 text-gray-300'
            }`}
            style={{ paddingLeft: `${8 + indentWidth}px` }}
            onClick={() => {/* Could add navigation to this node */}}
          >
            {/* Disclosure Triangle */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleNodeExpansion(node.guid)
                }}
                className="w-4 h-4 mr-1 flex items-center justify-center hover:bg-gray-600 rounded transition-colors"
              >
                <svg 
                  width="8" 
                  height="8" 
                  viewBox="0 0 8 8" 
                  className={`fill-current transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                >
                  <path d="M1.5 1L6.5 4L1.5 7V1Z" />
                </svg>
              </button>
            ) : (
              <div className="w-4 h-4 mr-1"></div>
            )}

            {/* Icon */}
            <div className="w-4 h-4 mr-2 flex items-center justify-center">
              {hasChildren ? (
                <div className={`w-3 h-3 rounded-sm ${isExpanded ? 'bg-blue-500' : 'bg-gray-500'}`}>
                  <svg width="12" height="12" viewBox="0 0 12 12" className="fill-white">
                    {isExpanded ? (
                      <path d="M3 3h6v6H3z" />
                    ) : (
                      <path d="M3 2h6c.5 0 1 .5 1 1v6c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1V3c0-.5.5-1 1-1z" />
                    )}
                  </svg>
                </div>
              ) : (
                <div className="w-3 h-3 rounded-sm bg-gray-600">
                  <svg width="12" height="12" viewBox="0 0 12 12" className="fill-white">
                    <path d="M2 2h8v8H2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Node Label */}
            <span 
              className="flex-1 text-sm font-medium truncate select-none"
              title={node.name}
            >
              {node.name.length > 20 ? `${node.name.substring(0, 20)}...` : node.name}
            </span>

            {/* Metadata Badge */}
            <div className="flex items-center gap-1 ml-2">
              {hasChildren && (
                <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                  {node.children.length}
                </span>
              )}
              <span className="text-xs text-gray-500">
                L{node.level}
              </span>
            </div>
          </div>
          
          {/* Children (only render if expanded) */}
          {hasChildren && isExpanded && (
            <div>
              {node.children.map((child: any) => 
                renderHierarchyNode(child, level + 1, node.guid)
              )}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {/* Hierarchy Stats - Apple HIG style header */}
        <div className="flex justify-between items-center text-xs text-gray-400 border-b border-gray-700 pb-2">
          <div className="flex items-center gap-3">
            <span className="font-medium">Total: {hierarchyData.totalVolumes || 0}</span>
            <span>Max Depth: {hierarchyData.maxDepth || 0}</span>
          </div>
          <button 
            onClick={() => {
              // Expand all root nodes for better overview
              const newExpanded = new Set(expandedNodes)
              hierarchyData.rootNodes.forEach((node: any) => {
                if (node.children && node.children.length > 0) {
                  newExpanded.add(node.guid)
                }
              })
              setExpandedNodes(newExpanded)
            }}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Expand All
          </button>
        </div>
        
        {/* Hierarchy Tree - Clean Apple HIG style */}
        <div className="max-h-56 overflow-y-auto bg-gray-900/50 border border-gray-700 rounded">
          {hierarchyData.rootNodes ? (
            <div className="py-1">
              {hierarchyData.rootNodes.map((rootNode: any, index: number) => 
                renderHierarchyNode(rootNode, 0, `root-${index}`)
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-xs text-gray-500">
              No hierarchy structure found
            </div>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 text-xs">
          <button 
            onClick={() => setExpandedNodes(new Set())}
            className="text-gray-500 hover:text-gray-400 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header with Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mother GLB Viewer</h1>
            <p className="text-gray-400 mt-1">
              Upload and interact with bounding box representations of your assets
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
              href="/multi-viewer"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Multi-GLB Viewer
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

      </div>

      {/* Main Content */}
      <div className="flex h-screen resize-container">
        {/* Left Panel - 3D Viewer (Dynamic) */}
        <div className="p-6" style={{ width: `${panelSplit}%` }}>
          <div className="bg-gray-800 rounded-lg h-full">
            {motherFile ? (
              <MotherGLBViewer 
                modelUrl={motherFile}
                onVolumeSelect={handleVolumeSelect}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-4">📁</div>
                  <p>No Mother GLB File Loaded</p>
                  <p className="text-sm mt-2">Upload a GLB file to begin exploring bounding boxes</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drag Handle */}
        <div 
          className={`relative w-1 bg-gray-600 hover:bg-gray-500 cursor-col-resize flex items-center justify-center transition-colors ${
            isResizing ? 'bg-blue-500' : ''
          }`}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          title="Drag to resize panels, double-click to reset to 70/30"
        >
          {/* Grip indicator */}
          <div className="flex flex-col gap-1">
            <div className="w-0.5 h-1 bg-gray-300 rounded"></div>
            <div className="w-0.5 h-1 bg-gray-300 rounded"></div>
            <div className="w-0.5 h-1 bg-gray-300 rounded"></div>
          </div>
          
          {/* Show ratio during resize */}
          {isResizing && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow">
              {panelSplit}% / {100 - panelSplit}%
            </div>
          )}
        </div>

        {/* Right Panel - Hierarchy & Volume Info (Dynamic) */}
        <div className="border-l border-gray-700 p-6" style={{ width: `${100 - panelSplit}%` }}>
          <div className="space-y-4 h-full overflow-y-auto">
            {/* Hierarchy Structure Panel */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Hierarchy Structure</h3>
              {motherFile ? (
                <HierarchyStructurePanel />
              ) : (
                <div className="text-sm text-gray-400">
                  Upload a mother GLB to see hierarchy structure
                </div>
              )}
            </div>

            {/* Volume Information Panel */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Volume Information</h3>
            
            {selectedVolume ? (
              <div className="space-y-4">
                {/* Volume Details */}
                <div className="bg-gray-700 p-3 rounded">
                  <h4 className="font-medium text-white mb-2">Selected Volume</h4>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>GUID: {selectedVolume.guid || 'Unknown'}</div>
                    <div>Name: {selectedVolume.name || 'Unnamed'}</div>
                    <div>Type: Bounding Box</div>
                  </div>
                </div>

                {/* Revit BIM Parameters */}
                {revitData && revitData.metadata && revitData.metadata.length > 0 ? (
                  <div className="bg-gray-700 p-3 rounded">
                    <h4 className="font-medium text-blue-400 mb-2">
                      Revit Parameters ({revitData.metadata.length})
                    </h4>
                    <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
                      {revitData.metadata.map((param: any) => (
                        <div key={param.parameterName} className="flex justify-between items-start py-1 pr-2">
                          <span className="text-xs text-gray-400 flex-shrink-0">{param.parameterName}:</span>
                          <span className="text-xs text-white font-mono text-right ml-2 break-all">
                            {param.parameterValue || '<empty>'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : revitData === null && selectedVolume ? (
                  <div className="bg-yellow-900/20 border border-yellow-600 p-3 rounded">
                    <p className="text-sm text-yellow-300">
                      No Revit data found for this volume GUID
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <div className="text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <p className="text-sm">Select a Volume</p>
                  <p className="text-xs mt-1">Click on any bounding box to see details</p>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section - Bottom */}
      <div className="bg-gray-800 border-t border-gray-700 p-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">File Management</h3>
          
          {hasExistingFile && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-600/30 rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-300">Persistent Mother GLB Ready</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={checkForExistingFile}
                    className="text-xs text-green-400 hover:text-green-300 transition-colors"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={clearPersistentFile}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="text-xs text-green-200">
                File: {uploadedFileName}
              </div>
              {fileLastModified && (
                <div className="text-xs text-gray-400">
                  Last updated: {new Date(fileLastModified).toLocaleString()}
                </div>
              )}
            </div>
          )}
          
          <div className="bg-gray-700 rounded-lg p-4">
            <label className="block">
              <span className="text-sm text-gray-300 mb-2 block">
                {hasExistingFile ? 'Upload New Mother GLB (will replace existing):' : 'Upload Mother GLB File:'}
              </span>
              <input
                type="file"
                accept=".glb"
                onChange={handleFileUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-300
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700
                  file:cursor-pointer
                  disabled:file:bg-gray-500"
              />
            </label>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-400">
                {uploading ? 'Uploading...' : (hasExistingFile ? 'Auto-loaded from persistent storage' : 'No file uploaded')}
              </p>
              <p className="text-xs text-gray-500">
                .glb only
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 right-4">
        <p className="text-xs text-gray-500">designed by Emre</p>
      </div>
    </div>
  )
}