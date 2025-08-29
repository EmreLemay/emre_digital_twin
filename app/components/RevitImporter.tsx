'use client'

import { useState, useEffect } from 'react'

interface Asset {
  id: number
  guid: string
  name: string | null
  category: string | null
  parameterCount: number
  createdAt: string
}

interface Category {
  category: string
  count: number
}

interface Summary {
  totalAssets: number
  categories: Category[]
  recentAssets: Asset[]
}

export default function RevitImporter() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/import-revit', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      setImportResult(result)
      
      if (result.success) {
        setFile(null)
        // Reset file input
        const fileInput = document.getElementById('revit-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        // Refresh summary
        fetchSummary()
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportResult({
        success: false,
        message: 'Import failed due to network error',
        errors: ['Network error occurred']
      })
    } finally {
      setImporting(false)
    }
  }

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/import-revit')
      const result = await response.json()
      
      if (result.success) {
        setSummary(result.summary)
      }
    } catch (error) {
      console.error('Error fetching summary:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch summary on component mount
  useEffect(() => {
    fetchSummary()
  }, [])

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4 text-white">Revit Data Import</h2>
      
      {/* Import Section */}
      <div className="mb-6 p-4 bg-gray-700 rounded">
        <h3 className="text-lg font-semibold mb-3 text-gray-200">Import Revit Schedule</h3>
        
        <div className="flex flex-col gap-3">
          <input
            id="revit-file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              file:cursor-pointer"
          />
          
          {file && (
            <div className="text-sm text-gray-300">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
          
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import Revit Data'}
          </button>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className={`mb-6 p-4 rounded border ${
          importResult.success 
            ? 'bg-green-900/30 border-green-600' 
            : 'bg-red-900/30 border-red-600'
        }`}>
          <h4 className={`text-lg font-semibold mb-2 ${
            importResult.success ? 'text-green-300' : 'text-red-300'
          }`}>
            {importResult.success ? 'Import Successful!' : 'Import Failed'}
          </h4>
          <div className={`text-sm ${
            importResult.success ? 'text-green-200' : 'text-red-200'
          }`}>
            <p>{importResult.message}</p>
            {importResult.count !== undefined && (
              <p>Assets imported: {importResult.count}</p>
            )}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold">Errors:</p>
                <ul className="list-disc list-inside max-h-32 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((error: string, index: number) => (
                    <li key={index} className="text-xs">{error}</li>
                  ))}
                  {importResult.errors.length > 10 && (
                    <li className="text-xs">... and {importResult.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assets Summary */}
      <div className="p-4 bg-gray-700 rounded">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-200">Assets Overview</h3>
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-500"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {summary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-600 p-3 rounded">
                <h4 className="font-semibold text-white mb-2">Total Assets</h4>
                <p className="text-2xl font-bold text-green-400">{summary.totalAssets}</p>
              </div>
              
              <div className="bg-gray-600 p-3 rounded">
                <h4 className="font-semibold text-white mb-2">Categories</h4>
                <div className="max-h-24 overflow-y-auto">
                  {summary.categories.slice(0, 5).map((cat, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-300">{cat.category}</span>
                      <span className="text-gray-400">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-600 p-3 rounded">
              <h4 className="font-semibold text-white mb-2">Recent Assets</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {summary.recentAssets.map((asset) => (
                  <div key={asset.id} className="text-sm bg-gray-500 p-2 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{asset.name || 'Unnamed'}</p>
                        <p className="text-gray-300 text-xs">
                          {asset.category} • {asset.parameterCount} parameters
                        </p>
                      </div>
                      <span className="text-gray-400 text-xs">
                        {new Date(asset.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">No assets imported yet.</p>
        )}
      </div>
    </div>
  )
}