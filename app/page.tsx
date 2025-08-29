'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ThreeViewer from './components/ThreeViewer'
import PanoramaViewer from './components/PanoramaViewer'
import ExcelUploader from './components/ExcelUploader'
import RevitImporter from './components/RevitImporter'
import AssetMetadataPanel from './components/AssetMetadataPanel'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'3d' | 'panorama' | 'excel' | 'revit'>('3d')
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [modelInfo, setModelInfo] = useState<{name: string, size: string, type: string, vertices?: number, animations?: number, scenes?: number} | null>(null)
  const [imageInfo, setImageInfo] = useState<{name: string, size: string, type: string, width?: number, height?: number, format?: number} | null>(null)
  const [fileName, setFileName] = useState<string>('No file selected')
  const searchParams = useSearchParams()

  // Load file from asset library if URL params are present
  useEffect(() => {
    const fileParam = searchParams.get('file')
    const typeParam = searchParams.get('type')
    
    if (fileParam && typeParam) {
      const filename = fileParam.split('/').pop() || 'Unknown file'
      setFileName(filename)
      
      if (typeParam === 'glb') {
        setModelUrl(fileParam)
        setImageUrl(null)
        setActiveTab('3d')
        setModelInfo({
          name: filename,
          size: 'Loading...',
          type: 'model/gltf-binary'
        })
      } else if (typeParam === 'panorama') {
        setImageUrl(fileParam)
        setModelUrl(null)
        setActiveTab('panorama')
        setImageInfo({
          name: filename,
          size: 'Loading...',
          type: 'image'
        })
      }
    }
  }, [searchParams])
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const fileName = file.name.toLowerCase()
    const isGLB = fileName.endsWith('.glb')
    const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp')
    
    if (!isGLB && !isImage) {
      alert('Please select a .glb file or an image file (.jpg, .png, .webp)')
      return
    }
    
    // Check file size (allow up to 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB in bytes
    if (file.size > maxSize) {
      alert(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 100MB.`)
      return
    }
    
    try {
      // Upload file to server
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (!result.success) {
        alert(`Upload failed: ${result.error}`)
        return
      }
      
      console.log(`File uploaded successfully: ${result.publicPath}`)
      setFileName(file.name)
      
      if (isGLB) {
        console.log(`Loading GLB file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        setModelUrl(result.publicPath)
        setImageUrl(null)
        setActiveTab('3d')
        setModelInfo({
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          type: file.type || 'model/gltf-binary'
        })
      } else if (isImage) {
        console.log(`Loading panorama image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        setImageUrl(result.publicPath)
        setModelUrl(null)
        setActiveTab('panorama')
        setImageInfo({
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          type: file.type || 'image'
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload file. Please try again.')
    }
  }
  
  const handleModelLoad = useCallback((info: {vertices: number, animations: number, scenes: number}) => {
    setModelInfo((prev) => prev ? ({ ...prev, ...info }) : null)
  }, [])
  
  const handleImageLoad = useCallback((info: {width: number, height: number, format: number}) => {
    setImageInfo((prev) => prev ? ({ ...prev, ...info }) : null)
  }, [])
  
  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Revit Digital Twin Platform
            </h1>
            <p className="text-gray-300">
              Managing 3D assets with GUIDs, metadata, and real-time streaming
            </p>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/assets"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              Asset Library →
            </Link>
            <Link 
              href="/data"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              Data Management →
            </Link>
          </div>
        </div>
        
        {/* Upload Section */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4">
          <label className="block">
            <span className="text-sm text-gray-400 mb-2 block">Upload File:</span>
            <input
              type="file"
              accept=".glb,.jpg,.jpeg,.png,.webp"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-300
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-green-600 file:text-white
                hover:file:bg-green-700
                file:cursor-pointer"
            />
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Currently viewing: {fileName} | Supported: .glb, .jpg, .png, .webp
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Viewer Section with Tabs */}
          <div className="bg-gray-800 rounded-lg p-6">
            {/* Tab Headers */}
            <div className="flex mb-4 border-b border-gray-600">
              <button
                onClick={() => setActiveTab('3d')}
                className={`px-4 py-2 mr-2 rounded-t transition-colors ${
                  activeTab === '3d' 
                    ? 'bg-green-600 text-white border-b-2 border-green-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                3D Models
              </button>
              <button
                onClick={() => setActiveTab('panorama')}
                className={`px-4 py-2 mr-2 rounded-t transition-colors ${
                  activeTab === 'panorama' 
                    ? 'bg-green-600 text-white border-b-2 border-green-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                360° Panoramas
              </button>
              <button
                onClick={() => setActiveTab('excel')}
                className={`px-4 py-2 mr-2 rounded-t transition-colors ${
                  activeTab === 'excel' 
                    ? 'bg-green-600 text-white border-b-2 border-green-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Excel Data
              </button>
              <button
                onClick={() => setActiveTab('revit')}
                className={`px-4 py-2 rounded-t transition-colors ${
                  activeTab === 'revit' 
                    ? 'bg-green-600 text-white border-b-2 border-green-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Revit Import
              </button>
            </div>
            
            {/* Tab Content */}
            <div className={`${activeTab === 'excel' || activeTab === 'revit' ? 'h-auto' : 'h-96'}`}>
              {activeTab === '3d' ? (
                <ThreeViewer 
                  modelUrl={modelUrl} 
                  onModelLoad={handleModelLoad}
                />
              ) : activeTab === 'panorama' ? (
                <PanoramaViewer 
                  imageUrl={imageUrl} 
                  onImageLoad={handleImageLoad}
                />
              ) : activeTab === 'excel' ? (
                <ExcelUploader />
              ) : (
                <RevitImporter />
              )}
            </div>
          </div>
          
          {/* Asset Metadata Panel (shows asset data for 3D models and panoramas) */}
          <div className="h-full">
            {activeTab === '3d' ? (
              <AssetMetadataPanel 
                glbFileName={modelInfo?.name || null}
                isVisible={true}
              />
            ) : activeTab === 'panorama' ? (
              <AssetMetadataPanel 
                glbFileName={imageInfo?.name || null}
                isVisible={true}
              />
            ) : (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-3">Information</h2>
                <div className="space-y-3">
                  <div className="bg-gray-700 p-3 rounded">
                    <span className="text-gray-400">File:</span> 
                    <span className="ml-2">
                      {activeTab === 'excel' 
                        ? 'Excel Data Management'
                        : 'Revit Asset Import'
                      }
                    </span>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <span className="text-gray-400">Size:</span>
                    <span className="ml-2">
                      {activeTab === 'excel' 
                        ? 'Database Storage'
                        : 'SQLite Database'
                      }
                    </span>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <span className="text-gray-400">Type:</span>
                    <span className="ml-2">
                      {activeTab === 'excel' 
                        ? 'Excel Spreadsheets'
                        : 'Revit Schedules'
                      }
                    </span>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <span className="text-gray-400">Status:</span>
                    <span className="ml-2 text-green-400">Ready</span>
                  </div>
                </div>
                
                {/* Instructions */}
                <div className="mt-6 p-4 bg-gray-700 rounded">
                  <h3 className="text-sm font-semibold mb-2 text-gray-300">Controls:</h3>
                  {activeTab === 'excel' ? (
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Upload Excel files (.xlsx, .xls) for data processing</li>
                      <li>• All data is automatically parsed and stored in database</li>
                      <li>• View uploaded files and their processing status</li>
                      <li>• Click "View Data" to see file contents and worksheets</li>
                      <li>• Each worksheet is stored with full row/column data</li>
                      <li>• API endpoints available for data querying</li>
                    </ul>
                  ) : (
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Upload Revit schedule files (.xlsx, .xls, .csv)</li>
                      <li>• Automatically extracts GUIDs, names, and parameters</li>
                      <li>• Creates asset database with metadata relationships</li>
                      <li>• Links 3D models to Revit element data</li>
                      <li>• Supports all Revit parameter types (dimensions, materials, etc.)</li>
                      <li>• Handles multiple categories and family types</li>
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}