'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

interface ModelInfo {
  vertices: number
  animations: number
  scenes: number
}

interface ThreeViewerProps {
  modelUrl?: string | null
  onModelLoad?: (info: ModelInfo) => void
  autoFit?: boolean // Whether to automatically fit to view when model loads
  unlit?: boolean // Whether to use unlit materials (no lighting effects)
}

// Export the zoom function so parent can call it
let zoomToFitFunction: (() => void) | null = null

export default function ThreeViewer({ modelUrl, onModelLoad, autoFit = true, unlit = false }: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
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
    
    // Clean up any existing renderer first
    if (rendererRef.current) {
      rendererRef.current.dispose()
      if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }
      rendererRef.current = null
    }
    
    // Clear the container completely
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild)
    }
    
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    
    // 1. Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a1a)
    sceneRef.current = scene
    
    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000)
    camera.position.set(5, 3, 5)
    camera.lookAt(0, 0, 0)
    
    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    // Only enable shadows if not in unlit mode
    renderer.shadowMap.enabled = !unlit
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer
    containerRef.current.appendChild(renderer.domElement)
    
    // 4. Create default cube (shown when no model is loaded)
    const geometry = new THREE.BoxGeometry(2, 2, 2)
    const material = unlit 
      ? new THREE.MeshBasicMaterial({ color: 0x00ff88 }) // Unlit material
      : new THREE.MeshStandardMaterial({ 
          color: 0x00ff88,
          roughness: 0.5,
          metalness: 0.5
        })
    const cube = new THREE.Mesh(geometry, material)
    cube.castShadow = !unlit
    cube.receiveShadow = !unlit
    
    // Add cube only if no model URL provided
    if (!modelUrl) {
      scene.add(cube)
      modelRef.current = cube
    }
    
    // 5. Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222)
    scene.add(gridHelper)
    
    // 6. Lighting (conditional based on unlit prop)
    if (unlit) {
      // For unlit mode, use moderate ambient light
      // MeshBasicMaterial doesn't need lighting, but we keep some for other elements
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
      scene.add(ambientLight)
    } else {
      // Normal lighting setup
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      scene.add(ambientLight)
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(5, 10, 5)
      directionalLight.castShadow = true
      directionalLight.shadow.camera.near = 0.1
      directionalLight.shadow.camera.far = 50
      directionalLight.shadow.camera.left = -10
      directionalLight.shadow.camera.right = 10
      directionalLight.shadow.camera.top = 10
      directionalLight.shadow.camera.bottom = -10
      scene.add(directionalLight)
    }
    
    // 7. Load GLB model if URL provided
    if (modelUrl) {
      setIsLoading(true)
      setError(null)
      
      import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
        const loader = new GLTFLoader()
        
        loader.load(
          modelUrl,
          (gltf) => {
            // Remove default cube if it exists
            if (modelRef.current) {
              scene.remove(modelRef.current)
            }
            
            // Add loaded model
            const model = gltf.scene
            
            // Calculate bounding box to center and scale model
            const box = new THREE.Box3().setFromObject(model)
            const center = box.getCenter(new THREE.Vector3())
            const size = box.getSize(new THREE.Vector3())
            
            // Center the model at origin (0,0,0)
            model.position.copy(center.negate())
            
            // Scale to fit (target size of 4 units)
            const maxDim = Math.max(size.x, size.y, size.z)
            const scale = 4 / maxDim
            model.scale.multiplyScalar(scale)
            
            // Configure shadows and materials for all meshes in the model
            model.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                if (unlit) {
                  // In unlit mode, disable shadows and convert to unlit materials
                  child.castShadow = false
                  child.receiveShadow = false
                  
                  // Convert material to MeshBasicMaterial for true unlit rendering
                  if (child.material) {
                    const originalMaterial = child.material as any
                    
                    // Create unlit material preserving original properties
                    child.material = new THREE.MeshBasicMaterial({
                      color: originalMaterial.color || 0xffffff,
                      map: originalMaterial.map || null,
                      transparent: originalMaterial.transparent || false,
                      opacity: originalMaterial.opacity !== undefined ? originalMaterial.opacity : 1.0,
                      side: originalMaterial.side || THREE.FrontSide,
                      alphaTest: originalMaterial.alphaTest || 0,
                      vertexColors: originalMaterial.vertexColors || false
                    })
                  }
                } else {
                  // Normal lighting mode
                  child.castShadow = true
                  child.receiveShadow = true
                }
              }
            })
            
            scene.add(model)
            modelRef.current = model
            setIsLoading(false)
            
            // Notify parent component about the loaded model
            if (onModelLoad) {
              onModelLoad({
                vertices: gltf.scene.children.length,
                animations: gltf.animations.length,
                scenes: gltf.scenes.length
              })
            }
            
            // Auto-fit the camera to the model if autoFit is enabled
            if (autoFit) {
              // Small delay to ensure model is fully added to scene
              setTimeout(() => {
                zoomToFit()
              }, 100)
            }
          },
          (progress) => {
            // Progress callback
            console.log('Loading:', (progress.loaded / progress.total * 100).toFixed(0) + '%')
          },
          (error) => {
            console.error('Error loading model:', error)
            setError('Failed to load 3D model')
            setIsLoading(false)
          }
        )
      })
    }
    
    // 8. Mouse and keyboard controls - hybrid style
    let isLeftMouseDown = false
    let isMiddleMouseDown = false
    let mouseX = 0
    let mouseY = 0
    let rotationX = 0
    let rotationY = 0
    let targetRotationX = 0
    let targetRotationY = 0
    const orbitCenter = new THREE.Vector3(0, 0, 0) // Where camera orbits around
    
    // Keyboard movement
    const keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      q: false,
      e: false
    }
    const moveSpeed = 0.2
    
    const zoomToFit = () => {
      if (!sceneRef.current) return
      
      // Calculate bounding box of all visible objects
      const box = new THREE.Box3()
      
      if (modelRef.current) {
        // Update the world matrix to ensure accurate bounding box
        modelRef.current.updateMatrixWorld(true)
        box.setFromObject(modelRef.current)
      } else {
        // Fallback to default cube if no model loaded
        box.setFromCenterAndSize(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 2, 2))
      }
      
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      
      // Ensure we have a minimum dimension to avoid division by zero
      const effectiveMaxDim = Math.max(maxDim, 0.1)
      
      // Calculate proper distance based on camera field of view with better padding
      const fov = camera.fov * (Math.PI / 180) // Convert to radians
      const distance = (effectiveMaxDim / 2) / Math.tan(fov / 2) * 2.2 // Increased padding for better framing
      
      // Position camera at an optimal angle for better view
      const offset = new THREE.Vector3(
        distance * 0.6,  // X offset (reduced for better centering)
        distance * 0.4,  // Y offset (slightly above)
        distance * 0.8   // Z offset (primary viewing distance)
      )
      
      console.log(`Zoom to fit: center(${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)}), size: ${maxDim.toFixed(1)}, distance: ${distance.toFixed(1)}`)
      
      camera.position.copy(center).add(offset)
      camera.lookAt(center)
      
      // Reset orbit center and rotation targets
      orbitCenter.copy(center)
      targetRotationX = 0
      targetRotationY = 0
      rotationX = 0
      rotationY = 0
      
      console.log(`Camera positioned at (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`)
    }
    
    // Make zoom function available to parent
    zoomToFitFunction = zoomToFit
    
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) { // Left mouse button
        isLeftMouseDown = true
        // Set orbit center to where camera is currently looking
        const direction = new THREE.Vector3()
        camera.getWorldDirection(direction)
        orbitCenter.copy(camera.position).add(direction.multiplyScalar(5)) // 5 units ahead
        
        // Calculate current rotation angles from camera position relative to orbit center
        const offset = camera.position.clone().sub(orbitCenter)
        const distance = offset.length()
        
        // Calculate spherical coordinates
        targetRotationX = rotationX = Math.asin(offset.y / distance)
        targetRotationY = rotationY = Math.atan2(offset.x, offset.z)
      } else if (event.button === 1) { // Middle mouse button
        isMiddleMouseDown = true
        event.preventDefault()
      }
      mouseX = event.clientX
      mouseY = event.clientY
    }
    
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 0) {
        isLeftMouseDown = false
      } else if (event.button === 1) {
        isMiddleMouseDown = false
      }
    }
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!isLeftMouseDown && !isMiddleMouseDown) return
      
      const deltaX = event.clientX - mouseX
      const deltaY = event.clientY - mouseY
      
      mouseX = event.clientX
      mouseY = event.clientY
      
      if (isLeftMouseDown) {
        // Left mouse: orbit around center
        targetRotationY -= deltaX * 0.01
        targetRotationX += deltaY * 0.01
        targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotationX))
      } else if (isMiddleMouseDown) {
        // Middle mouse: pan camera
        const forward = new THREE.Vector3()
        camera.getWorldDirection(forward)
        const right = new THREE.Vector3()
        right.crossVectors(forward, camera.up).normalize()
        const up = camera.up.clone()
        
        camera.position.add(right.multiplyScalar(-deltaX * 0.01))
        camera.position.add(up.multiplyScalar(deltaY * 0.01))
      }
    }
    
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      // Move forward/backward based on camera direction (reversed)
      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)
      const moveDistance = -event.deltaY * 0.01
      camera.position.add(direction.multiplyScalar(moveDistance))
    }
    
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key in keys) {
        keys[key as keyof typeof keys] = true
        event.preventDefault()
      } else if (key === 'f') {
        console.log('F key pressed! Calling zoomToFit()')
        zoomToFit()
        event.preventDefault()
      }
    }
    
    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key in keys) {
        keys[key as keyof typeof keys] = false
        event.preventDefault()
      }
    }
    
    const updateCameraMovement = () => {
      // Get camera's forward and right vectors
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      const right = new THREE.Vector3()
      right.crossVectors(forward, camera.up).normalize()
      
      // Apply movement based on keys
      if (keys.w) camera.position.add(forward.clone().multiplyScalar(moveSpeed))
      if (keys.s) camera.position.add(forward.clone().multiplyScalar(-moveSpeed))
      if (keys.a) camera.position.add(right.clone().multiplyScalar(-moveSpeed))
      if (keys.d) camera.position.add(right.clone().multiplyScalar(moveSpeed))
      if (keys.q) camera.position.y -= moveSpeed
      if (keys.e) camera.position.y += moveSpeed
    }
    
    const element = renderer.domElement
    element.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('wheel', handleWheel)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    // 9. Animation loop
    let animationId: number
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      
      // Update camera movement
      updateCameraMovement()
      
      // Apply orbit rotation ONLY when left mouse is being dragged
      if (isLeftMouseDown) {
        // Smooth camera orbit rotation
        rotationX += (targetRotationX - rotationX) * 0.1
        rotationY += (targetRotationY - rotationY) * 0.1
        
        const distance = camera.position.distanceTo(orbitCenter)
        const offset = new THREE.Vector3(
          Math.sin(rotationY) * Math.cos(rotationX) * distance,
          Math.sin(rotationX) * distance,
          Math.cos(rotationY) * Math.cos(rotationX) * distance
        )
        camera.position.copy(orbitCenter).add(offset)
        camera.lookAt(orbitCenter)
      }
      
      renderer.render(scene, camera)
    }
    animate()
    
    // 10. Handle resize
    const handleResize = () => {
      if (!containerRef.current) return
      const newWidth = containerRef.current.clientWidth
      const newHeight = containerRef.current.clientHeight
      
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      element.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      
      geometry.dispose()
      material.dispose()
      
      if (containerRef.current && renderer.domElement && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
      
      renderer.dispose()
      rendererRef.current = null
      sceneRef.current = null
      modelRef.current = null
      zoomToFitFunction = null
    }
  }, [modelUrl])
  
  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef} 
        className="w-full h-full rounded bg-gray-700 cursor-grab active:cursor-grabbing"
        style={{ minHeight: '400px' }}
      />
      
      {/* Control buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => zoomToFitFunction?.()}
          className="bg-gray-800/80 hover:bg-gray-700 text-white p-2 rounded transition-colors"
          title="Zoom to Fit (F key)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h3a1 1 0 000 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V7a1 1 0 11-2 0V4zM16 4a1 1 0 00-1-1h-3a1 1 0 100 2h1.586l-2.293 2.293a1 1 0 001.414 1.414L15 6.414V7a1 1 0 102 0V4zM4 16a1 1 0 001 1h3a1 1 0 100-2H6.414l2.293-2.293a1 1 0 00-1.414-1.414L5 13.586V13a1 1 0 10-2 0v3zM16 16a1 1 0 00-1 1h-3a1 1 0 100-2h1.586l-2.293-2.293a1 1 0 001.414-1.414L15 13.586V13a1 1 0 102 0v3z"/>
          </svg>
        </button>
        <button
          onClick={toggleFullscreen}
          className="bg-gray-800/80 hover:bg-gray-700 text-white p-2 rounded transition-colors"
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
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded">
          <div className="text-white">Loading 3D model...</div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/20 border border-red-500 text-red-300 p-3 rounded">
          {error}
        </div>
      )}
    </div>
  )
}