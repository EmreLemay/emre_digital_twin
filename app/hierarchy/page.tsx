'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import MotherGLBViewer from '../components/MotherGLBViewer'

interface AssetNode {
  id: number
  guid: string
  name: string
  category: string
  filePath: string | null
  createdAt: string
  updatedAt: string
  children: AssetNode[]
  depth: number
  hasGLB?: boolean
  hasPanorama?: boolean
  metadata?: Array<{
    id: number
    parameterName: string
    parameterValue: string
    parameterType: string
  }>
}

interface HierarchyData {
  roots: AssetNode[]
  orphans: AssetNode[]
  totalAssets: number
  maxDepth: number
  circularReferences: string[]
}

export default function HierarchyPage() {
  const [hierarchyData, setHierarchyData] = useState<HierarchyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedAsset, setSelectedAsset] = useState<AssetNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredNodes, setFilteredNodes] = useState<AssetNode[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<AssetNode[]>([])
  const [motherFile, setMotherFile] = useState<string | null>(null)

  useEffect(() => {
    fetchHierarchyData()
    checkForMotherGLB()
  }, [])

  const fetchHierarchyData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/assets/hierarchy')
      const result = await response.json()

      if (result.success) {
        setHierarchyData(result.data)
        // Auto-expand root nodes
        const rootGuids = new Set(result.data.roots.map((node: AssetNode) => node.guid))
        setExpandedNodes(rootGuids)
      } else {
        setError(result.error || 'Failed to load hierarchy data')
      }
    } catch (err) {
      setError('Failed to fetch hierarchy data')
      console.error('Error fetching hierarchy data:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkForMotherGLB = async () => {
    try {
      const response = await fetch('/api/mother-glb/check')
      const result = await response.json()
      
      if (result.exists) {
        setMotherFile('/mother-glb/mother.glb')
        console.log('📁 Found mother GLB file for hierarchy viewer')
      } else {
        console.log('📂 No mother GLB file found')
      }
    } catch (error) {
      console.error('Error checking for mother GLB file:', error)
    }
  }

  const toggleExpanded = useCallback((nodeGuid: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeGuid)) {
        newSet.delete(nodeGuid)
      } else {
        newSet.add(nodeGuid)
      }
      return newSet
    })
  }, [])

  const selectAsset = useCallback((asset: AssetNode) => {
    setSelectedAsset(asset)
    // Build breadcrumbs path
    buildBreadcrumbs(asset)
    
    const isODDCategory = asset.metadata?.some(m => m.parameterName === 'O_DD_CATEGORY')
    
    if (isODDCategory) {
      // For O_DD categories, collect all child asset GUIDs recursively
      const childGUIDs = collectAllChildGUIDs(asset)
      console.log(`📁 Selected O_DD category "${asset.name}" with ${childGUIDs.length} child assets:`, childGUIDs)
      // The MotherGLBViewer will handle highlighting all these volumes
    } else if (asset.guid) {
      // For individual assets, highlight just that one
      console.log('🎯 Selected individual asset for 3D highlighting:', asset.guid)
    }
  }, [])

  // Recursively collect all child asset GUIDs from a category node
  const collectAllChildGUIDs = (node: AssetNode): string[] => {
    const guids: string[] = []
    
    const traverse = (currentNode: AssetNode) => {
      if (currentNode.children && currentNode.children.length > 0) {
        currentNode.children.forEach(child => {
          const isChildODDCategory = child.metadata?.some(m => m.parameterName === 'O_DD_CATEGORY')
          if (isChildODDCategory) {
            // If child is also a category, traverse deeper
            traverse(child)
          } else {
            // If child is a real asset, add its GUID
            if (child.guid && !child.guid.startsWith('odd_')) {
              guids.push(child.guid)
            }
          }
        })
      }
    }
    
    traverse(node)
    return guids
  }

  const handleVolumeSelect = useCallback((volumeData: any, hierarchyInfo?: any) => {
    // Handle volume selection from the 3D viewer if needed
    console.log('🎯 Volume selected from 3D viewer:', volumeData?.guid)
  }, [])

  const buildBreadcrumbs = (asset: AssetNode) => {
    const path: AssetNode[] = [asset]
    // This is simplified - in a real implementation, you'd traverse up the tree
    setBreadcrumbs(path)
  }

  const getAssetIcon = (category: string, hasChildren: boolean, node?: AssetNode) => {
    // Check if this is an O_DD virtual category node
    const isODDCategory = node?.metadata?.some(m => m.parameterName === 'O_DD_CATEGORY')
    
    if (isODDCategory) {
      const oddLevel = node?.category?.match(/O_DD Level (\d+)/)?.[1]
      switch (oddLevel) {
        case '1': return '🏗️' // Level 1 - Primary classification
        case '2': return '🔧' // Level 2 - Secondary classification  
        case '3': return '⚙️' // Level 3 - Tertiary classification
        case '4': return '🎯' // Level 4 - Specific classification
        default: return '📋'
      }
    }
    
    if (hasChildren) return '📁' // Folder for parents
    
    switch (category?.toLowerCase()) {
      case 'circulation_vrtcl': return '🛗'
      case 'workspace': return '🏢'
      case 'room': return '🚪'
      case 'circulation_hrzntl': return '🚶'
      case 'functional': return '⚙️'
      default: return '📄'
    }
  }

  const renderTreeNode = (node: AssetNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.guid)
    const hasChildren = node.children.length > 0
    const isSelected = selectedAsset?.guid === node.guid
    const isODDCategory = node.metadata?.some(m => m.parameterName === 'O_DD_CATEGORY')
    const assetCount = node.metadata?.find(m => m.parameterName === 'ASSET_COUNT')?.parameterValue

    return (
      <div key={node.guid} className="select-none">
        <div
          className={`flex items-center py-2 px-2 cursor-pointer rounded transition-colors ${
            isSelected ? 'bg-blue-900/40 border-l-4 border-blue-500' : 
            isODDCategory ? 'hover:bg-purple-800/30' : 'hover:bg-gray-700'
          } ${isODDCategory ? 'bg-purple-900/10' : ''}`}
          style={{ paddingLeft: `${level * 24 + 8}px` }}
          onClick={() => selectAsset(node)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(node.guid)
              }}
              className="w-4 h-4 mr-2 text-gray-400 hover:text-white transition-colors"
            >
              <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>
          ) : (
            <div className="w-4 h-4 mr-2"></div>
          )}

          {/* Asset Icon */}
          <span className="mr-2 text-sm">
            {getAssetIcon(node.category, hasChildren, node)}
          </span>

          {/* Asset Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-medium truncate ${isODDCategory ? 'text-purple-300' : 'text-white'}`}>
                {node.name}
              </span>
              <span className={`text-xs px-1 rounded ${
                isODDCategory ? 'text-purple-200 bg-purple-700' : 'text-gray-400 bg-gray-600'
              }`}>
                {node.category}
              </span>
              {hasChildren && (
                <span className={`text-xs ${isODDCategory ? 'text-purple-400' : 'text-blue-400'}`}>
                  ({node.children.length} children)
                </span>
              )}
              {assetCount && (
                <span className="text-xs text-orange-400 bg-orange-900 px-1 rounded">
                  {assetCount} assets
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {isODDCategory ? 
                node.metadata?.find(m => m.parameterName === 'O_DD_PATH')?.parameterValue || node.guid :
                node.guid
              }
            </div>
          </div>

          {/* Preview Indicators */}
          <div className="flex gap-1 ml-2">
            {node.hasGLB && (
              <span className="text-xs bg-green-600 text-white px-1 rounded" title="Has 3D Model">
                3D
              </span>
            )}
            {node.hasPanorama && (
              <span className="text-xs bg-blue-600 text-white px-1 rounded" title="Has Panorama">
                360°
              </span>
            )}
            {isODDCategory && (
              <span className="text-xs bg-purple-600 text-white px-1 rounded" title="O_DD Category">
                O_DD
              </span>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          <span className="ml-4 text-lg">Loading hierarchy data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Failed to Load Hierarchy</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchHierarchyData}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">O_DD Asset Hierarchy</h1>
            <p className="text-gray-400 mt-1">
              Assets organized by O_DD classification levels (O_DD1 → O_DD2 → O_DD3 → O_DD4)
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Navigation Links */}
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
                href="/data"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Data Management
              </Link>
            </div>
            
            {/* Hierarchy Stats */}
            {hierarchyData && (
              <div className="text-right border-l border-gray-600 pl-4">
                <div className="text-2xl font-bold text-green-400">
                  {hierarchyData.totalAssets}
                </div>
                <div className="text-sm text-gray-400">Total Assets</div>
                <div className="text-sm text-gray-400 mt-1">
                  Max Depth: {hierarchyData.maxDepth} levels
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="Search assets by name or GUID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-screen">
        {/* Left Panel - Tree View (60%) */}
        <div className="w-3/5 p-6 overflow-y-auto">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Selected Asset Path:</div>
              <div className="flex items-center gap-2 text-sm">
                {breadcrumbs.map((asset, index) => (
                  <span key={asset.guid} className="flex items-center gap-2">
                    {index > 0 && <span className="text-gray-500">→</span>}
                    <span className="text-white">{asset.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {hierarchyData && (
            <div className="space-y-6">
              {/* O_DD Classification Tree */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-purple-400">
                    O_DD Classification ({hierarchyData.roots.length} categories)
                  </h3>
                  <div className="flex gap-1 text-xs">
                    <span className="bg-purple-700 px-2 py-1 rounded">🏗️ Level 1</span>
                    <span className="bg-purple-700 px-2 py-1 rounded">🔧 Level 2</span>
                    <span className="bg-purple-700 px-2 py-1 rounded">⚙️ Level 3</span>
                    <span className="bg-purple-700 px-2 py-1 rounded">🎯 Level 4</span>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  {hierarchyData.roots.map(node => renderTreeNode(node))}
                </div>
              </div>

              {/* Assets Without O_DD Classification */}
              {hierarchyData.orphans.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-yellow-400">
                    Assets Without O_DD Classification ({hierarchyData.orphans.length})
                  </h3>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-300 mb-3">
                      These assets don't have O_DD1 parameter values and need to be classified:
                    </p>
                    {hierarchyData.orphans.map(node => renderTreeNode(node))}
                  </div>
                </div>
              )}

              {/* Circular References Warning */}
              {hierarchyData.circularReferences.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-red-400">
                    Circular References ({hierarchyData.circularReferences.length})
                  </h3>
                  <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                    <p className="text-sm text-red-300 mb-2">
                      These assets have circular parent-child relationships:
                    </p>
                    {hierarchyData.circularReferences.map(guid => (
                      <div key={guid} className="text-sm font-mono text-red-400">
                        {guid}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Mother GLB Viewer (40%) */}
        <div className="w-2/5 border-l border-gray-700">
          <div className="p-6 h-full">
            <div className="bg-gray-800 rounded-lg h-full overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-xl font-semibold">3D Building Model</h3>
                <div className="flex items-center gap-2">
                  {selectedAsset && (
                    <span className="text-xs text-blue-300 bg-blue-900 px-2 py-1 rounded">
                      Selected: {selectedAsset.name}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">O_DD Hierarchy Navigation</span>
                </div>
              </div>

              <div className="h-full" style={{ height: 'calc(100% - 60px)' }}>
                {motherFile ? (
                  <MotherGLBViewer 
                    modelUrl={motherFile}
                    onVolumeSelect={handleVolumeSelect}
                    selectedGuids={selectedAsset ? (
                      selectedAsset.metadata?.some(m => m.parameterName === 'O_DD_CATEGORY') 
                        ? collectAllChildGUIDs(selectedAsset)
                        : [selectedAsset.guid]
                    ) : []}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-4">📁</div>
                      <p>No Mother GLB File Found</p>
                      <p className="text-sm mt-2 max-w-md">
                        Upload a mother GLB file in the Mother GLB Viewer page to see the 3D building model here.
                      </p>
                      <Link 
                        href="/mother-viewer"
                        className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                      >
                        Go to Mother GLB Viewer →
                      </Link>
                    </div>
                  </div>
                )}
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
  )
}