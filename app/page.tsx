'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import MenuBar from './components/MenuBar'
import ThreeViewer from './components/ThreeViewer'
import PanoramaViewer from './components/PanoramaViewer'
import ExcelUploader from './components/ExcelUploader'
import RevitImporter from './components/RevitImporter'
import BulkUploader from './components/BulkUploader'
import AssetMetadataPanel from './components/AssetMetadataPanel'
import { FileUpload, Tabs, Alert, ProgressBar } from './components/ui'

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('3d')
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [modelInfo, setModelInfo] = useState<{name: string, size: string, type: string, vertices?: number, animations?: number, scenes?: number} | null>(null)
  const [imageInfo, setImageInfo] = useState<{name: string, size: string, type: string, width?: number, height?: number, format?: number} | null>(null)
  const [fileName, setFileName] = useState<string>('No file selected')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showUploadAlert, setShowUploadAlert] = useState(false)
  const [uploadAlertMessage, setUploadAlertMessage] = useState('')
  const [uploadAlertType, setUploadAlertType] = useState<'success' | 'error'>('success')
  const [isUploading, setIsUploading] = useState(false)
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
  
  const handleFileSelect = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    
    const fileName = file.name.toLowerCase()
    const isGLB = fileName.endsWith('.glb')
    const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp')
    
    if (!isGLB && !isImage) {
      setUploadAlertType('error')
      setUploadAlertMessage('Please select a .glb file or an image file (.jpg, .png, .webp)')
      setShowUploadAlert(true)
      return
    }
    
    // Check file size (allow up to 500MB)
    const maxSize = 500 * 1024 * 1024 // 500MB in bytes
    if (file.size > maxSize) {
      setUploadAlertType('error')
      setUploadAlertMessage(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 500MB.`)
      setShowUploadAlert(true)
      return
    }
    
    try {
      setIsUploading(true)
      setUploadProgress(0)
      setShowUploadAlert(false)
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 30, 90))
      }, 200)
      
      // Upload file to server
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      if (!result.success) {
        setUploadAlertType('error')
        setUploadAlertMessage(`Upload failed: ${result.error}`)
        setShowUploadAlert(true)
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
      
      setUploadAlertType('success')
      setUploadAlertMessage(`File "${file.name}" uploaded successfully!`)
      setShowUploadAlert(true)
      
    } catch (error) {
      console.error('Upload error:', error)
      setUploadAlertType('error')
      setUploadAlertMessage('Failed to upload file. Please try again.')
      setShowUploadAlert(true)
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }
  
  const handleModelLoad = useCallback((info: {vertices: number, animations: number, scenes: number}) => {
    setModelInfo((prev) => prev ? ({ ...prev, ...info }) : null)
  }, [])
  
  const handleImageLoad = useCallback((info: {width: number, height: number, format: number}) => {
    setImageInfo((prev) => prev ? ({ ...prev, ...info }) : null)
  }, [])

  // Define tabs for the viewer section
  const viewerTabs = [
    { id: '3d', label: '3D Models', icon: '🎲' },
    { id: 'panorama', label: '360° Panoramas', icon: '🖼️' },
    { id: 'excel', label: 'Excel Data', icon: '📊' },
    { id: 'revit', label: 'Revit Import', icon: '🏗️' },
    { id: 'bulk', label: 'Bulk Upload', icon: '📁' }
  ]
  
  return (
    <>
      <MenuBar />
      <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className="text-4xl font-bold mb-2">
            Connex Next.js Digital Twin Platform v0.4
          </h1>
          <p className="text-gray-300">
            Managing 3D assets with GUIDs, metadata, and real-time streaming
          </p>
        </div>
        
        {/* Upload Section */}
        <div className="mb-6">
          {showUploadAlert && (
            <div className="mb-4">
              <Alert
                type={uploadAlertType}
                message={uploadAlertMessage}
                dismissible
                onDismiss={() => setShowUploadAlert(false)}
              />
            </div>
          )}
          
          <FileUpload
            label="Upload File"
            accept=".glb,.jpg,.jpeg,.png,.webp"
            onFileSelect={handleFileSelect}
            dragAndDrop={true}
            multiple={false}
            disabled={isUploading}
            maxSize={500 * 1024 * 1024}
            helperText="Supported formats: GLB, JPG, PNG, WEBP | Max size: 500MB"
          />
          
          {isUploading && (
            <div className="mt-4">
              <ProgressBar
                progress={uploadProgress}
                label="Uploading file..."
                animated={true}
                showPercentage={true}
              />
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-2">
            Currently viewing: {fileName}
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Viewer Section with Tabs - 60% width */}
          <div className="lg:col-span-3 bg-gray-800 rounded-lg p-6">
            <Tabs
              tabs={viewerTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="green"
              responsive={true}
            >
              {activeTab === '3d' && (
                <div className="h-96">
                  <ThreeViewer 
                    modelUrl={modelUrl} 
                    onModelLoad={handleModelLoad}
                  />
                </div>
              )}
              
              {activeTab === 'panorama' && (
                <div className="h-96">
                  <PanoramaViewer 
                    imageUrl={imageUrl} 
                    onImageLoad={handleImageLoad}
                  />
                </div>
              )}
              
              {activeTab === 'excel' && (
                <div className="h-auto">
                  <ExcelUploader />
                </div>
              )}
              
              {activeTab === 'revit' && (
                <div className="h-auto">
                  <RevitImporter />
                </div>
              )}
              
              {activeTab === 'bulk' && (
                <div className="h-auto">
                  <BulkUploader />
                </div>
              )}
            </Tabs>
          </div>
          
          {/* Asset Metadata Panel (shows asset data for 3D models and panoramas) - 40% width */}
          <div className="lg:col-span-2 h-full">
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
                        : activeTab === 'bulk'
                        ? 'Bulk File Processing'
                        : 'Revit Asset Import'
                      }
                    </span>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <span className="text-gray-400">Size:</span>
                    <span className="ml-2">
                      {activeTab === 'excel' 
                        ? 'Database Storage'
                        : activeTab === 'bulk'
                        ? 'Batch Processing'
                        : 'SQLite Database'
                      }
                    </span>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <span className="text-gray-400">Type:</span>
                    <span className="ml-2">
                      {activeTab === 'excel' 
                        ? 'Excel Spreadsheets'
                        : activeTab === 'bulk'
                        ? 'GLB & Panorama Files'
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
                  ) : activeTab === 'bulk' ? (
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Drop GLB files in public/bulk-upload/glb/ folder</li>
                      <li>• Drop panorama images in public/bulk-upload/panoramas/ folder</li>
                      <li>• Files must start with valid GUID (8-4-4-4-12-8 hex format)</li>
                      <li>• Click "Scan & Process" to move files and create database entries</li>
                      <li>• Existing GUIDs will be updated/overridden with new files</li>
                      <li>• View detailed processing results and error messages</li>
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
      
      {/* Footer */}
      <div className="fixed bottom-4 right-4">
        <p className="text-xs text-gray-500">designed by Emre</p>
      </div>
      </main>
    </>
  )
}