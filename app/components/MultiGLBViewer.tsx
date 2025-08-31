'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'

interface ModelInfo {
  totalModels: number
  totalVertices: number
  totalAnimations: number
  loadedCount: number
}

interface LoadedModel {
  url: string
  guid: string
  name: string
  model: THREE.Object3D
  originalMaterials: Map<THREE.Mesh, THREE.Material>
}

interface MultiGLBViewerProps {
  modelUrls: string[]
  onModelsLoad?: (info: ModelInfo) => void
  onModelSelect?: (guid: string | null) => void
  selectedGuid?: string | null
  zoomTrigger?: {guid: string, timestamp: number} | null
}

export default function MultiGLBViewer({ modelUrls, onModelsLoad, onModelSelect, selectedGuid, zoomTrigger }: MultiGLBViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const loadedModelsRef = useRef<LoadedModel[]>([])
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedGuidInternal, setSelectedGuidInternal] = useState<string | null>(null)
  const [hasAutoFitted, setHasAutoFitted] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  
  // Handle external selection changes (when user clicks on list items)
  useEffect(() => {
    console.log('MultiGLBViewer selection effect:', { selectedGuid, selectedGuidInternal, modelsLoaded })
    if (selectedGuid !== undefined && selectedGuid !== selectedGuidInternal) {
      console.log('Updating internal selection to:', selectedGuid)
      setSelectedGuidInternal(selectedGuid)
      // Only highlight if models are loaded
      if (modelsLoaded) {
        console.log('Models loaded, calling highlightModel immediately with:', selectedGuid)
        // Force immediate highlighting by calling it directly
        highlightModel(selectedGuid)
      } else {
        console.log('Models not loaded yet, will highlight later')
      }
    }
  }, [selectedGuid, modelsLoaded, selectedGuidInternal])

  // Apply selection highlighting after models are loaded
  useEffect(() => {
    console.log('Models loaded effect:', { modelsLoaded, selectedGuidInternal })
    if (modelsLoaded && selectedGuidInternal) {
      console.log('Applying deferred highlight for:', selectedGuidInternal)
      highlightModel(selectedGuidInternal)
    }
  }, [modelsLoaded, selectedGuidInternal])

  // Handle zoom triggers from double-click
  useEffect(() => {
    console.log('zoomTrigger useEffect:', { zoomTrigger, modelsLoaded })
    if (zoomTrigger && modelsLoaded) {
      console.log('Double-click zoom triggered for:', zoomTrigger.guid, 'at', zoomTrigger.timestamp)
      zoomToModel(zoomTrigger.guid)
    } else if (zoomTrigger && !modelsLoaded) {
      console.log('Zoom requested but models not loaded yet')
    }
  }, [zoomTrigger, modelsLoaded])
  
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
  
  // Create stable URLs string for dependency comparison
  const modelUrlsKey = modelUrls.join('|')
  
  useEffect(() => {
    if (!containerRef.current || modelUrls.length === 0) return
    
    console.log('MultiGLBViewer useEffect triggered with', modelUrls.length, 'URLs')
    console.log('Previous loaded models count:', loadedModelsRef.current.length)
    
    // STRONGER GUARD: Prevent concurrent loading AND double-execution
    if (isLoading || loadedModelsRef.current.length > 0) {
      console.log('Already loading or models already loaded, skipping...')
      return
    }
    
    // Add cancellation flag for async operations
    let cancelled = false
    
    const setupViewer = async () => {
      if (cancelled) return
      
      // Prevent concurrent loading
      setIsLoading(true)
      console.log('Starting viewer setup...')
      
      // Clean up any existing renderer first
      if (rendererRef.current) {
        rendererRef.current.dispose()
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode === containerRef.current && containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement)
        }
        rendererRef.current = null
      }
      
      // Clear the container completely
      while (containerRef.current && containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild)
      }
      
      // Clear previous models
      loadedModelsRef.current = []
      setHasAutoFitted(false)
      setModelsLoaded(false)
      console.log('Cleared loaded models, starting fresh')
      
      if (cancelled || !containerRef.current) return
      
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      
      // 1. Scene setup
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x1a1a1a)
      sceneRef.current = scene
      
      // 2. Camera setup
      const camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000)
      camera.position.set(10, 8, 10)
      camera.lookAt(0, 0, 0)
      cameraRef.current = camera
      
      if (cancelled) return
      
      // 3. Renderer setup
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(width, height)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      rendererRef.current = renderer
      if (containerRef.current) {
        containerRef.current.appendChild(renderer.domElement)
      }
      
      if (cancelled) return
      
      // 4. Grid helper
      const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222)
      scene.add(gridHelper)
      
      // 5. Lighting - Much brighter for better visibility
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8) // Increased from 0.6
      scene.add(ambientLight)
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 2.2) // Further increased from 1.6
      directionalLight.position.set(10, 20, 10)
      directionalLight.castShadow = true
      directionalLight.shadow.camera.near = 0.1
      directionalLight.shadow.camera.far = 100
      directionalLight.shadow.camera.left = -20
      directionalLight.shadow.camera.right = 20
      directionalLight.shadow.camera.top = 20
      directionalLight.shadow.camera.bottom = -20
      scene.add(directionalLight)

      // Top-left sunlight for dramatic lighting
      const sunlight = new THREE.DirectionalLight(0xfffacd, 3.0) // Warm sunlight color with high intensity
      sunlight.position.set(-15, 25, 15) // Top-left position
      sunlight.castShadow = true
      sunlight.shadow.mapSize.width = 2048
      sunlight.shadow.mapSize.height = 2048
      sunlight.shadow.camera.near = 0.1
      sunlight.shadow.camera.far = 150
      sunlight.shadow.camera.left = -30
      sunlight.shadow.camera.right = 30
      sunlight.shadow.camera.top = 30
      sunlight.shadow.camera.bottom = -30
      sunlight.shadow.bias = -0.0001
      scene.add(sunlight)
      
      // 6. Load all GLB models with cancellation check
      console.log('TEST: About to check modelUrls.length:', modelUrls.length)
      if (modelUrls.length > 0 && !cancelled) {
        console.log('TEST: Calling loadAllModels with URLs:', modelUrls)
        await loadAllModels(scene, camera, modelUrls, () => cancelled)
      } else {
        console.log('TEST: No URLs to load - modelUrls is empty or cancelled')
        setIsLoading(false)
      }
      
      if (cancelled) return
      
      // 7. Controls setup
      setupControls(camera, renderer.domElement)
      
      if (cancelled) return
      
      // 8. Animation loop
      let animationId: number
      const animate = () => {
        if (cancelled) return
        animationId = requestAnimationFrame(animate)
        updateCameraMovement()
        renderer.render(scene, camera)
      }
      animate()
      
      // 9. Handle resize
      const handleResize = () => {
        if (!containerRef.current || cancelled) return
        const newWidth = containerRef.current.clientWidth
        const newHeight = containerRef.current.clientHeight
        
        camera.aspect = newWidth / newHeight
        camera.updateProjectionMatrix()
        renderer.setSize(newWidth, newHeight)
      }
      window.addEventListener('resize', handleResize)
      
      // Store cleanup for this setup
      return () => {
        cancelAnimationFrame(animationId)
        window.removeEventListener('resize', handleResize)
        cleanupControls()
        
        if (containerRef.current && renderer.domElement && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement)
        }
        
        renderer.dispose()
      }
    }
    
    setupViewer()
    
    // Cleanup function to cancel ongoing operations
    return () => {
      console.log('useEffect cleanup - cancelling operations')
      cancelled = true
      rendererRef.current = null
      sceneRef.current = null
      loadedModelsRef.current = []
      cameraRef.current = null
    }
  }, [modelUrlsKey])

  const loadAllModels = async (scene: THREE.Scene, camera: THREE.PerspectiveCamera, urls: string[], isCancelled: () => boolean) => {
    if (isCancelled()) return
    
    console.log('TEST: loadAllModels called with', urls.length, 'URLs')
    setError(null)
    setLoadProgress({ loaded: 0, total: urls.length })
    
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const loader = new GLTFLoader()
      
      let totalVertices = 0
      let totalAnimations = 0
      let loadedCount = 0
      
      // Load models in parallel - preserve original positions and scales
      const loadPromises = urls.map((url, index) => {
        return new Promise<void>((resolve, reject) => {
          if (isCancelled()) {
            resolve()
            return
          }
          
          loader.load(
            url,
            (gltf) => {
              if (isCancelled()) {
                resolve()
                return
              }
              const model = gltf.scene
              
              // Extract GUID from filename - consistent with multi-viewer page
              const filename = url.split('/').pop() || ''
              // Use the full filename (without extensions) as the unique identifier
              const guid = filename
                .replace(/\.(glb|GLB)$/, '')  // Remove .glb extension
                .replace(/_360\.(jpg|jpeg|png|JPG|JPEG|PNG)$/, '')  // Remove _360.jpg suffix
                .toLowerCase()
              const name = filename
                .replace(/\.(glb|GLB)$/, '')  // Remove .glb extension
                .replace(/_360\.(jpg|jpeg|png|JPG|JPEG|PNG)$/, '')  // Remove _360.jpg suffix
              
              // Store original materials for highlighting
              const originalMaterials = new Map<THREE.Mesh, THREE.Material>()
              
              // DO NOT modify position or scale - preserve original Houdini coordinates
              // These building components are positioned to fit together perfectly
              
              // Enable shadows and store materials for all meshes
              model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.castShadow = true
                  child.receiveShadow = true
                  
                  // Store cloned original material for highlighting to avoid reference issues
                  if (child.material) {
                    const originalMaterial = child.material.clone ? child.material.clone() : child.material
                    originalMaterials.set(child, originalMaterial)
                  }
                  
                  // Add GUID as userData for raycasting
                  child.userData.guid = guid
                  child.userData.modelIndex = index
                }
              })
              
              // Store loaded model info
              const loadedModel: LoadedModel = {
                url,
                guid,
                name,
                model,
                originalMaterials
              }
              
              scene.add(model)
              loadedModelsRef.current.push(loadedModel)
              console.log('=== MODEL LOADED ===')
              console.log('URL:', url)
              console.log('Filename:', filename)
              console.log('Extracted GUID:', guid)
              console.log('Model name:', name)
              console.log('Total loaded models now:', loadedModelsRef.current.length)
              
              // Count vertices and animations
              totalVertices += gltf.scene.children.length
              totalAnimations += gltf.animations.length
              loadedCount++
              
              setLoadProgress({ loaded: loadedCount, total: urls.length })
              resolve()
            },
            (progress) => {
              // Progress callback for individual model
              console.log(`Loading model ${index + 1}: ${(progress.loaded / progress.total * 100).toFixed(0)}%`)
            },
            (error) => {
              console.error(`Error loading model ${index + 1}:`, error)
              loadedCount++
              setLoadProgress({ loaded: loadedCount, total: urls.length })
              resolve() // Don't reject, just skip this model
            }
          )
        })
      })
      
      // Wait for all models to load
      await Promise.all(loadPromises)
      
      if (isCancelled()) return
      
      // Auto-fit camera to show all models (only once)
      if (!hasAutoFitted && !isCancelled()) {
        zoomToFitAll(scene, camera)
        setHasAutoFitted(true)
      }
      
      if (isCancelled()) return
      
      // Mark models as loaded
      setModelsLoaded(true)
      
      // Debug: Log all loaded model GUIDs
      console.log('=== ALL MODELS LOADED - AVAILABLE GUIDS ===')
      loadedModelsRef.current.forEach((model, index) => {
        console.log(`${index + 1}. GUID: "${model.guid}" | Name: "${model.name}" | URL: "${model.url}"`)
      })
      
      
      // Notify parent about loaded models
      if (onModelsLoad && !isCancelled()) {
        onModelsLoad({
          totalModels: urls.length,
          totalVertices,
          totalAnimations,
          loadedCount
        })
      }
      
    } catch (error) {
      if (!isCancelled()) {
        console.error('Error loading models:', error)
        setError('Failed to load GLB models')
      }
    } finally {
      if (!isCancelled()) {
        setIsLoading(false)
      }
    }
  }

  const zoomToFitAll = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    if (loadedModelsRef.current.length === 0) return
    
    // Calculate bounding box of all models
    const box = new THREE.Box3()
    loadedModelsRef.current.forEach(loadedModel => {
      loadedModel.model.updateMatrixWorld(true)
      const modelBox = new THREE.Box3().setFromObject(loadedModel.model)
      box.union(modelBox)
    })
    
    if (box.isEmpty()) return
    
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    
    // Calculate camera position
    const fov = camera.fov * (Math.PI / 180)
    const distance = (maxDim / 2) / Math.tan(fov / 2) * 1.5
    
    // Position camera at a good angle
    camera.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.5,
      center.z + distance * 0.7
    )
    camera.lookAt(center)
    
    // Update orbit center for controls
    orbitCenter.copy(center)
    
    console.log(`Fitted ${loadedModelsRef.current.length} models - Center: ${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)}`)
  }

  const zoomToModel = (guid: string | null) => {
    if (!guid || !cameraRef.current) return
    
    const selectedModel = loadedModelsRef.current.find(m => m.guid === guid)
    if (!selectedModel) {
      console.log('Model not found for zoom:', guid)
      return
    }
    
    console.log('Zooming to model:', selectedModel.name)
    
    // Update the model's world matrix
    selectedModel.model.updateMatrixWorld(true)
    
    // Calculate bounding box of the selected model
    const box = new THREE.Box3().setFromObject(selectedModel.model)
    
    if (box.isEmpty()) {
      console.log('Model bounding box is empty')
      return
    }
    
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    
    // Calculate camera position for this specific model
    const camera = cameraRef.current
    const fov = camera.fov * (Math.PI / 180)
    const distance = (maxDim / 2) / Math.tan(fov / 2) * 2.5 // Closer zoom than fit-all
    
    // Maintain current viewing angle but move closer to the model
    const currentDirection = new THREE.Vector3()
    camera.getWorldDirection(currentDirection)
    currentDirection.negate() // Reverse to get direction from target to camera
    
    // Calculate new camera position maintaining the current viewing angle
    const newCameraPosition = center.clone().add(currentDirection.multiplyScalar(distance))
    
    // Smooth transition to new position while maintaining rotation
    camera.position.copy(newCameraPosition)
    camera.lookAt(center)
    
    // Update orbit center for controls
    orbitCenter.copy(center)
    
    console.log(`Zoomed to model ${selectedModel.name} - Center: ${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)}, Distance: ${distance.toFixed(1)}`)
  }

  // Create orange highlight material once to reuse
  const orangeHighlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6600
  })

  // TEST FUNCTION: Highlight random model
  const testHighlightRandom = () => {
    console.log('TEST: Manual highlight button clicked')
    if (loadedModelsRef.current.length === 0) {
      console.log('TEST: No models loaded')
      return
    }
    
    // Pick a random model
    const randomIndex = Math.floor(Math.random() * loadedModelsRef.current.length)
    const randomModel = loadedModelsRef.current[randomIndex]
    console.log('TEST: Highlighting random model', randomIndex, ':', randomModel.guid)
    
    // First, restore all models to their original materials
    loadedModelsRef.current.forEach(loadedModel => {
      loadedModel.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const originalMaterial = loadedModel.originalMaterials.get(child)
          if (originalMaterial) {
            child.material = originalMaterial
          }
        }
      })
    })
    
    // Then highlight ONLY the selected model with orange
    let meshCount = 0
    randomModel.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshCount++
        child.material = new THREE.MeshBasicMaterial({ color: 0xff6600 }) // Orange
      }
    })
    
    console.log('TEST: Applied orange to', meshCount, 'meshes in model', randomModel.guid)
    console.log('TEST: All other models kept their original materials')
  }

  // Selection and highlighting functions
  const highlightModel = (guid: string | null) => {
    console.log('highlightModel called with guid:', guid)
    console.log('Available models count:', loadedModelsRef.current.length)
    
    // First, restore all models to their original materials
    loadedModelsRef.current.forEach(loadedModel => {
      loadedModel.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const originalMaterial = loadedModel.originalMaterials.get(child)
          if (originalMaterial && child.material !== originalMaterial) {
            child.material = originalMaterial
          }
        }
      })
    })

    // Then highlight only the selected model if guid provided
    if (guid) {
      const selectedModel = loadedModelsRef.current.find(m => m.guid === guid)
      
      if (selectedModel) {
        console.log('Found model to highlight:', selectedModel.name)
        let highlightedMeshes = 0
        selectedModel.model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = orangeHighlightMaterial
            child.material.needsUpdate = true
            highlightedMeshes++
          }
        })
        console.log('Highlighted', highlightedMeshes, 'meshes in model:', selectedModel.name)
      } else {
        console.log('Model not found for guid:', guid)
        console.log('Available GUIDs:', loadedModelsRef.current.map(m => m.guid))
      }
    }
  }

  const handleModelClick = (event: MouseEvent) => {
    if (!cameraRef.current || !sceneRef.current) return

    // Calculate mouse position in normalized device coordinates
    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect()
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // Cast ray
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
    
    // Get all meshes from loaded models
    const meshes: THREE.Mesh[] = []
    loadedModelsRef.current.forEach(loadedModel => {
      loadedModel.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child)
        }
      })
    })

    const intersects = raycasterRef.current.intersectObjects(meshes)
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh
      const guid = clickedMesh.userData.guid
      
      if (guid) {
        // Check for double-click
        const currentTime = Date.now()
        const isDoubleClick = (currentTime - lastClickTime) < DOUBLE_CLICK_DELAY && lastClickedGuid === guid
        
        setSelectedGuidInternal(guid)
        highlightModel(guid)
        onModelSelect?.(guid)
        
        if (isDoubleClick) {
          console.log('=== 3D MODEL DOUBLE CLICKED ===')
          console.log('Double-click zoom for 3D model GUID:', guid)
          zoomToModel(guid)
        } else {
          console.log('3D model single clicked:', guid)
        }
        
        // Update double-click tracking
        lastClickTime = currentTime
        lastClickedGuid = guid
      }
    } else {
      // Clicked empty space - deselect
      setSelectedGuidInternal(null)
      highlightModel(null)
      onModelSelect?.(null)
      
      // Reset double-click tracking
      lastClickTime = 0
      lastClickedGuid = null
    }
  }

  // Controls setup
  let isLeftMouseDown = false
  let isMiddleMouseDown = false
  let mouseX = 0
  let mouseY = 0
  let rotationX = 0
  let rotationY = 0
  let targetRotationX = 0
  let targetRotationY = 0
  const orbitCenter = new THREE.Vector3(0, 0, 0)
  
  // Double-click detection for 3D models
  let lastClickTime = 0
  let lastClickedGuid: string | null = null
  const DOUBLE_CLICK_DELAY = 300 // milliseconds
  
  const keys = {
    w: false, a: false, s: false, d: false, q: false, e: false
  }
  const moveSpeed = 0.5

  const setupControls = (camera: THREE.PerspectiveCamera, element: HTMLCanvasElement) => {
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) {
        isLeftMouseDown = true
        const direction = new THREE.Vector3()
        camera.getWorldDirection(direction)
        orbitCenter.copy(camera.position).add(direction.multiplyScalar(10))
        
        const offset = camera.position.clone().sub(orbitCenter)
        const distance = offset.length()
        targetRotationX = rotationX = Math.asin(offset.y / distance)
        targetRotationY = rotationY = Math.atan2(offset.x, offset.z)
      } else if (event.button === 1) {
        isMiddleMouseDown = true
        event.preventDefault()
      }
      mouseX = event.clientX
      mouseY = event.clientY
    }
    
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 0) {
        isLeftMouseDown = false
        
        // Check if this was a click (not a drag)
        const wasDragging = Math.abs(event.clientX - mouseX) > 5 || Math.abs(event.clientY - mouseY) > 5
        if (!wasDragging) {
          handleModelClick(event)
        }
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
        targetRotationY -= deltaX * 0.01
        targetRotationX += deltaY * 0.01
        targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotationX))
      } else if (isMiddleMouseDown) {
        const forward = new THREE.Vector3()
        camera.getWorldDirection(forward)
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()
        const up = camera.up.clone()
        
        camera.position.add(right.multiplyScalar(-deltaX * 0.02))
        camera.position.add(up.multiplyScalar(deltaY * 0.02))
      }
    }
    
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)
      const moveDistance = -event.deltaY * 0.02
      camera.position.add(direction.multiplyScalar(moveDistance))
    }
    
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key in keys) {
        keys[key as keyof typeof keys] = true
        event.preventDefault()
      } else if (key === 'f') {
        if (sceneRef.current && cameraRef.current) {
          zoomToFitAll(sceneRef.current, cameraRef.current)
        }
        event.preventDefault()
      } else if (key === 'z') {
        // Zoom to selected model if one is selected
        if (selectedGuidInternal) {
          console.log('Z key pressed - zooming to selected model:', selectedGuidInternal)
          zoomToModel(selectedGuidInternal)
        } else {
          console.log('Z key pressed but no model selected')
        }
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
    
    element.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('wheel', handleWheel)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    // Store cleanup function
    ;(window as any).__multiViewerCleanup = () => {
      element.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }

  const updateCameraMovement = () => {
    if (!cameraRef.current) return
    const camera = cameraRef.current
    
    // Apply WASD movement
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()
    
    if (keys.w) camera.position.add(forward.clone().multiplyScalar(moveSpeed))
    if (keys.s) camera.position.add(forward.clone().multiplyScalar(-moveSpeed))
    if (keys.a) camera.position.add(right.clone().multiplyScalar(-moveSpeed))
    if (keys.d) camera.position.add(right.clone().multiplyScalar(moveSpeed))
    if (keys.q) camera.position.y -= moveSpeed
    if (keys.e) camera.position.y += moveSpeed
    
    // Apply orbit rotation
    if (isLeftMouseDown) {
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
  }

  const cleanupControls = () => {
    if ((window as any).__multiViewerCleanup) {
      ;(window as any).__multiViewerCleanup()
      delete (window as any).__multiViewerCleanup
    }
  }

  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef} 
        className="w-full h-full rounded bg-gray-700 cursor-grab active:cursor-grabbing"
        style={{ minHeight: '400px' }}
      />
      
      {/* Control buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        {/* TEST BUTTON */}
        <button
          onClick={testHighlightRandom}
          className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          title="Test: Highlight Random Model"
        >
          Test Highlight
        </button>
        
        <button
          onClick={() => {
            if (sceneRef.current && cameraRef.current) {
              zoomToFitAll(sceneRef.current, cameraRef.current)
            }
          }}
          className="bg-gray-800/80 hover:bg-gray-700 text-white p-2 rounded transition-colors"
          title="Zoom to Fit All (F key)"
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
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
            <div>Loading GLB models...</div>
            <div className="text-sm text-gray-400 mt-2">
              {loadProgress.loaded} / {loadProgress.total} models loaded
            </div>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/20 border border-red-500 text-red-300 p-3 rounded">
          {error}
        </div>
      )}

      {/* Model count indicator */}
      {!isLoading && !error && loadedModelsRef.current.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-gray-800/80 text-white px-3 py-2 rounded text-sm">
          {loadedModelsRef.current.length} models loaded
          {selectedGuidInternal && (
            <div className="text-xs text-orange-300 mt-1">
              Selected: {loadedModelsRef.current.find(m => m.guid === selectedGuidInternal)?.name}
            </div>
          )}
        </div>
      )}
    </div>
  )
}