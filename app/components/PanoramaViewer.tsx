'use client'

import { useEffect, useRef, useState } from 'react'
import { Viewer } from '@photo-sphere-viewer/core'
import '@photo-sphere-viewer/core/index.css'

interface ImageInfo {
  width: number
  height: number
  format: number
}

interface PanoramaViewerProps {
  imageUrl?: string | null
  onImageLoad?: (info: ImageInfo) => void
}

export default function PanoramaViewer({ imageUrl, onImageLoad }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err)
      })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      })
    }
  }
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])
  
  useEffect(() => {
    if (!containerRef.current) return
    
    // Clean up existing viewer
    if (viewerRef.current) {
      viewerRef.current.destroy()
      viewerRef.current = null
    }
    
    if (imageUrl) {
      setIsLoading(true)
      setError(null)
      
      console.log('PanoramaViewer: Loading image from URL:', imageUrl)
      
      // First, test if the image is accessible
      const img = new Image()
      img.onload = () => {
        console.log('PanoramaViewer: Image preload successful')
        try {
          // Initialize Photo Sphere Viewer
          viewerRef.current = new Viewer({
          container: containerRef.current,
          panorama: imageUrl,
          loadingImg: undefined,
          touchmoveTwoFingers: true,
          mousewheelCtrlKey: false,
          defaultZoomLvl: 0, // Start at normal zoom level
          minFov: 40,
          maxFov: 110,
          defaultPitch: 0,
          defaultYaw: 0,
          fisheye: false,
          moveSpeed: 1.0,
          zoomSpeed: 1.0,
          navbar: [
            'zoom',
            'download',
            'fullscreen'
          ],
          size: {
            width: '100%',
            height: '100%'
          },
          plugins: []
        })
        
        // Event handlers
        viewerRef.current.addEventListener('ready', () => {
          setIsLoading(false)
          
          if (onImageLoad) {
            // Create a temporary image to get dimensions
            const img = new Image()
            img.onload = () => {
              onImageLoad({
                width: img.width,
                height: img.height,
                format: 1 // RGB format
              })
            }
            img.src = imageUrl
          }
        })
        
        viewerRef.current.addEventListener('panorama-error', (err: any) => {
          console.error('Photo Sphere Viewer error:', err)
          console.error('Failed to load panorama from URL:', imageUrl)
          setError('Failed to load panorama image')
          setIsLoading(false)
        })
        
        } catch (err) {
          console.error('Error initializing panorama viewer:', err)
          setError('Failed to initialize panorama viewer')
          setIsLoading(false)
        }
      }
      
      img.onerror = () => {
        console.error('PanoramaViewer: Image preload failed for URL:', imageUrl)
        setError('Failed to load panorama image - file not accessible')
        setIsLoading(false)
      }
      
      img.src = imageUrl
    }
    
    // Cleanup function
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [imageUrl])
  
  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef} 
        className="w-full h-full rounded bg-black overflow-hidden"
        style={{ 
          minHeight: '400px',
          aspectRatio: '16/9'
        }}
      />
      
      {/* Control buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={toggleFullscreen}
          className="bg-gray-800/80 hover:bg-gray-700 text-white p-2 rounded transition-colors z-10"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 3h4v2H5v2H3V3zm10 0h4v4h-2V5h-2V3zM3 13v4h4v-2H5v-2H3zm14 0v2h-2v2h-4v-2h2v-2h4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 3v4h2V5h2V3H3zm4 10H5v2h2v2H3v-4h4zm10-10v4h-2V5h-2V3h4zm-4 10v2h-2v2h4v-4h-2z"/>
            </svg>
          )}
        </button>
      </div>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded z-10">
          <div className="text-white">Loading panorama image...</div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/20 border border-red-500 text-red-300 p-3 rounded z-10">
          {error}
        </div>
      )}
      
      {/* No image message */}
      {!imageUrl && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-gray-400 bg-gray-800/80 px-6 py-4 rounded-lg">
            <div className="text-lg font-semibold mb-2">No Panorama Loaded</div>
            <div className="text-sm">Upload a 360° panoramic image to view it here</div>
          </div>
        </div>
      )}
    </div>
  )
}