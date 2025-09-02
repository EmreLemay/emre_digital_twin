import { useState } from 'react'
import { cn } from '@/lib/utils'
import LoadingSpinner from '../feedback/LoadingSpinner'

interface Column<T> {
  key: keyof T
  header: string
  sortable?: boolean
  width?: string
  render?: (value: any, row: T, index: number) => React.ReactNode
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T, index: number) => void
  sortable?: boolean
  className?: string
}

type SortDirection = 'asc' | 'desc' | null

export default function Table<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  sortable = true,
  className
}: TableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const handleSort = (column: Column<T>) => {
    if (!sortable || !column.sortable) return

    if (sortColumn === column.key) {
      setSortDirection(current => {
        if (current === 'asc') return 'desc'
        if (current === 'desc') return null
        return 'asc'
      })
    } else {
      setSortColumn(column.key)
      setSortDirection('asc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0

    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    if (aValue === bValue) return 0

    const comparison = aValue < bValue ? -1 : 1
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const getSortIcon = (column: Column<T>) => {
    if (!sortable || !column.sortable) return null
    
    if (sortColumn !== column.key) {
      return <span className="text-gray-500 ml-1">↕️</span>
    }
    
    if (sortDirection === 'asc') return <span className="text-green-400 ml-1">↑</span>
    if (sortDirection === 'desc') return <span className="text-green-400 ml-1">↓</span>
    return <span className="text-gray-500 ml-1">↕️</span>
  }

  if (loading) {
    return (
      <div className={cn('bg-gray-800 rounded-lg p-8', className)}>
        <LoadingSpinner size="md" text="Loading data..." />
      </div>
    )
  }

  return (
    <div className={cn('bg-gray-800 rounded-lg overflow-hidden border border-gray-700', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider',
                    column.sortable && sortable && 'cursor-pointer hover:bg-gray-700 transition-colors',
                    column.width && `w-${column.width}`
                  )}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center">
                    {column.header}
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-4 py-8 text-center text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={index}
                  className={cn(
                    'hover:bg-gray-700 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {columns.map((column) => (
                    <td 
                      key={String(column.key)}
                      className="px-4 py-3 text-sm text-gray-300"
                    >
                      {column.render
                        ? column.render(row[column.key], row, index)
                        : String(row[column.key] || '')
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}