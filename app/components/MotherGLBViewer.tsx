'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

interface VolumeData {
  guid: string
  name: string
  mesh: THREE.Mesh
  boundingBox: THREE.Box3
  parentGuid?: string
  children: VolumeData[]
  level: number
  visible: boolean
}

interface MotherGLBViewerProps {
  modelUrl: string | null
  onVolumeSelect: (volumeData: VolumeData | null, hierarchyInfo?: any) => void
  selectedGuids?: string[]
}

export default function MotherGLBViewer({ modelUrl, onVolumeSelect, selectedGuids = [] }: MotherGLBViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<any>(null)
  const volumesRef = useRef<VolumeData[]>([])
  const selectedVolumeRef = useRef<THREE.Mesh | null>(null)
  const externallySelectedVolumesRef = useRef<THREE.Mesh[]>([])
  const outlineMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const orangeHighlightMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const dimmedMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map())
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [volumeCount, setVolumeCount] = useState(0)
  const [hierarchyLevel, setHierarchyLevel] = useState(0)
  const [breadcrumbs, setBreadcrumbs] = useState<VolumeData[]>([])
  const [visibleVolumes, setVisibleVolumes] = useState<Set<string>>(new Set())

  // Zoom to extents function
  const zoomToExtents = () => {
    console.log('🎯 Zoom to extents requested')
    console.log('Volumes available:', volumesRef.current.length)
    console.log('Camera available:', !!cameraRef.current)
    console.log('Controls available:', !!controlsRef.current)
    
    if (volumesRef.current.length === 0) {
      console.log('❌ No volumes found for zoom extents')
      return
    }
    
    if (!cameraRef.current) {
      console.log('❌ Camera not available for zoom extents')
      return
    }
    
    if (!controlsRef.current) {
      console.log('❌ Controls not available for zoom extents')
      return
    }
    
    try {
      const box = new THREE.Box3()
      volumesRef.current.forEach(volume => {
        if (volume.visible) { // Only include visible volumes
          box.expandByObject(volume.mesh)
        }
      })
      
      if (box.isEmpty()) {
        console.log('❌ Bounding box is empty')
        return
      }
      
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      
      console.log('📦 Bounding box center:', center)
      console.log('📦 Bounding box size:', size)
      
      const maxDim = Math.max(size.x, size.y, size.z)
      const distance = maxDim * 2 // Distance multiplier for better view
      
      console.log('📏 Max dimension:', maxDim, 'Distance:', distance)
      
      cameraRef.current.position.set(
        center.x + distance * 0.7,
        center.y + distance * 0.7,
        center.z + distance * 0.7
      )
      cameraRef.current.lookAt(center)
      
      controlsRef.current.target.copy(center)
      controlsRef.current.update()
      
      console.log('✅ Zoomed to extents successfully')
      console.log('📷 New camera position:', cameraRef.current.position)
      
    } catch (error) {
      console.error('❌ Error in zoom to extents:', error)
    }
  }

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a1a)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(5, 5, 5)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    // Very Bright Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5)
    scene.add(ambientLight)

    // Multiple bright directional lights from all angles
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2.0)
    directionalLight1.position.set(10, 10, 10)
    directionalLight1.castShadow = true
    scene.add(directionalLight1)

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.5)
    directionalLight2.position.set(-10, 10, -10)
    scene.add(directionalLight2)

    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 1.5)
    directionalLight3.position.set(0, -10, 0)
    scene.add(directionalLight3)

    const directionalLight4 = new THREE.DirectionalLight(0xffffff, 1.0)
    directionalLight4.position.set(10, -10, -10)
    scene.add(directionalLight4)

    const directionalLight5 = new THREE.DirectionalLight(0xffffff, 1.0)
    directionalLight5.position.set(-10, -10, 10)
    scene.add(directionalLight5)

    // Add hemisphere light for even more brightness
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)
    scene.add(hemisphereLight)

    // Controls (using basic orbit controls)
    const setupControls = async () => {
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controlsRef.current = controls
    }
    setupControls()

    // Selection highlight material (green for click selection)
    outlineMaterialRef.current = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
      wireframe: true,
      wireframeLinewidth: 3,
      side: THREE.DoubleSide
    })

    // Orange highlight material (for external selection from hierarchy)
    orangeHighlightMaterialRef.current = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.9,
      wireframe: true,
      wireframeLinewidth: 4,
      side: THREE.DoubleSide
    })

    // Dimmed material (for non-selected volumes during hierarchy filtering)
    dimmedMaterialRef.current = new THREE.MeshBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.03,
      wireframe: false,
      side: THREE.DoubleSide
    })

    // Click detection
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onMouseClick = async (event: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(scene.children, true)

      console.log('Click detected, intersects:', intersects.length)

      if (intersects.length > 0) {
        // Find the first intersect that's a volume
        for (const intersect of intersects) {
          const clickedObject = intersect.object as THREE.Mesh
          console.log('Checking object:', clickedObject.name, 'userData:', clickedObject.userData)
          
          const volumeData = volumesRef.current.find(v => v.mesh === clickedObject)
          
          if (volumeData && volumeData.visible) {
            // Check if this volume has children
            if (volumeData.children.length > 0) {
              console.log('🎯 Drilling down into parent:', volumeData.guid, 'with', volumeData.children.length, 'children')
              await drillDownIntoParent(volumeData)
            } else {
              console.log('📄 Leaf volume selected:', volumeData.guid)
              selectVolume(clickedObject)
              onVolumeSelect(volumeData)
            }
            return
          } else if (clickedObject.userData.isVolume) {
            // Fallback: check userData
            const guid = clickedObject.userData.guid
            if (guid) {
              const volumeData: VolumeData = {
                guid: guid,
                name: clickedObject.name || guid,
                mesh: clickedObject,
                boundingBox: new THREE.Box3().setFromObject(clickedObject)
              }
              selectVolume(clickedObject)
              onVolumeSelect(volumeData)
              console.log('✅ Selected volume (fallback):', guid)
              return
            }
          }
        }
        
        console.log('❌ No volume found in intersects, deselecting')
        selectVolume(null)
        onVolumeSelect(null)
      } else {
        console.log('❌ Clicked on empty space, deselecting')
        selectVolume(null)
        onVolumeSelect(null)
      }
    }

    container.addEventListener('click', onMouseClick)

    // Keyboard controls
    const onKeyDown = (event: KeyboardEvent) => {
      console.log('🔑 Key pressed:', event.code, event.key)
      if (event.code === 'KeyF') {
        event.preventDefault()
        zoomToExtents()
      } else if (event.code === 'Escape') {
        event.preventDefault()
        goBackOneLevel()
      }
    }


    document.addEventListener('keydown', onKeyDown)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      
      if (controlsRef.current) {
        controlsRef.current.update()
      }
      
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    
    // Set up ResizeObserver to watch container size changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    window.addEventListener('resize', handleResize)

    return () => {
      container.removeEventListener('click', onMouseClick)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      if (rendererRef.current) {
        rendererRef.current.dispose()
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement)
        }
      }
    }
  }, [])

  // Handle external selection from hierarchy (orange highlight + transparency filtering)
  useEffect(() => {
    // Clear all previous external selections
    externallySelectedVolumesRef.current.forEach(mesh => {
      if (originalMaterialsRef.current.has(mesh)) {
        mesh.material = originalMaterialsRef.current.get(mesh)!
      }
    })
    externallySelectedVolumesRef.current = []

    if (!selectedGuids || selectedGuids.length === 0) {
      // No selection - restore all volumes to normal
      volumesRef.current.forEach(volume => {
        if (originalMaterialsRef.current.has(volume.mesh)) {
          volume.mesh.material = originalMaterialsRef.current.get(volume.mesh)!
        }
      })
      return
    }

    console.log(`🟠 Highlighting ${selectedGuids.length} volumes from hierarchy selection:`, selectedGuids)
    
    // Find all target volumes
    const targetVolumes = volumesRef.current.filter(volume => 
      selectedGuids.includes(volume.guid) && volume.visible
    )
    
    const targetMeshes = targetVolumes.map(v => v.mesh)
    const nonTargetVolumes = volumesRef.current.filter(volume => 
      !selectedGuids.includes(volume.guid) && volume.visible
    )

    // Apply highlighting and dimming
    if (orangeHighlightMaterialRef.current && dimmedMaterialRef.current) {
      // Highlight selected volumes in orange
      targetVolumes.forEach(volume => {
        volume.mesh.material = orangeHighlightMaterialRef.current!
        externallySelectedVolumesRef.current.push(volume.mesh)
      })

      // Dim all non-selected volumes
      nonTargetVolumes.forEach(volume => {
        volume.mesh.material = dimmedMaterialRef.current!
      })

      console.log(`✨ Highlighted ${targetVolumes.length} volumes, dimmed ${nonTargetVolumes.length} volumes`)

      // Zoom to fit all selected volumes
      if (targetVolumes.length > 0) {
        setTimeout(() => {
          zoomToVolumes(targetVolumes)
        }, 100)
      }
    }
  }, [selectedGuids])

  // Zoom to a specific volume
  const zoomToVolume = (volume: VolumeData) => {
    if (!cameraRef.current || !controlsRef.current) return
    
    const box = volume.boundingBox
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    
    const maxDim = Math.max(size.x, size.y, size.z)
    const distance = maxDim * 3 // Closer zoom for individual volumes
    
    cameraRef.current.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.7,
      center.z + distance * 0.7
    )
    cameraRef.current.lookAt(center)
    
    controlsRef.current.target.copy(center)
    controlsRef.current.update()
    
    console.log('🎯 Zoomed to volume:', volume.guid)
  }

  // Zoom to fit multiple volumes (for category selections)
  const zoomToVolumes = (volumes: VolumeData[]) => {
    if (!cameraRef.current || !controlsRef.current || volumes.length === 0) return
    
    // Create combined bounding box for all volumes
    const combinedBox = new THREE.Box3()
    volumes.forEach(volume => {
      combinedBox.union(volume.boundingBox)
    })
    
    const center = combinedBox.getCenter(new THREE.Vector3())
    const size = combinedBox.getSize(new THREE.Vector3())
    
    const maxDim = Math.max(size.x, size.y, size.z)
    const distance = maxDim * 1.5 // Wider zoom for multiple volumes
    
    cameraRef.current.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.7,
      center.z + distance * 0.7
    )
    cameraRef.current.lookAt(center)
    
    controlsRef.current.target.copy(center)
    controlsRef.current.update()
    
    console.log(`🎯 Zoomed to ${volumes.length} volumes`)
  }

  // Build hierarchy from parent-child relationships
  const buildHierarchy = (volumes: VolumeData[]) => {
    console.log('🏗️ Building hierarchy from', volumes.length, 'volumes')
    
    // Create lookup map
    const volumeMap = new Map<string, VolumeData>()
    volumes.forEach(vol => volumeMap.set(vol.guid, vol))
    
    // Build parent-child relationships
    const rootVolumes: VolumeData[] = []
    const childVolumes: VolumeData[] = []
    
    volumes.forEach(volume => {
      if (volume.parentGuid && volumeMap.has(volume.parentGuid)) {
        // This volume has a parent in our scene
        const parent = volumeMap.get(volume.parentGuid)!
        parent.children.push(volume)
        volume.level = parent.level + 1
        volume.visible = false // Hide children initially
        volume.mesh.visible = false
        childVolumes.push(volume)
        
        console.log(`👶 Child: ${volume.guid} → Parent: ${volume.parentGuid} (level ${volume.level})`)
      } else {
        // This is a root volume (no parent or parent not in scene)
        volume.level = 0
        volume.visible = true // Show roots initially
        volume.mesh.visible = true
        rootVolumes.push(volume)
        
        console.log(`🌳 Root: ${volume.guid} (level 0)`)
      }
    })
    
    // Update visible volumes set
    const visibleGuids = new Set(rootVolumes.map(v => v.guid))
    setVisibleVolumes(visibleGuids)
    setHierarchyLevel(0)
    setBreadcrumbs([])
    
    // Calculate max depth
    const maxDepth = Math.max(...volumes.map(v => v.level))
    
    // Build hierarchy data for the panel
    const hierarchyInfo = {
      totalVolumes: volumes.length,
      maxDepth: maxDepth,
      rootNodes: rootVolumes,
      allVolumes: volumes
    }
    
    return {
      allVolumes: volumes,
      rootVolumes,
      childVolumes,
      hierarchyInfo
    }
  }

  // Load GLB model
  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return

    setLoading(true)
    setError(null)
    
    // Clear previous model
    volumesRef.current = []
    originalMaterialsRef.current.clear()
    selectedVolumeRef.current = null
    
    // Remove all previous meshes
    const objectsToRemove = sceneRef.current.children.filter(child => 
      child.type === 'Group' || (child.type === 'Mesh' && child.userData.isVolume)
    )
    objectsToRemove.forEach(obj => sceneRef.current!.remove(obj))

    const loader = new GLTFLoader()
    loader.load(
      modelUrl,
      (gltf) => {
        console.log('Mother GLB loaded:', gltf)
        
        const volumes: VolumeData[] = []
        
        // Traverse the scene to find all meshes
        console.log('🔍 Starting to traverse GLB scene...')
        
        gltf.scene.traverse((child) => {
          console.log('Found child:', child.type, 'name:', child.name || 'unnamed')
          
          if (child.type === 'Mesh') {
            const mesh = child as THREE.Mesh
            const meshName = mesh.name || 'unnamed'
            
            console.log('🎯 MESH FOUND:', meshName, 'type:', typeof meshName)
            
            // Make ALL meshes transparent and improve visibility
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => {
                  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
                    mat.transparent = true
                    mat.opacity = 0.7
                    mat.side = THREE.DoubleSide
                  }
                })
              } else {
                const material = mesh.material as THREE.Material
                if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
                  material.transparent = true
                  material.opacity = 0.7
                  material.side = THREE.DoubleSide
                }
              }
            }
            
            // Look for GUID in mesh name OR userData (including extended format with suffix)
            const guidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-[0-9a-f]+)?/i
            
            console.log('🔍 Checking mesh:', meshName)
            console.log('🔍 userData keys:', Object.keys(mesh.userData))
            
            // Check mesh name first
            let guidMatch = meshName.match(guidPattern)
            let cleanGuid = null
            let guidSource = 'name'
            
            if (guidMatch) {
              cleanGuid = guidMatch[0]
              guidSource = 'name'
            } else {
              // Check all userData properties for GUID
              for (const [key, value] of Object.entries(mesh.userData)) {
                if (typeof value === 'string') {
                  console.log(`🔍 Checking userData.${key}:`, value)
                  const userDataMatch = value.match(guidPattern)
                  if (userDataMatch) {
                    cleanGuid = userDataMatch[0]
                    guidSource = `userData.${key}`
                    console.log(`🎯 Found GUID "${cleanGuid}" in userData.${key} = "${value}"`)
                    break
                  }
                }
              }
            }
            
            console.log('🔍 GUID search result:', cleanGuid, 'from:', guidSource)
            
            if (cleanGuid) {
              console.log('✅ GUID DETECTED:', cleanGuid, 'source:', guidSource)
              
              // Store original material
              originalMaterialsRef.current.set(mesh, mesh.material)
              
              // Make mesh clickable and raycastable
              mesh.userData.isVolume = true
              mesh.userData.guid = cleanGuid
              
              // Extract parent GUID from userData
              const parentGuid = mesh.userData['LCX_PARENT_01_GUID'] as string || null
              console.log(`🏗️ Volume ${cleanGuid} has parent: ${parentGuid || 'ROOT'}`)
              
              // Calculate bounding box
              const boundingBox = new THREE.Box3().setFromObject(mesh)
              
              const volumeData: VolumeData = {
                guid: cleanGuid,
                name: meshName,
                mesh: mesh,
                boundingBox: boundingBox,
                parentGuid: parentGuid,
                children: [],
                level: 0, // Will be calculated after building hierarchy
                visible: true // Will be updated after hierarchy processing
              }
              
              volumes.push(volumeData)
              console.log('✅ Added volume:', cleanGuid, 'parent:', parentGuid || 'ROOT', 'from mesh:', meshName)
            } else {
              console.log('Non-GUID mesh (still transparent):', meshName)
            }
          }
        })
        
        // Build hierarchy from parent-child relationships
        const hierarchyData = buildHierarchy(volumes)
        volumesRef.current = hierarchyData.allVolumes
        setVolumeCount(volumes.length)
        
        console.log('📊 Hierarchy Summary:')
        console.log('- Total volumes found:', volumes.length)
        console.log('- Root volumes (visible):', hierarchyData.rootVolumes.length)
        console.log('- Child volumes (hidden):', hierarchyData.childVolumes.length)
        console.log('- Max depth:', hierarchyData.hierarchyInfo.maxDepth)
        
        // Send hierarchy info to parent component
        onVolumeSelect(null, hierarchyData.hierarchyInfo)
        
        // Add the loaded model to scene
        sceneRef.current!.add(gltf.scene)
        
        // Auto zoom to extents after loading
        if (volumes.length > 0) {
          console.log('🎯 Auto-zooming to extents after GLB load')
          // Small delay to ensure everything is rendered
          setTimeout(() => {
            zoomToExtents()
          }, 100)
        }
        
        setLoading(false)
        console.log(`Loaded ${volumes.length} volumes from mother GLB`)
      },
      (progress) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '% loaded')
      },
      (error) => {
        console.error('Error loading mother GLB:', error)
        setError('Failed to load mother GLB file')
        setLoading(false)
      }
    )
  }, [modelUrl])

  // Drill down into parent volume (with blink animation)
  const drillDownIntoParent = async (parentVolume: VolumeData) => {
    try {
      console.log('🔄 Starting drill-down animation for:', parentVolume.guid)
      
      // Blink animation
      await animateBlink(parentVolume.mesh)
      
      // Hide parent
      parentVolume.visible = false
      parentVolume.mesh.visible = false
      
      // Show all children
      parentVolume.children.forEach(child => {
        child.visible = true
        child.mesh.visible = true
        console.log('👶 Showing child:', child.guid)
      })
      
      // Update state
      const newVisibleGuids = new Set(parentVolume.children.map(c => c.guid))
      setVisibleVolumes(newVisibleGuids)
      setBreadcrumbs(prev => [...prev, parentVolume])
      setHierarchyLevel(prev => prev + 1)
      
      // Clear selection
      selectVolume(null)
      onVolumeSelect(null)
      
      // Zoom to fit new visible objects
      setTimeout(() => {
        zoomToExtents()
      }, 300)
      
      console.log('✅ Drill-down completed, now showing', parentVolume.children.length, 'children')
      
    } catch (error) {
      console.error('❌ Error in drill-down:', error)
    }
  }

  // Blink animation for volume
  const animateBlink = (mesh: THREE.Mesh): Promise<void> => {
    return new Promise((resolve) => {
      const originalMaterial = originalMaterialsRef.current.get(mesh)
      let blinkCount = 0
      const maxBlinks = 3
      
      const blink = () => {
        if (blinkCount >= maxBlinks) {
          // Restore original material and resolve
          if (originalMaterial) {
            mesh.material = originalMaterial
          }
          resolve()
          return
        }
        
        // Toggle between highlight and original
        if (blinkCount % 2 === 0) {
          // Highlight (green)
          mesh.material = outlineMaterialRef.current!
        } else {
          // Original
          if (originalMaterial) {
            mesh.material = originalMaterial
          }
        }
        
        blinkCount++
        setTimeout(blink, 200) // 200ms between blinks
      }
      
      blink()
    })
  }

  // Go to root level
  const goToRoot = () => {
    console.log('🏠 Navigating to root level')
    
    // Hide all volumes first
    volumesRef.current.forEach(vol => {
      vol.visible = false
      vol.mesh.visible = false
    })
    
    // Show only root volumes
    volumesRef.current.forEach(vol => {
      if (vol.level === 0) {
        vol.visible = true
        vol.mesh.visible = true
      }
    })
    
    // Update state
    const rootGuids = new Set(volumesRef.current.filter(v => v.level === 0).map(v => v.guid))
    setVisibleVolumes(rootGuids)
    setHierarchyLevel(0)
    setBreadcrumbs([])
    
    // Clear selection and zoom
    selectVolume(null)
    onVolumeSelect(null)
    setTimeout(() => zoomToExtents(), 100)
  }

  // Navigate to specific breadcrumb level
  const goToBreadcrumb = (targetIndex: number) => {
    if (targetIndex >= breadcrumbs.length) return
    
    const targetParent = breadcrumbs[targetIndex]
    console.log('🧭 Navigating to breadcrumb:', targetParent.name, 'at level', targetIndex + 1)
    
    // Hide all volumes
    volumesRef.current.forEach(vol => {
      vol.visible = false
      vol.mesh.visible = false
    })
    
    // Show children of target parent
    targetParent.children.forEach(child => {
      child.visible = true
      child.mesh.visible = true
    })
    
    // Update state
    const childGuids = new Set(targetParent.children.map(c => c.guid))
    setVisibleVolumes(childGuids)
    setHierarchyLevel(targetIndex + 1)
    setBreadcrumbs(breadcrumbs.slice(0, targetIndex + 1))
    
    // Clear selection and zoom
    selectVolume(null)
    onVolumeSelect(null)
    setTimeout(() => zoomToExtents(), 100)
  }

  // Go back one level in hierarchy
  const goBackOneLevel = () => {
    if (hierarchyLevel === 0) {
      console.log('🏠 Already at root level')
      return
    }
    
    if (breadcrumbs.length === 1) {
      // Go back to root
      console.log('⬆️ Going back to root from level 1')
      goToRoot()
    } else {
      // Go back to previous level
      const targetIndex = breadcrumbs.length - 2
      console.log('⬆️ Going back one level to:', targetIndex)
      goToBreadcrumb(targetIndex)
    }
  }

  // Volume selection function
  const selectVolume = (mesh: THREE.Mesh | null) => {
    // Restore previous selection
    if (selectedVolumeRef.current && originalMaterialsRef.current.has(selectedVolumeRef.current)) {
      selectedVolumeRef.current.material = originalMaterialsRef.current.get(selectedVolumeRef.current)!
    }
    
    // Apply selection to new mesh
    if (mesh && outlineMaterialRef.current) {
      selectedVolumeRef.current = mesh
      mesh.material = outlineMaterialRef.current
    } else {
      selectedVolumeRef.current = null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Mother GLB...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 mb-2">Failed to Load</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Hierarchy Info & Breadcrumbs */}
      <div className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur rounded-lg px-3 py-2">
        <div className="text-sm text-white mb-2">
          <span className="font-semibold text-green-400">{visibleVolumes.size}</span>
          <span className="text-gray-300 ml-1">visible volumes</span>
          <span className="text-gray-500 ml-1">• Level {hierarchyLevel}</span>
        </div>
        
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="text-xs text-blue-300 mb-1">
            <span className="text-gray-400">Path: </span>
            <span className="cursor-pointer hover:text-blue-200" onClick={() => goToRoot()}>
              Root
            </span>
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.guid}>
                <span className="text-gray-500"> → </span>
                <span 
                  className="cursor-pointer hover:text-blue-200"
                  onClick={() => goToBreadcrumb(index)}
                >
                  {crumb.name.substring(0, 15)}...
                </span>
              </span>
            ))}
          </div>
        )}
        
        <div className="text-xs text-gray-400">
          {hierarchyLevel === 0 
            ? 'Click parent volumes to drill down'
            : `Press ESC or click breadcrumbs to go back`
          }
        </div>
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur rounded-lg px-3 py-2">
        <div className="text-xs text-gray-300">
          <div>• Left click + drag: Rotate</div>
          <div>• Right click + drag: Pan</div>
          <div>• Scroll: Zoom</div>
          <div>• <span className="text-yellow-300 font-semibold">F key</span>: Zoom to extents</div>
          <div>• <span className="text-red-300 font-semibold">ESC key</span>: Go back up hierarchy</div>
          <div>• Click parent: Drill down to children</div>
          <div>• Click leaf: Select for Revit data</div>
        </div>
      </div>
    </div>
  )
}