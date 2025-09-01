'use client'

import { useState, useEffect } from 'react'
import MenuBar from '../components/MenuBar'
import MotherGLBViewer from '../components/MotherGLBViewer'

export default function MotherViewerPage() {
  const [motherFile, setMotherFile] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string>('No file uploaded')
  const [uploading, setUploading] = useState(false)
  const [selectedVolume, setSelectedVolume] = useState<any>(null)
  const [revitData, setRevitData] = useState<any>(null)
  const [hierarchyData, setHierarchyData] = useState<any>(null)
  const [hasExistingFile, setHasExistingFile] = useState(false)
  const [fileLastModified, setFileLastModified] = useState<string>('')
  const [panelSplit, setPanelSplit] = useState(70)
  const [isResizing, setIsResizing] = useState(false)
  
  // SIMPLIFIED: Basic volume visibility state
  const [allVolumeGuids, setAllVolumeGuids] = useState<string[]>([])
  const [selectedVolumeGuid, setSelectedVolumeGuid] = useState<string | null>(null)
  const [visibleGuids, setVisibleGuids] = useState<Set<string>>(new Set())

  // Load panel split from localStorage and check for existing file
  useEffect(() => {
    checkForExistingFile()
    
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
    if (panelSplit >= 40 && panelSplit <= 85) {
      localStorage.setItem('mother-viewer-panel-split', panelSplit.toString())
    }
  }, [panelSplit])

  const checkForExistingFile = async () => {
    try {
      const response = await fetch('/api/mother-glb/check')
      const result = await response.json()
      
      if (result.exists) {
        setHasExistingFile(true)
        setMotherFile('/mother-glb/mother.glb')
        setUploadedFileName('mother.glb')
        setFileLastModified(result.lastModified)
        console.log('✅ Found existing mother GLB file')
      } else {
        setHasExistingFile(false)
        console.log('📂 No existing mother GLB file found')
      }
    } catch (error) {
      console.error('Error checking for existing file:', error)
      setHasExistingFile(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.glb')) {
      alert('Please select a .glb file')
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
        setAllVolumeGuids([])
        setVisibleGuids(new Set())
        setSelectedVolumeGuid(null)
      } else {
        alert(`Failed to clear file: ${result.error}`)
      }
    } catch (error) {
      console.error('Error clearing file:', error)
      alert('Failed to clear persistent file')
    }
  }

  // Panel resizing handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      const newSplit = Math.min(85, Math.max(40, (e.clientX / window.innerWidth) * 100))
      setPanelSplit(newSplit)
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleDoubleClick = () => {
    setPanelSplit(70)
  }

  // SIMPLIFIED: Initialize with no volumes visible
  useEffect(() => {
    console.log('📋 SIMPLE DEBUG: useEffect[motherFile] triggered')
    console.log('📋 SIMPLE DEBUG: motherFile value:', motherFile)
    
    if (motherFile) {
      console.log('🚀 SIMPLE DEBUG: GLB loaded, waiting for volume list')
      setVisibleGuids(new Set())
      setSelectedVolumeGuid(null)
      console.log('🏢 SIMPLE DEBUG: Initialized with no volumes visible')
    } else {
      console.log('❌ SIMPLE DEBUG: No motherFile, clearing state')
      setAllVolumeGuids([])
      setVisibleGuids(new Set())
      setSelectedVolumeGuid(null)
    }
  }, [motherFile])

  const handleAllVolumesLoad = (all_guids: string[]) => {
    console.log('📦 SIMPLE DEBUG: handleAllVolumesLoad called')
    console.log('📦 SIMPLE DEBUG: Received', all_guids.length, 'total volumes')
    console.log('📦 SIMPLE DEBUG: First 10 GUIDs:', all_guids.slice(0, 10))
    
    const uniqueGuids = [...new Set(all_guids)]
    console.log('🔍 SIMPLE DEBUG: Deduplicating:', all_guids.length, '→', uniqueGuids.length, 'unique GUIDs')
    
    setAllVolumeGuids(uniqueGuids)
    console.log('✅ SIMPLE DEBUG: Volume list updated with', uniqueGuids.length, 'unique items')
  }

  const handleVolumeLoad = (o_dd1_guids: string[]) => {
    console.log('🎯 SIMPLE DEBUG: handleVolumeLoad called - IGNORING for simplified mode')
    console.log('🎯 SIMPLE DEBUG: Would have received:', o_dd1_guids.length, 'O_DD1 volumes')
    console.log('⚠️ SIMPLE DEBUG: Not auto-showing any volumes - user will select manually')
  }

  // SIMPLIFIED: Handle volume selection from 3D viewer
  const handleVolumeSelect = async (volumeData: any, hierarchyInfo?: any) => {
    console.log(`👆 SIMPLE DEBUG: Volume clicked in 3D viewer:`, volumeData?.guid)
    setSelectedVolume(volumeData)
    
    if (hierarchyInfo) {
      setHierarchyData(hierarchyInfo)
    }
    
    console.log(`👆 SIMPLE DEBUG: Volume selected, no drill-down in simple mode`)

    // Fetch Revit data for the selected volume
    if (volumeData?.guid) {
      try {
        const response = await fetch(`/api/assets/revit-metadata?filepath=${volumeData.guid}.glb`)
        const result = await response.json()
        
        if (result.success && result.metadata) {
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
  
  // SIMPLIFIED: Handle volume selection from list panel
  const handleVolumeListSelect = (guid: string) => {
    console.log(`📋 SIMPLE DEBUG: Volume selected from list:`, guid)
    
    setVisibleGuids(new Set([guid]))
    setSelectedVolumeGuid(guid)
    
    console.log(`✅ SIMPLE DEBUG: Now showing only volume:`, guid)
  }

  return (
    <>
      <MenuBar />
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Mother GLB Viewer - Simplified Mode</h1>
              <p className="text-gray-400 mt-1">
                Click volumes from the list to show them individually in 3D
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Simple Volume Mode</span>
              <span className="px-3 py-1 bg-green-600 text-white text-sm rounded">
                Click & Show
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-screen resize-container">
          {/* Left Panel - 3D Viewer */}
          <div className="p-6" style={{ width: `${panelSplit}%` }}>
            <div className="bg-gray-800 rounded-lg h-full">
              {motherFile ? (
                <MotherGLBViewer 
                  modelUrl={motherFile}
                  onVolumeSelect={handleVolumeSelect}
                  onVolumeLoad={handleVolumeLoad}
                  onAllVolumesLoad={handleAllVolumesLoad}
                  visibleGuids={Array.from(visibleGuids)}
                  selectableGuids={Array.from(visibleGuids)}
                  hierarchyLevel={0}
                  shouldZoomToVisible={visibleGuids.size > 0}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <p>No Mother GLB File Loaded</p>
                    <p className="text-sm mt-2">Upload a GLB file to begin exploring volumes</p>
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
            <div className="flex flex-col gap-1">
              <div className="w-0.5 h-1 bg-gray-300 rounded"></div>
              <div className="w-0.5 h-1 bg-gray-300 rounded"></div>
              <div className="w-0.5 h-1 bg-gray-300 rounded"></div>
            </div>
            
            {isResizing && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow">
                {panelSplit}% / {100 - panelSplit}%
              </div>
            )}
          </div>

          {/* Right Panel - SIMPLIFIED Volume List */}
          <div className="border-l border-gray-700 p-6" style={{ width: `${100 - panelSplit}%` }}>
            <div className="space-y-4 h-full overflow-y-auto">
              {/* SIMPLIFIED Volume List Panel */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Volume List ({allVolumeGuids.length})</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setVisibleGuids(new Set(allVolumeGuids))
                        setSelectedVolumeGuid(null)
                        console.log('✅ TEST: Showing ALL', allVolumeGuids.length, 'volumes')
                      }}
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                    >
                      Show All
                    </button>
                    <button
                      onClick={() => {
                        setVisibleGuids(new Set())
                        setSelectedVolumeGuid(null)
                        console.log('❌ TEST: Hiding all volumes')
                      }}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                    >
                      Hide All
                    </button>
                    <button
                      onClick={() => {
                        if (allVolumeGuids.length > 0) {
                          const testGuid = allVolumeGuids[0]
                          setVisibleGuids(new Set([testGuid]))
                          setSelectedVolumeGuid(testGuid)
                          console.log('🧪 TEST: Showing ONLY first volume:', testGuid)
                        }
                      }}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                    >
                      Test First
                    </button>
                    <button
                      onClick={() => {
                        if (allVolumeGuids.length > 5) {
                          const testGuids = allVolumeGuids.slice(0, 5)
                          setVisibleGuids(new Set(testGuids))
                          setSelectedVolumeGuid(null)
                          console.log('🧪 TEST: Showing ONLY first 5 volumes:', testGuids)
                        }
                      }}
                      className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
                    >
                      Test 5
                    </button>
                  </div>
                </div>
                {motherFile && allVolumeGuids.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {allVolumeGuids.map((guid, index) => (
                      <button
                        key={guid}
                        onClick={() => handleVolumeListSelect(guid)}
                        className={`w-full text-left p-2 rounded text-sm transition-colors ${
                          selectedVolumeGuid === guid
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        <div className="font-mono text-xs truncate">
                          {guid}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Volume {index + 1}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    {motherFile ? 'Loading volumes...' : 'Upload a GLB file to see volume list'}
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
                      <div><strong>GUID:</strong> {selectedVolume.guid}</div>
                      <div><strong>Name:</strong> {selectedVolume.name || 'Unknown'}</div>
                    </div>
                  </div>

                  {/* Revit BIM Parameters */}
                  {revitData && revitData.metadata && revitData.metadata.length > 0 ? (
                    <div className="bg-gray-700 p-3 rounded">
                      <h4 className="font-medium text-blue-400 mb-2">
                        Revit Parameters ({revitData.metadata.length})
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {revitData.metadata.map((param: any, index: number) => (
                          <div key={index} className="text-xs">
                            <div className="text-gray-300 font-medium">{param.parameterName}</div>
                            <div className="text-gray-400 ml-2">
                              {param.parameterValue || 'N/A'} 
                              <span className="text-gray-500 ml-1">({param.parameterType || 'Unknown'})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-700 p-3 rounded">
                      <h4 className="font-medium text-gray-400 mb-2">No Revit Data</h4>
                      <p className="text-sm text-gray-500">No BIM parameters found for this volume</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  Click on a volume to view its information and parameters
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-300">Upload New File</h4>
                <div className="flex items-center gap-4">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".glb"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="block w-full text-sm text-gray-300
                        file:mr-4 file:py-2 file:px-4
                        file:rounded file:border-0
                        file:text-sm file:font-semibold
                        file:bg-green-600 file:text-white
                        hover:file:bg-green-700
                        file:cursor-pointer
                        disabled:opacity-50"
                    />
                  </label>
                </div>
                
                {uploading && (
                  <div className="text-sm text-blue-400">
                    ⏳ Uploading file...
                  </div>
                )}
              </div>

              {/* Current File Status */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-300">Current File</h4>
                <div className="bg-gray-700 p-4 rounded">
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-gray-400">File:</span>
                      <span className="ml-2 text-white">{uploadedFileName}</span>
                    </div>
                    {hasExistingFile && (
                      <>
                        <div>
                          <span className="text-gray-400">Status:</span>
                          <span className="ml-2 text-green-400">✅ Persistent file loaded</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Modified:</span>
                          <span className="ml-2 text-gray-300">{fileLastModified}</span>
                        </div>
                        <button
                          onClick={clearPersistentFile}
                          className="mt-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                          🗑️ Clear Persistent File
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-4 right-4">
          <p className="text-xs text-gray-500">designed by Emre</p>
        </div>
      </div>
    </>
  )
}