'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import MenuBar from '../components/MenuBar'
import { ParameterType } from '@prisma/client'

interface PivotTableRow {
  assetId: number
  assetGuid: string
  assetName: string | null
  assetCategory: string | null
  assetFilePath: string | null
  assetCreatedAt: string
  assetUpdatedAt: string
  [key: string]: any // Dynamic parameter columns
}

type SortField = 'assetName' | 'assetCategory' | 'parameterName' | 'parameterValue' | 'parameterType' | 'assetCreatedAt'
type SortDirection = 'asc' | 'desc'

export default function DataManagementPage() {
  const [data, setData] = useState<PivotTableRow[]>([])
  const [filteredData, setFilteredData] = useState<PivotTableRow[]>([])
  const [parameterNames, setParameterNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<{rowIndex: number, field: string} | null>(null)
  const [editValue, setEditValue] = useState('')
  
  // Filtering and sorting
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('assetName')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
  // Stats
  const [stats, setStats] = useState<{totalAssets: number, totalParameters: number}>({
    totalAssets: 0,
    totalParameters: 0
  })
  
  // Column resizing
  const [isResizing, setIsResizing] = useState(false)
  const [resizingColumn, setResizingColumn] = useState<number | null>(null)

  // Fetch all asset data in pivot format
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/assets/pivot-data')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data')
      }
      
      setData(result.data)
      setParameterNames(result.parameterNames)
      setStats({
        totalAssets: result.totalAssets,
        totalParameters: result.totalParameters
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-fit columns when data loads
  useEffect(() => {
    if (filteredData.length > 0 && parameterNames.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        autoFitColumns()
      }, 100)
    }
  }, [filteredData, parameterNames])

  const autoFitColumns = () => {
    const table = document.querySelector('table.pivot-table')
    if (!table) return

    // Get all header cells
    const headerCells = table.querySelectorAll('thead th')
    
    headerCells.forEach((th, columnIndex) => {
      const thElement = th as HTMLElement
      let maxWidth = 60 // minimum width
      
      // Check header content width
      const headerContent = thElement.textContent || ''
      const headerWidth = measureTextWidth(headerContent, '14px Arial') + 40 // padding
      maxWidth = Math.max(maxWidth, headerWidth)
      
      // Check first few rows of body content to estimate optimal width
      const bodyCells = table.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`)
      const sampleSize = Math.min(10, bodyCells.length) // Check first 10 rows
      
      for (let i = 0; i < sampleSize; i++) {
        const cell = bodyCells[i] as HTMLElement
        const cellContent = cell.textContent || ''
        const cellWidth = measureTextWidth(cellContent, '12px Arial') + 24 // padding for smaller text
        maxWidth = Math.max(maxWidth, cellWidth)
      }
      
      // Apply reasonable limits
      const finalWidth = Math.min(Math.max(maxWidth, 60), 250) // min 60px, max 250px
      
      // Set width on header
      thElement.style.width = `${finalWidth}px`
      
      // Set width on corresponding body cells
      bodyCells.forEach(cell => {
        (cell as HTMLElement).style.width = `${finalWidth}px`
      })
    })
  }

  // Utility function to measure text width
  const measureTextWidth = (text: string, font: string): number => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (context) {
      context.font = font
      return context.measureText(text).width
    }
    return text.length * 8 // fallback estimation
  }

  // Custom column ordering
  const getOrderedParameterNames = (allParameterNames: string[]): string[] => {
    const priorityOrder = [
      'DATA_ROOM_NAME',
      'DATA_ROOM_NUMBER', 
      'O_DD1',
      'O_DD2', 
      'O_DD3',
      'BUILDING NAME',
      'BUILDING_CODE_Applied',
      'BUILDING_YEAR of Construction',
      'LCX_WORKSET',
      'LCX_PARENT_01_GUID',
      'O_DD4',
      'LCX_GUID',
      'VOLUME M3',
      'AREA M2',
      'LCX_PARENT_VOLUME_NAME',
      'VOLUME_NAME',
      'VOLUME_CATEGORY',
      'VOLUME_NUMBER.value'
    ]
    
    // Get priority columns that exist in the data
    const priorityColumns = priorityOrder.filter(param => allParameterNames.includes(param))
    
    // Get remaining columns not in priority list
    const remainingColumns = allParameterNames.filter(param => !priorityOrder.includes(param))
    
    // Return priority columns first, then remaining columns
    return [...priorityColumns, ...remainingColumns]
  }

  // Apply filters and sorting
  useEffect(() => {
    let filtered = data.filter(row => {
      const matchesSearch = searchTerm === '' || 
        row.assetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.assetGuid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        // Search through parameter values
        parameterNames.some(paramName => {
          const value = row[`param_${paramName}`]
          return value && String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      
      const matchesCategory = categoryFilter === '' || row.assetCategory === categoryFilter
      
      return matchesSearch && matchesCategory
    })

    // Sort data
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      
      // Handle null values
      if (aValue === null && bValue === null) return 0
      if (aValue === null) return sortDirection === 'asc' ? 1 : -1
      if (bValue === null) return sortDirection === 'asc' ? -1 : 1
      
      // Convert to string for comparison
      aValue = String(aValue).toLowerCase()
      bValue = String(bValue).toLowerCase()
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredData(filtered)
  }, [data, searchTerm, categoryFilter, sortField, sortDirection, parameterNames])

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Handle inline editing for pivot table
  const startEditing = (rowIndex: number, parameterName: string, currentValue: string) => {
    setEditingCell({ rowIndex, field: parameterName })
    setEditValue(currentValue || '')
  }

  const saveEdit = async () => {
    if (!editingCell) return
    
    const row = filteredData[editingCell.rowIndex]
    const parameterName = editingCell.field
    const parameterId = row[`paramId_${parameterName}`]
    
    if (!parameterId) {
      alert('Cannot edit this parameter')
      setEditingCell(null)
      setEditValue('')
      return
    }
    
    try {
      const response = await fetch(`/api/assets/${row.assetGuid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parameterId: parameterId,
          parameterValue: editValue
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update parameter')
      }
      
      // Update local data
      const updatedData = [...data]
      const dataIndex = updatedData.findIndex(d => d.assetId === row.assetId)
      if (dataIndex !== -1) {
        updatedData[dataIndex][`param_${parameterName}`] = editValue
      }
      setData(updatedData)
      
    } catch (err) {
      console.error('Error updating parameter:', err)
      alert('Failed to update parameter')
    }
    
    setEditingCell(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  // Get unique values for filters
  const uniqueCategories = [...new Set(data.map(row => row.assetCategory).filter(Boolean))]

  const formatParameterValue = (value: string | null, type: ParameterType | null): string => {
    if (!value || !type) return value || ''
    
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  // Column resizing functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || resizingColumn === null) return
      
      const startX = (window as any).__resizeStartX
      const startWidth = (window as any).__resizeStartWidth
      
      if (typeof startX !== 'number' || typeof startWidth !== 'number') return
      
      const columnIndex = resizingColumn
      const th = document.querySelector(`thead th:nth-child(${columnIndex + 1})`) as HTMLElement
      if (!th) return
      
      // Calculate new width based on exact mouse movement from start position
      const mouseDiff = e.clientX - startX
      const newWidth = Math.max(60, startWidth + mouseDiff) // Ensure minimum 60px
      
      // Apply the new width to header
      th.style.width = `${newWidth}px`
      th.style.minWidth = `${newWidth}px`
      th.style.maxWidth = `${newWidth}px`
      
      // Update corresponding body cells to maintain alignment
      const tbody = document.querySelector('tbody')
      if (tbody) {
        const cells = tbody.querySelectorAll(`td:nth-child(${columnIndex + 1})`)
        cells.forEach((cell) => {
          const cellElement = cell as HTMLElement
          cellElement.style.width = `${newWidth}px`
          cellElement.style.minWidth = `${newWidth}px`
          cellElement.style.maxWidth = `${newWidth}px`
        })
      }
      
      // Debug output for troubleshooting
      if (Math.abs(mouseDiff) > 5) {
        console.log(`Resizing: startX=${startX}, currentX=${e.clientX}, diff=${mouseDiff}, startWidth=${startWidth}, newWidth=${newWidth}`)
      }
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      setResizingColumn(null)
      document.body.style.cursor = 'default'
      
      console.log('Mouse up - resize ended')
      
      // Clean up stored values
      ;(window as any).__resizeStartX = undefined
      ;(window as any).__resizeStartWidth = undefined
    }
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'default'
    }
  }, [isResizing, resizingColumn])
  
  const handleResizeStart = (columnIndex: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const th = document.querySelector(`thead th:nth-child(${columnIndex + 1})`) as HTMLElement
    if (th) {
      // Get the actual current width more accurately
      const rect = th.getBoundingClientRect()
      const currentWidth = th.offsetWidth
      
      // Set up the resize state
      setIsResizing(true)
      setResizingColumn(columnIndex)
      
      // Store exact mouse position and current width
      ;(window as any).__resizeStartX = e.clientX
      ;(window as any).__resizeStartWidth = currentWidth
      
      console.log(`Starting resize: column ${columnIndex}, mouse: ${e.clientX}, width: ${currentWidth}, rect: ${rect.width}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <span className="ml-3 text-gray-300">Loading asset data...</span>
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
            <p className="font-medium">Error Loading Data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <MenuBar />
      <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-full mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Asset Data Management</h1>
          <p className="text-gray-300">
            View and edit all asset metadata in one comprehensive table
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{stats.totalAssets}</div>
            <div className="text-sm text-gray-400">Total Assets</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{stats.totalParameters}</div>
            <div className="text-sm text-gray-400">Total Parameters</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">{filteredData.length}</div>
            <div className="text-sm text-gray-400">Filtered Rows</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">{uniqueCategories.length}</div>
            <div className="text-sm text-gray-400">Categories</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search assets, parameters..."
                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-green-500"
              >
                <option value="">All Categories</option>
                {uniqueCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Available Parameters</label>
              <div className="text-sm text-gray-400 p-2 bg-gray-700 rounded border border-gray-600">
                {parameterNames.length} unique parameters
              </div>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={autoFitColumns}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors text-sm"
                title="Auto-fit all columns to content"
              >
                Auto-Fit Columns
              </button>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setCategoryFilter('')
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Pivot Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full pivot-table" style={{minWidth: `${400 + (parameterNames.length * 80)}px`}}>
              <thead className="bg-gray-700">
                <tr>
                  <th 
                    className="text-left p-3 cursor-pointer hover:bg-gray-600 relative"
                    onClick={() => handleSort('assetName')}
                    style={{}}
                  >
                    Asset Name {getSortIcon('assetName')}
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 resize-handle" 
                      onMouseDown={(e) => handleResizeStart(0, e)}
                    ></div>
                  </th>
                  <th 
                    className="text-left p-3 cursor-pointer hover:bg-gray-600 relative"
                    onClick={() => handleSort('assetCategory')}
                    style={{}}
                  >
                    Category {getSortIcon('assetCategory')}
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 resize-handle" 
                      onMouseDown={(e) => handleResizeStart(1, e)}
                    ></div>
                  </th>
                  <th className="text-left p-3 relative">
                    GUID
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 resize-handle" 
                      onMouseDown={(e) => handleResizeStart(2, e)}
                    ></div>
                  </th>
                  {/* Dynamic parameter columns in custom order */}
                  {getOrderedParameterNames(parameterNames).map((paramName, index) => (
                    <th 
                      key={paramName}
                      className="text-left p-3 relative"
                      style={{}}
                    >
                      {paramName}
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 resize-handle" 
                        onMouseDown={(e) => handleResizeStart(3 + index, e)}
                      ></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, rowIndex) => (
                  <tr key={row.assetId} className="border-t border-gray-600 hover:bg-gray-750">
                    <td className="p-3 font-medium overflow-hidden">
                      <div className="truncate">{row.assetName || 'Unnamed Asset'}</div>
                    </td>
                    <td className="p-3 overflow-hidden">
                      <div className="truncate">{row.assetCategory || 'Unknown'}</div>
                    </td>
                    <td className="p-3 font-mono text-xs text-gray-400 overflow-hidden">
                      <div className="truncate" title={row.assetGuid}>{row.assetGuid}</div>
                    </td>
                    {/* Dynamic parameter value columns in custom order */}
                    {getOrderedParameterNames(parameterNames).map((paramName) => {
                      const paramValue = row[`param_${paramName}`]
                      const paramType = row[`paramType_${paramName}`]
                      const paramId = row[`paramId_${paramName}`]
                      
                      return (
                        <td key={paramName} className="p-3 overflow-hidden">
                          {editingCell?.rowIndex === rowIndex && editingCell?.field === paramName ? (
                            <div className="flex gap-2 w-full">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit()
                                  if (e.key === 'Escape') cancelEdit()
                                }}
                                className="bg-gray-600 text-white p-1 rounded border border-gray-500 flex-1 min-w-0"
                                autoFocus
                              />
                              <button onClick={saveEdit} className="text-green-400 hover:text-green-300 flex-shrink-0">✓</button>
                              <button onClick={cancelEdit} className="text-red-400 hover:text-red-300 flex-shrink-0">✕</button>
                            </div>
                          ) : (
                            <div 
                              className={`truncate ${paramId ? "cursor-pointer hover:bg-gray-600 p-1 rounded" : ""}`}
                              onClick={() => paramId && startEditing(rowIndex, paramName, paramValue || '')}
                              title={paramValue ? formatParameterValue(paramValue, paramType) : ''}
                            >
                              {paramValue ? formatParameterValue(paramValue, paramType) : '—'}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredData.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>No data matches the current filters</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-sm font-semibold mb-2 text-gray-300">Instructions:</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Click column headers to sort data</li>
            <li>• Click parameter values to edit them inline</li>
            <li>• Use search and filters to find specific data</li>
            <li>• Press Enter to save edits, Escape to cancel</li>
            <li>• Each row represents one unique asset with all parameters as columns</li>
          </ul>
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