'use client'

import { useState, useEffect } from 'react'

interface ExcelFile {
  id: number
  originalName: string
  uploadedAt: string
  status: string
  worksheets: {
    id: number
    sheetName: string
    rowCount: number
    columnCount: number
  }[]
}

export default function ExcelUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [files, setFiles] = useState<ExcelFile[]>([])
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      
      if (result.success) {
        setUploadResult(result)
        setFile(null)
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        // Refresh files list
        fetchFiles()
      } else {
        alert(`Upload failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/upload-excel')
      const result = await response.json()
      
      if (result.success) {
        setFiles(result.files)
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setLoading(false)
    }
  }

  const viewFileData = async (fileId: number) => {
    try {
      const response = await fetch(`/api/excel-data/${fileId}`)
      const result = await response.json()
      
      if (result.success) {
        console.log('File data:', result)
        alert(`File: ${result.file.originalName}\nWorksheets: ${result.worksheets.length}\nCheck console for details`)
      }
    } catch (error) {
      console.error('Error fetching file data:', error)
    }
  }

  // Fetch files on component mount
  useEffect(() => {
    fetchFiles()
  }, [])

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4 text-white">Excel File Upload & Processing</h2>
      
      {/* Upload Section */}
      <div className="mb-6 p-4 bg-gray-700 rounded">
        <h3 className="text-lg font-semibold mb-3 text-gray-200">Upload Excel File</h3>
        
        <div className="flex flex-col gap-3">
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls"
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
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {uploading ? 'Processing...' : 'Upload & Process Excel'}
          </button>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-600 rounded">
          <h4 className="text-lg font-semibold text-green-300 mb-2">Upload Successful!</h4>
          <div className="text-sm text-green-200">
            <p>File ID: {uploadResult.fileId}</p>
            <p>Worksheets processed: {uploadResult.worksheets}</p>
            <p>Message: {uploadResult.message}</p>
          </div>
        </div>
      )}

      {/* Files List */}
      <div className="p-4 bg-gray-700 rounded">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-200">Uploaded Files</h3>
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-500"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {files.length === 0 ? (
          <p className="text-gray-400">No files uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="p-3 bg-gray-600 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-white">{file.originalName}</h4>
                    <p className="text-sm text-gray-300">
                      Uploaded: {new Date(file.uploadedAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-300">
                      Status: <span className={`font-semibold ${
                        file.status === 'COMPLETED' ? 'text-green-400' : 
                        file.status === 'FAILED' ? 'text-red-400' : 
                        'text-yellow-400'
                      }`}>{file.status}</span>
                    </p>
                    {file.worksheets.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-300">Worksheets:</p>
                        <ul className="text-xs text-gray-400 ml-4">
                          {file.worksheets.map((ws) => (
                            <li key={ws.id}>
                              {ws.sheetName} ({ws.rowCount} rows, {ws.columnCount} cols)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => viewFileData(file.id)}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                  >
                    View Data
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}