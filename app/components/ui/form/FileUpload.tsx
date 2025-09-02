import { useRef, useState, DragEvent } from 'react'
import { cn } from '@/lib/utils'
import Button from './Button'

interface FileUploadProps {
  accept: string
  maxSize?: number // in bytes
  multiple?: boolean
  onFileSelect: (files: File[]) => void
  dragAndDrop?: boolean
  className?: string
  children?: React.ReactNode
}

export default function FileUpload({ 
  accept, 
  maxSize = 50 * 1024 * 1024, // 50MB default
  multiple = false,
  onFileSelect,
  dragAndDrop = true,
  className,
  children
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string>('')

  const validateFiles = (files: File[]): File[] => {
    setError('')
    const validFiles: File[] = []
    
    for (const file of files) {
      if (file.size > maxSize) {
        setError(`File "${file.name}" is too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(1)}MB`)
        continue
      }
      
      const acceptedTypes = accept.split(',').map(type => type.trim())
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase())
        }
        return file.type.match(type.replace('*', '.*'))
      })
      
      if (!isValidType) {
        setError(`File "${file.name}" is not a supported type. Accepted types: ${accept}`)
        continue
      }
      
      validFiles.push(file)
    }
    
    return validFiles
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    
    const fileArray = Array.from(files)
    const validFiles = validateFiles(fileArray)
    
    if (validFiles.length > 0) {
      onFileSelect(validFiles)
    }
  }

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    if (dragAndDrop) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  if (children) {
    return (
      <div
        className={cn(
          'relative',
          dragAndDrop && 'cursor-pointer',
          className
        )}
        onDragEnter={dragAndDrop ? handleDragEnter : undefined}
        onDragLeave={dragAndDrop ? handleDragLeave : undefined}
        onDragOver={dragAndDrop ? handleDragOver : undefined}
        onDrop={dragAndDrop ? handleDrop : undefined}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        {children}
        {isDragOver && (
          <div className="absolute inset-0 bg-green-600 bg-opacity-20 border-2 border-dashed border-green-500 rounded-lg flex items-center justify-center">
            <p className="text-green-400 font-medium">Drop files here</p>
          </div>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragOver 
            ? 'border-green-500 bg-green-600 bg-opacity-10' 
            : 'border-gray-600 hover:border-gray-500',
          dragAndDrop && 'cursor-pointer'
        )}
        onDragEnter={dragAndDrop ? handleDragEnter : undefined}
        onDragLeave={dragAndDrop ? handleDragLeave : undefined}
        onDragOver={dragAndDrop ? handleDragOver : undefined}
        onDrop={dragAndDrop ? handleDrop : undefined}
        onClick={dragAndDrop ? handleButtonClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <div className="space-y-2">
          <div className="text-gray-400">
            📁
          </div>
          <p className="text-gray-300">
            {dragAndDrop ? 'Drop files here or click to browse' : 'Click to select files'}
          </p>
          <p className="text-sm text-gray-500">
            Accepted: {accept} • Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB
          </p>
        </div>
      </div>
      
      {!dragAndDrop && (
        <Button onClick={handleButtonClick} variant="secondary">
          Choose Files
        </Button>
      )}
      
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}