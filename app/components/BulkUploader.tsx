'use client'

import { useState } from 'react'

interface BulkUploadResult {
  processed: string[]
  errors: string[]
  skipped: string[]
  totalFound: number
}

export default function BulkUploader() {
  const [isScanning, setIsScanning] = useState(false)
  const [results, setResults] = useState<BulkUploadResult | null>(null)

  const handleBulkScan = async () => {
    setIsScanning(true)
    setResults(null)
    
    try {
      const response = await fetch('/api/bulk-upload/scan', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!data.success) {
        alert(`Bulk scan failed: ${data.error}`)
        return
      }
      
      setResults(data.results)
      
    } catch (error) {
      console.error('Bulk scan error:', error)
      alert('Failed to scan bulk uploads. Check console for details.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-3">Bulk File Upload</h2>
        <p className="text-gray-300 text-sm">
          Drop your files in the designated folders, then click scan to process them automatically.
        </p>
      </div>

      {/* Drop Folder Instructions */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="font-semibold mb-3 text-green-400">📁 Drop Folder Locations</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <div>
            <strong>GLB Files:</strong>
            <code className="ml-2 bg-gray-600 px-2 py-1 rounded text-xs">
              {process.cwd ? `${process.cwd()}\\public\\bulk-upload\\glb\\` : 'public/bulk-upload/glb/'}
            </code>
          </div>
          <div>
            <strong>Panorama Images:</strong>
            <code className="ml-2 bg-gray-600 px-2 py-1 rounded text-xs">
              {process.cwd ? `${process.cwd()}\\public\\bulk-upload\\panoramas\\` : 'public/bulk-upload/panoramas/'}
            </code>
          </div>
        </div>
      </div>

      {/* File Naming Requirements */}
      <div className="bg-blue-900/30 border border-blue-600 p-4 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-400">📋 File Naming Requirements</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Files must start with a valid GUID (8-4-4-4-12-8 hex format)</li>
          <li>• Example: <code className="bg-gray-600 px-1 rounded">fe6c1977-334a-4444-8686-196268549145-003d0562.glb</code></li>
          <li>• Example: <code className="bg-gray-600 px-1 rounded">fe6c1977-334a-4444-8686-196268549145-003d0562_360.jpg</code></li>
          <li>• Supported formats: GLB for 3D models, JPG/PNG/WEBP for panoramas</li>
          <li>• Files with existing GUIDs will override the previous version</li>
        </ul>
      </div>

      {/* Scan Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBulkScan}
          disabled={isScanning}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isScanning 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isScanning ? (
            <>
              <span className="inline-block animate-spin mr-2">⟳</span>
              Scanning...
            </>
          ) : (
            '🔍 Scan & Process Files'
          )}
        </button>
        
        {results && (
          <div className="text-sm text-gray-400">
            Last scan: {results.totalFound} files found
          </div>
        )}
      </div>

      {/* Results Display */}
      {results && (
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">📊 Scan Results</h3>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-800 p-3 rounded text-center">
              <div className="text-2xl font-bold text-blue-400">{results.totalFound}</div>
              <div className="text-xs text-gray-400">Files Found</div>
            </div>
            <div className="bg-gray-800 p-3 rounded text-center">
              <div className="text-2xl font-bold text-green-400">{results.processed.length}</div>
              <div className="text-xs text-gray-400">Processed</div>
            </div>
            <div className="bg-gray-800 p-3 rounded text-center">
              <div className="text-2xl font-bold text-yellow-400">{results.skipped.length}</div>
              <div className="text-xs text-gray-400">Skipped</div>
            </div>
            <div className="bg-gray-800 p-3 rounded text-center">
              <div className="text-2xl font-bold text-red-400">{results.errors.length}</div>
              <div className="text-xs text-gray-400">Errors</div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-3">
            {results.processed.length > 0 && (
              <div>
                <h4 className="font-medium text-green-400 mb-2">✅ Successfully Processed ({results.processed.length})</h4>
                <div className="bg-gray-800 p-3 rounded max-h-32 overflow-y-auto">
                  {results.processed.map((item, index) => (
                    <div key={index} className="text-xs text-gray-300 py-1">{item}</div>
                  ))}
                </div>
              </div>
            )}

            {results.skipped.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-400 mb-2">⏭️ Skipped ({results.skipped.length})</h4>
                <div className="bg-gray-800 p-3 rounded max-h-32 overflow-y-auto">
                  {results.skipped.map((item, index) => (
                    <div key={index} className="text-xs text-gray-300 py-1">{item}</div>
                  ))}
                </div>
              </div>
            )}

            {results.errors.length > 0 && (
              <div>
                <h4 className="font-medium text-red-400 mb-2">❌ Errors ({results.errors.length})</h4>
                <div className="bg-gray-800 p-3 rounded max-h-32 overflow-y-auto">
                  {results.errors.map((item, index) => (
                    <div key={index} className="text-xs text-red-300 py-1">{item}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}