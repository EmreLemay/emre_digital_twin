'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { cn } from '@/lib/utils'
import { LoadingSpinner, Button } from './ui'

interface ModelData {
  url: string
  scene: THREE.Group
  boundingBox: THREE.Box3
  visible: boolean
  highlighted: boolean
  guid?: string
  metadata?: any
  originalMaterials: Map<THREE.Mesh, THREE.Material>
}

interface ThreeViewer2Props {
  modelUrls: string[]
  className?: string
  onModelLoad?: (modelData: ModelData) => void
  onObjectSelect?: (object: THREE.Object3D, modelData: ModelData) => void
  onModelSelect?: (guid: string | null) => void
  selectedGuid?: string | null
  zoomTrigger?: {guid: string, timestamp: number} | null
}

export default function ThreeViewer2({ 
  modelUrls, 
  className,
  onModelLoad,
  onObjectSelect,
  onModelSelect,
  selectedGuid,
  zoomTrigger
}: ThreeViewer2Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  
  const [loading, setLoading] = useState(false)
  const [loadedModels, setLoadedModels] = useState<Map<string, ModelData>>(new Map())
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedGuidInternal, setSelectedGuidInternal] = useState<string | null>(null)

  // Create orange highlight material
  const orangeHighlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6600
  })

  // Initialize Three.js Scene
  const initializeScene = useCallback(() => {
    console.log('🚀 ThreeViewer2: initializeScene called')
    console.log('🚀 ThreeViewer2: mountRef.current:', mountRef.current)
    
    if (!mountRef.current) {
      console.log('🚀 ThreeViewer2: No mount ref, returning early')
      return
    }

    const width = mountRef.current.clientWidth
    const height = mountRef.current.clientHeight
    console.log('🚀 ThreeViewer2: Container dimensions:', { width, height })

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1f2937) // Gray-800
    sceneRef.current = scene
    console.log('🚀 ThreeViewer2: Scene created:', scene)

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(5, 5, 5)
    cameraRef.current = camera
    console.log('🚀 ThreeViewer2: Camera created:', camera)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer
    console.log('🚀 ThreeViewer2: Renderer created:', renderer)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = false
    controls.minDistance = 1
    controls.maxDistance = 100
    controls.maxPolarAngle = Math.PI / 2
    controlsRef.current = controls

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    scene.add(directionalLight)

    // Create a simple environment map for reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const envTexture = pmremGenerator.fromScene(new THREE.Scene()).texture
    scene.environment = envTexture
    pmremGenerator.dispose()
    console.log('🚀 ThreeViewer2: Default environment created')

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20)
    gridHelper.material.opacity = 0.3
    gridHelper.material.transparent = true
    scene.add(gridHelper)

    mountRef.current.appendChild(renderer.domElement)
    console.log('🚀 ThreeViewer2: Renderer canvas added to DOM')

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()
    console.log('🚀 ThreeViewer2: Animation loop started')

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return
      const newWidth = mountRef.current.clientWidth
      const newHeight = mountRef.current.clientHeight
      
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  // Load GLB Models
  const loadModel = useCallback(async (url: string) => {
    console.log('🚀 ThreeViewer2: Attempting to load model:', url)
    
    if (loadedModels.has(url)) {
      console.log('🚀 ThreeViewer2: Model already loaded:', url)
      return
    }
    
    if (!sceneRef.current) {
      console.error('🚀 ThreeViewer2: Scene not initialized!')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('🚀 ThreeViewer2: Starting GLB load for:', url)
      const loader = new GLTFLoader()
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          url, 
          (gltf) => {
            console.log('🚀 ThreeViewer2: GLB loaded successfully:', url, gltf)
            resolve(gltf)
          }, 
          (progress) => {
            console.log('🚀 ThreeViewer2: Loading progress:', url, progress)
          }, 
          (error) => {
            console.error('🚀 ThreeViewer2: GLB load error:', url, error)
            reject(error)
          }
        )
      })

      const scene = gltf.scene
      scene.userData.originalUrl = url
      
      // Calculate bounding box
      const box = new THREE.Box3().setFromObject(scene)
      
      // Extract GUID from filename if present
      const filename = url.split('/').pop() || ''
      
      // First try to match the extended format: GUID-extension (e.g., 21a96bfe-1d2f-4913-a727-8c72a07cf272-003cf9e2)
      let guidMatch = filename.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{8})\.glb$/i)
      let guid = guidMatch ? guidMatch[1] : undefined
      
      // If not found, try standard GUID format (allowing any alphanumeric characters for flexibility)
      if (!guid) {
        guidMatch = filename.match(/([0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12})\.glb$/i)
        guid = guidMatch ? guidMatch[1] : undefined
      }
      
      // If still not found, try to extract just the filename without extension as GUID
      if (!guid) {
        const nameWithoutExt = filename.replace(/\.glb$/i, '')
        if (nameWithoutExt.length > 0) {
          guid = nameWithoutExt
        }
      }
      
      console.log('🔍 ThreeViewer2: GUID extraction:', { filename, guid })

      // Store original materials and enhance meshes
      const originalMaterials = new Map<THREE.Mesh, THREE.Material>()
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          
          // Store cloned original material for highlighting
          if (child.material) {
            const originalMaterial = child.material.clone ? child.material.clone() : child.material
            originalMaterials.set(child, originalMaterial)
            child.material.envMapIntensity = 1.2
          }

          // Add GUID as userData for raycasting
          child.userData.guid = guid
        }
      })

      const modelData: ModelData = {
        url,
        scene,
        boundingBox: box,
        visible: true,
        highlighted: false,
        guid,
        metadata: gltf.userData,
        originalMaterials
      }

      // Add to scene
      console.log('🚀 ThreeViewer2: Adding scene to Three.js scene:', scene)
      console.log('🚀 ThreeViewer2: Scene ref current:', sceneRef.current)
      console.log('🚀 ThreeViewer2: Model scene children:', scene.children.length)
      
      if (!sceneRef.current) {
        console.error('🚀 ThreeViewer2: Scene ref is null! Cannot add model')
        return
      }
      
      sceneRef.current.add(scene)
      console.log('🚀 ThreeViewer2: Model added to scene. Scene children count:', sceneRef.current.children.length)
      
      // Update loaded models
      console.log('🚀 ThreeViewer2: Updating loaded models map')
      setLoadedModels(prev => {
        const newMap = new Map(prev.set(url, modelData))
        console.log('🚀 ThreeViewer2: New loaded models map size:', newMap.size)
        return newMap
      })
      
      // Focus camera on all models
      console.log('🚀 ThreeViewer2: Focusing camera on all models')
      focusCameraOnAllModels()
      
      if (onModelLoad) {
        onModelLoad(modelData)
      }
      
      console.log('🚀 ThreeViewer2: Model loading completed successfully:', url)

    } catch (error) {
      console.error('Error loading model:', error)
      setError(`Failed to load model: ${url}`)
    } finally {
      setLoading(false)
    }
  }, [loadedModels, onModelLoad])

  // Focus camera on all loaded models
  const focusCameraOnAllModels = useCallback(() => {
    console.log('🚀 ThreeViewer2: focusCameraOnAllModels called')
    console.log('🚀 ThreeViewer2: Camera ref:', cameraRef.current)
    console.log('🚀 ThreeViewer2: Controls ref:', controlsRef.current)
    console.log('🚀 ThreeViewer2: Loaded models size:', loadedModels.size)
    
    if (!cameraRef.current || !controlsRef.current || loadedModels.size === 0) {
      console.log('🚀 ThreeViewer2: Early return from focusCameraOnAllModels')
      return
    }

    const allBox = new THREE.Box3()
    loadedModels.forEach(modelData => {
      console.log('🚀 ThreeViewer2: Processing model for camera focus:', modelData.url, 'visible:', modelData.visible)
      if (modelData.visible) {
        allBox.union(modelData.boundingBox)
      }
    })

    console.log('🚀 ThreeViewer2: Combined bounding box:', allBox)
    
    if (allBox.isEmpty()) {
      console.log('🚀 ThreeViewer2: Bounding box is empty, skipping camera focus')
      return
    }

    const center = allBox.getCenter(new THREE.Vector3())
    const size = allBox.getSize(new THREE.Vector3())
    const distance = Math.max(size.x, size.y, size.z) * 2

    console.log('🚀 ThreeViewer2: Camera focus - Center:', center, 'Size:', size, 'Distance:', distance)

    controlsRef.current.target.copy(center)
    cameraRef.current.position.copy(center)
    cameraRef.current.position.z += distance
    cameraRef.current.lookAt(center)
    controlsRef.current.update()
    
    console.log('🚀 ThreeViewer2: Camera position updated to:', cameraRef.current.position)
  }, [loadedModels])

  // Remove model
  const removeModel = useCallback((url: string) => {
    const modelData = loadedModels.get(url)
    if (modelData && sceneRef.current) {
      sceneRef.current.remove(modelData.scene)
      setLoadedModels(prev => {
        const newMap = new Map(prev)
        newMap.delete(url)
        return newMap
      })
      focusCameraOnAllModels()
    }
  }, [loadedModels, focusCameraOnAllModels])

  // Toggle model visibility
  const toggleModelVisibility = useCallback((url: string) => {
    const modelData = loadedModels.get(url)
    if (modelData) {
      modelData.visible = !modelData.visible
      modelData.scene.visible = modelData.visible
      setLoadedModels(prev => new Map(prev.set(url, { ...modelData })))
      focusCameraOnAllModels()
    }
  }, [loadedModels, focusCameraOnAllModels])

  // Selection and highlighting functions
  const highlightModel = useCallback((guid: string | null) => {
    console.log('🎯 ThreeViewer2: highlightModel called with guid:', guid)
    console.log('🎯 ThreeViewer2: Available models count:', loadedModels.size)
    
    // First, restore all models to their original materials
    loadedModels.forEach((modelData) => {
      modelData.scene.traverse((child) => {
        if (child.isMesh) {
          const originalMaterial = modelData.originalMaterials.get(child)
          if (originalMaterial && child.material !== originalMaterial) {
            child.material = originalMaterial
          }
        }
      })
    })

    // Then highlight only the selected model if guid provided
    if (guid) {
      const selectedModel = Array.from(loadedModels.values()).find(m => m.guid === guid)
      
      if (selectedModel) {
        console.log('🎯 ThreeViewer2: Found model to highlight:', selectedModel.url)
        let highlightedMeshes = 0
        selectedModel.scene.traverse((child) => {
          if (child.isMesh) {
            child.material = orangeHighlightMaterial
            child.material.needsUpdate = true
            highlightedMeshes++
          }
        })
        console.log('🎯 ThreeViewer2: Highlighted', highlightedMeshes, 'meshes in model:', selectedModel.url)
      } else {
        console.log('🎯 ThreeViewer2: Model not found for guid:', guid)
        console.log('🎯 ThreeViewer2: Available GUIDs:', Array.from(loadedModels.values()).map(m => m.guid))
      }
    }
  }, [loadedModels, orangeHighlightMaterial])

  // Zoom to specific model
  const zoomToModel = useCallback((guid: string) => {
    const modelData = Array.from(loadedModels.values()).find(m => m.guid === guid)
    if (modelData && cameraRef.current && controlsRef.current) {
      const box = modelData.boundingBox
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const distance = Math.max(size.x, size.y, size.z) * 2

      controlsRef.current.target.copy(center)
      cameraRef.current.position.copy(center)
      cameraRef.current.position.z += distance
      cameraRef.current.lookAt(center)
      controlsRef.current.update()
      
      console.log('🎯 ThreeViewer2: Zoomed to model:', guid)
    }
  }, [loadedModels])

  // Initialize scene on mount
  useEffect(() => {
    const cleanup = initializeScene()
    return cleanup
  }, [initializeScene])

  // Load models when URLs change
  useEffect(() => {
    console.log('🚀 ThreeViewer2: Model URLs effect triggered')
    console.log('🚀 ThreeViewer2: Model URLs:', modelUrls)
    console.log('🚀 ThreeViewer2: Loaded models size:', loadedModels.size)
    console.log('🚀 ThreeViewer2: Loaded model URLs:', Array.from(loadedModels.keys()))

    // Remove models that are no longer in the URL list
    loadedModels.forEach((_, url) => {
      if (!modelUrls.includes(url)) {
        console.log('🚀 ThreeViewer2: Removing model:', url)
        removeModel(url)
      }
    })

    // Load new models
    modelUrls.forEach(url => {
      if (!loadedModels.has(url)) {
        console.log('🚀 ThreeViewer2: Loading new model:', url)
        loadModel(url)
      } else {
        console.log('🚀 ThreeViewer2: Model already loaded:', url)
      }
    })
  }, [modelUrls, loadedModels, loadModel, removeModel])

  // Handle external selection changes
  useEffect(() => {
    console.log('🎯 ThreeViewer2: Selection effect triggered:', { selectedGuid, selectedGuidInternal })
    if (selectedGuid !== undefined && selectedGuid !== selectedGuidInternal) {
      console.log('🎯 ThreeViewer2: Updating internal selection to:', selectedGuid)
      setSelectedGuidInternal(selectedGuid)
      highlightModel(selectedGuid)
    }
  }, [selectedGuid, selectedGuidInternal, highlightModel])

  // Handle zoom triggers
  useEffect(() => {
    if (zoomTrigger && zoomTrigger.guid) {
      console.log('🎯 ThreeViewer2: Zoom trigger received:', zoomTrigger)
      zoomToModel(zoomTrigger.guid)
    }
  }, [zoomTrigger, zoomToModel])

  // Handle mouse interactions
  useEffect(() => {
    if (!rendererRef.current) return

    const handleMouseClick = (event: MouseEvent) => {
      const rect = rendererRef.current!.domElement.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current!)
      
      const allObjects: THREE.Object3D[] = []
      loadedModels.forEach(modelData => {
        modelData.scene.traverse(child => {
          if (child.isMesh) allObjects.push(child)
        })
      })

      const intersects = raycasterRef.current.intersectObjects(allObjects)
      
      if (intersects.length > 0) {
        const selectedObj = intersects[0].object
        setSelectedObject(selectedObj)
        
        // Get GUID from mesh userData
        const guid = selectedObj.userData?.guid
        console.log('🎯 ThreeViewer2: Clicked object with GUID:', guid)
        
        if (guid) {
          setSelectedGuidInternal(guid)
          highlightModel(guid)
          onModelSelect?.(guid)
        }
        
        // Find which model this object belongs to for legacy callback
        const modelData = Array.from(loadedModels.values()).find(model =>
          model.scene.getObjectById(selectedObj.id) !== undefined
        )
        
        if (modelData && onObjectSelect) {
          onObjectSelect(selectedObj, modelData)
        }
      } else {
        // Clicked empty space - clear selection
        setSelectedGuidInternal(null)
        highlightModel(null)
        onModelSelect?.(null)
      }
    }

    const renderer = rendererRef.current
    renderer.domElement.addEventListener('click', handleMouseClick)

    return () => {
      renderer.domElement.removeEventListener('click', handleMouseClick)
    }
  }, [loadedModels, onObjectSelect, onModelSelect, highlightModel])

  return (
    <div className={cn('relative w-full h-full', className)}>
      <div ref={mountRef} className="w-full h-full" />
      
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading 3D models..." />
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-4 right-4">
          <div className="bg-red-600 text-white p-3 rounded-lg shadow-lg">
            {error}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg p-2 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={focusCameraOnAllModels}
          disabled={loadedModels.size === 0}
          title="Focus on all models"
        >
          🎯
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (controlsRef.current) {
              controlsRef.current.reset()
            }
          }}
          title="Reset camera"
        >
          🏠
        </Button>
      </div>

      {/* Model count indicator */}
      {loadedModels.size > 0 && (
        <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-90 rounded-lg px-3 py-2 text-sm">
          {loadedModels.size} model{loadedModels.size !== 1 ? 's' : ''} loaded
        </div>
      )}
    </div>
  )
}