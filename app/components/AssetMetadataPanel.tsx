'use client'

import { useState, useEffect } from 'react'
import { ParameterType } from '@prisma/client'
import PanoramaViewer from './PanoramaViewer'

interface AssetMetadata {
  id: number
  parameterName: string
  parameterValue: string
  parameterType: ParameterType
}

interface Asset {
  id: number
  guid: string
  name: string | null
  category: string | null
  filePath: string | null
  createdAt: string
  updatedAt: string
  metadata: AssetMetadata[]
}

interface AssetMetadataPanelProps {
  glbFileName?: string | null
  isVisible: boolean
}

export default function AssetMetadataPanel({ glbFileName, isVisible }: AssetMetadataPanelProps) {
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    panorama: true,
    basic: true,
    metadata: true
  })
  const [isPanoramaFile, setIsPanoramaFile] = useState(false)
  const [panoramaUrl, setPanoramaUrl] = useState<string | null>(null)

  const extractGuidFromFileName = (fileName: string): string => {
    // Handle both GLB files (guid.glb) and panorama files (guid_360.jpg)
    return fileName
      .replace(/\.(glb|GLB)$/, '')  // Remove .glb extension
      .replace(/_360\.(jpg|jpeg|png|JPG|JPEG|PNG)$/, '')  // Remove _360.jpg suffix
  }

  const isPanoramaFileName = (fileName: string): boolean => {
    return /_360\.(jpg|jpeg|png|JPG|JPEG|PNG)$/.test(fileName)
  }

  const constructPanoramaUrl = (fileName: string): string => {
    // Convert GLB-style filename to panorama URL
    // Example: "a0edc2ea-5ecb-4332-992e-6785ae78c6c8-003daafc.glb" 
    // becomes: "/assets/panoramas/a0edc2ea-5ecb-4332-992e-6785ae78c6c8-003daafc_360.jpg"
    const guid = extractGuidFromFileName(fileName)
    return `/assets/panoramas/${guid}_360.jpg`
  }

  useEffect(() => {
    const fetchAssetData = async () => {
      if (!glbFileName) {
        setAsset(null)
        setError(null)
        setIsPanoramaFile(false)
        setPanoramaUrl(null)
        return
      }

      // Detect if this is a panorama file and set up panorama URL
      const isPanorama = isPanoramaFileName(glbFileName)
      setIsPanoramaFile(isPanorama)
      
      if (isPanorama) {
        // For panorama files, use the filename directly as the URL
        setPanoramaUrl(`/assets/panoramas/${glbFileName}`)
      } else {
        // For GLB files, try to find corresponding panorama
        const panoramaUrl = constructPanoramaUrl(glbFileName)
        setPanoramaUrl(panoramaUrl)
      }

      setLoading(true)
      setError(null)

      try {
        const guid = extractGuidFromFileName(glbFileName)
        console.log(`Fetching asset data for GUID: ${guid}`)
        
        const response = await fetch(`/api/assets/${encodeURIComponent(guid)}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError(`No asset data found for GLB file: ${glbFileName}`)
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          setAsset(null)
          return
        }

        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch asset data')
        }

        setAsset(data.asset)
        console.log(`Loaded asset data:`, data.asset)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(`Failed to load asset data: ${errorMessage}`)
        setAsset(null)
        console.error('Error fetching asset data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAssetData()
  }, [glbFileName])

  const toggleSection = (section: 'panorama' | 'basic' | 'metadata') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const formatParameterValue = (value: string, type: ParameterType): string => {
    switch (type) {
      case ParameterType.AREA:
        return `${value} m²`
      case ParameterType.VOLUME:
        return `${value} m³`
      case ParameterType.LENGTH:
        return `${value} m`
      case ParameterType.ANGLE:
        return `${value}°`
      case ParameterType.NUMBER:
        // Try to format as number with appropriate decimals
        const num = parseFloat(value)
        return isNaN(num) ? value : num.toLocaleString()
      case ParameterType.BOOLEAN:
        return value.toLowerCase() === 'true' ? 'Yes' : 'No'
      case ParameterType.DATE:
        try {
          return new Date(value).toLocaleDateString()
        } catch {
          return value
        }
      default:
        return value
    }
  }

  const getParameterIcon = (type: ParameterType): string => {
    switch (type) {
      case ParameterType.AREA:
        return '📐'
      case ParameterType.VOLUME:
        return '📦'
      case ParameterType.LENGTH:
        return '📏'
      case ParameterType.ANGLE:
        return '🔄'
      case ParameterType.NUMBER:
        return '🔢'
      case ParameterType.BOOLEAN:
        return '✓'
      case ParameterType.DATE:
        return '📅'
      default:
        return '📝'
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Asset Information</h2>
        {glbFileName && (
          <div className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
            {glbFileName}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          <span className="ml-3 text-gray-300">Loading asset data...</span>
        </div>
      )}

      {error && !loading && (
        <div className="bg-yellow-900/30 border border-yellow-600 text-yellow-300 p-4 rounded-lg">
          <div className="flex items-center">
            <span className="text-lg mr-2">⚠️</span>
            <div>
              <p className="font-medium">Asset Data Not Found</p>
              <p className="text-sm mt-1">{error}</p>
              <p className="text-xs mt-2 text-gray-400">
                Make sure the GLB file is named with its LCX_GUID and the corresponding asset data has been imported via the Revit Import tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && !asset && !glbFileName && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-lg mb-2">No GLB Model Loaded</p>
          <p className="text-sm">
            Upload a GLB file to view its associated asset data and metadata.
          </p>
        </div>
      )}

      {asset && !loading && !error && (
        <div className="space-y-4">
          {/* Panorama Preview */}
          {panoramaUrl && (
            <div className="bg-gray-700 rounded-lg">
              <button
                onClick={() => toggleSection('panorama')}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-600 rounded-lg transition-colors"
              >
                <h3 className="font-medium text-white">
                  {isPanoramaFile ? 'Panorama View' : 'Associated Panorama'}
                  {isPanoramaFile && <span className="ml-2 text-xs bg-blue-600 px-2 py-1 rounded">360°</span>}
                </h3>
                <span className={`transform transition-transform ${expandedSections.panorama ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {expandedSections.panorama && (
                <div className="px-4 pb-4">
                  <div className="bg-black rounded-lg overflow-hidden" style={{ height: '240px' }}>
                    <PanoramaViewer 
                      imageUrl={panoramaUrl}
                      onImageLoad={(info) => {
                        console.log('Panorama loaded:', info)
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {isPanoramaFile 
                      ? 'Interactive 360° panorama view - drag to look around, scroll to zoom'
                      : 'Associated panorama image for this asset'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('basic')}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-600 rounded-lg transition-colors"
            >
              <h3 className="font-medium text-white">Basic Information</h3>
              <span className={`transform transition-transform ${expandedSections.basic ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {expandedSections.basic && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Asset Name</label>
                    <p className="text-white font-medium">{asset.name || 'Unnamed Asset'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Category</label>
                    <p className="text-white">{asset.category || 'Unknown'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide">GUID</label>
                  <p className="text-white font-mono text-sm bg-gray-600 p-2 rounded break-all">
                    {asset.guid}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Created</label>
                    <p className="text-gray-300">{new Date(asset.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Updated</label>
                    <p className="text-gray-300">{new Date(asset.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Parameters */}
          <div className="bg-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('metadata')}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-600 rounded-lg transition-colors"
            >
              <h3 className="font-medium text-white">
                Metadata Parameters ({asset.metadata.length})
              </h3>
              <span className={`transform transition-transform ${expandedSections.metadata ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {expandedSections.metadata && (
              <div className="px-4 pb-4">
                {asset.metadata.length === 0 ? (
                  <p className="text-gray-400 py-4 text-center">No metadata parameters found</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {asset.metadata.map((param) => (
                      <div key={param.id} className="bg-gray-600 rounded p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">{getParameterIcon(param.parameterType)}</span>
                              <span className="text-sm font-medium text-white">
                                {param.parameterName}
                              </span>
                              <span className="text-xs bg-gray-500 text-gray-200 px-2 py-1 rounded">
                                {param.parameterType.toLowerCase()}
                              </span>
                            </div>
                            <p className="text-gray-200 font-mono text-sm">
                              {formatParameterValue(param.parameterValue, param.parameterType)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}