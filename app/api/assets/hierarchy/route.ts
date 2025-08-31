import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readdir, access } from 'fs/promises'
import { join } from 'path'

interface AssetNode {
  id: number
  guid: string
  name: string
  category: string
  filePath: string | null
  createdAt: string
  updatedAt: string
  children: AssetNode[]
  depth: number
  hasGLB?: boolean
  hasPanorama?: boolean
  metadata?: Array<{
    id: number
    parameterName: string
    parameterValue: string
    parameterType: string
  }>
}

export async function GET() {
  try {
    console.log('Building O_DD hierarchy...')

    // 1. Fetch all assets with their metadata
    const assets = await prisma.asset.findMany({
      include: {
        metadata: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    console.log(`Found ${assets.length} assets`)

    // 2. Check for existing GLB and panorama files
    const glbPath = join(process.cwd(), 'public/assets/glb')
    const panoramaPath = join(process.cwd(), 'public/assets/panoramas')
    
    let glbFiles: string[] = []
    let panoramaFiles: string[] = []
    
    try {
      glbFiles = await readdir(glbPath)
    } catch (e) {
      console.log('No GLB directory found')
    }
    
    try {
      panoramaFiles = await readdir(panoramaPath)
    } catch (e) {
      console.log('No panorama directory found')
    }

    // 3. Create O_DD hierarchy maps
    const assetMap = new Map<string, AssetNode>()
    const oddLevelMap = new Map<number, AssetNode[]>() // level -> assets[]
    const oddPathMap = new Map<string, AssetNode[]>() // "level1|level2|level3" -> assets[]

    // 4. Initialize asset nodes and extract O_DD hierarchy
    for (const asset of assets) {
      // Check if files exist for this asset
      const hasGLB = glbFiles.some(file => file.startsWith(asset.guid))
      const hasPanorama = panoramaFiles.some(file => file.startsWith(asset.guid) && file.includes('_360'))

      // Extract O_DD parameters to determine hierarchy depth
      const oddParams = {
        O_DD1: asset.metadata.find(m => m.parameterName === 'O_DD1')?.parameterValue?.trim() || null,
        O_DD2: asset.metadata.find(m => m.parameterName === 'O_DD2')?.parameterValue?.trim() || null,
        O_DD3: asset.metadata.find(m => m.parameterName === 'O_DD3')?.parameterValue?.trim() || null,
        O_DD4: asset.metadata.find(m => m.parameterName === 'O_DD4')?.parameterValue?.trim() || null
      }

      // Calculate actual hierarchy depth (count non-empty O_DD parameters)
      const hierarchyDepth = [oddParams.O_DD1, oddParams.O_DD2, oddParams.O_DD3, oddParams.O_DD4]
        .findIndex(param => !param) 
      const actualDepth = hierarchyDepth === -1 ? 4 : hierarchyDepth

      // Create hierarchy path for grouping (e.g., "CIRCULATION|HORIZONTAL|INTRA-OFFICE")
      const hierarchyPath = [oddParams.O_DD1, oddParams.O_DD2, oddParams.O_DD3, oddParams.O_DD4]
        .slice(0, actualDepth)
        .filter(param => param)
        .join('|')

      console.log(`Asset ${asset.guid}: Depth ${actualDepth}, Path: "${hierarchyPath}"`)

      const node: AssetNode = {
        id: asset.id,
        guid: asset.guid,
        name: asset.name || asset.guid,
        category: asset.category || 'Unknown',
        filePath: asset.filePath,
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString(),
        children: [],
        depth: actualDepth,
        hasGLB,
        hasPanorama,
        metadata: asset.metadata.concat([
          { id: 0, parameterName: 'O_DD_DEPTH', parameterValue: actualDepth.toString(), parameterType: 'computed' },
          { id: 0, parameterName: 'O_DD_PATH', parameterValue: hierarchyPath, parameterType: 'computed' }
        ])
      }

      assetMap.set(asset.guid, node)

      // Group by hierarchy depth level
      if (!oddLevelMap.has(actualDepth)) {
        oddLevelMap.set(actualDepth, [])
      }
      oddLevelMap.get(actualDepth)!.push(node)

      // Group by hierarchy path for building tree structure
      if (hierarchyPath && !oddPathMap.has(hierarchyPath)) {
        oddPathMap.set(hierarchyPath, [])
      }
      if (hierarchyPath) {
        oddPathMap.get(hierarchyPath)!.push(node)
      }
    }

    console.log(`Built asset map with ${assetMap.size} assets`)
    console.log(`O_DD Level distribution:`)
    for (const [level, assets] of oddLevelMap.entries()) {
      console.log(`  Level ${level}: ${assets.length} assets`)
    }

    // 5. Build O_DD hierarchy tree structure
    interface HierarchyTreeNode {
      label: string
      level: number 
      path: string
      assets: AssetNode[]
      children: HierarchyTreeNode[]
    }

    const buildOddTree = (): HierarchyTreeNode[] => {
      const pathNodes = new Map<string, HierarchyTreeNode>()
      
      // Create nodes for each unique path
      for (const [path, assets] of oddPathMap.entries()) {
        if (!path) continue
        
        const pathSegments = path.split('|')
        
        // Create nodes for each level of this path
        for (let i = 0; i < pathSegments.length; i++) {
          const currentPath = pathSegments.slice(0, i + 1).join('|')
          const currentSegment = pathSegments[i]
          
          if (!pathNodes.has(currentPath)) {
            pathNodes.set(currentPath, {
              label: currentSegment,
              level: i,
              path: currentPath,
              assets: [],
              children: []
            })
          }
        }
        
        // Add assets to the deepest path node
        if (pathNodes.has(path)) {
          pathNodes.get(path)!.assets = assets
        }
      }
      
      // Build parent-child relationships
      for (const [path, node] of pathNodes.entries()) {
        const segments = path.split('|')
        if (segments.length > 1) {
          const parentPath = segments.slice(0, -1).join('|')
          const parentNode = pathNodes.get(parentPath)
          if (parentNode) {
            parentNode.children.push(node)
          }
        }
      }
      
      // Return root level nodes (those with only one segment)
      return Array.from(pathNodes.values())
        .filter(node => node.path.split('|').length === 1)
        .sort((a, b) => a.label.localeCompare(b.label))
    }

    const oddHierarchy = buildOddTree()

    // 6. Convert O_DD tree to AssetNode structure for compatibility
    const convertToAssetNodes = (oddNodes: HierarchyTreeNode[]): AssetNode[] => {
      return oddNodes.map(oddNode => {
        // Create a virtual node representing this O_DD category
        const virtualNode: AssetNode = {
          id: -1, // Virtual node
          guid: `odd_${oddNode.path}`,
          name: oddNode.label,
          category: `O_DD Level ${oddNode.level + 1}`,
          filePath: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          children: [],
          depth: oddNode.level,
          hasGLB: false,
          hasPanorama: false,
          metadata: [
            { id: 0, parameterName: 'O_DD_CATEGORY', parameterValue: oddNode.label, parameterType: 'virtual' },
            { id: 0, parameterName: 'O_DD_PATH', parameterValue: oddNode.path, parameterType: 'virtual' },
            { id: 0, parameterName: 'ASSET_COUNT', parameterValue: oddNode.assets.length.toString(), parameterType: 'virtual' }
          ]
        }
        
        // Add child categories
        if (oddNode.children.length > 0) {
          virtualNode.children = convertToAssetNodes(oddNode.children)
        }
        
        // Add actual assets as leaf nodes
        if (oddNode.assets.length > 0) {
          virtualNode.children.push(...oddNode.assets)
        }
        
        return virtualNode
      })
    }

    const roots = convertToAssetNodes(oddHierarchy)

    // 7. Find assets without O_DD classification (orphans)
    const orphanedNodes = Array.from(assetMap.values()).filter(asset => {
      const hasODD = asset.metadata?.some(m => 
        m.parameterName === 'O_DD1' && m.parameterValue?.trim()
      )
      return !hasODD
    })

    // 8. Calculate statistics
    const maxDepth = Math.max(...Array.from(oddLevelMap.keys()), 0)
    const totalAssets = assets.length

    console.log(`O_DD Hierarchy complete:`)
    console.log(`  Max O_DD depth: ${maxDepth}`)
    console.log(`  Total assets: ${totalAssets}`)
    console.log(`  Assets with O_DD classification: ${totalAssets - orphanedNodes.length}`)
    console.log(`  Assets without O_DD classification: ${orphanedNodes.length}`)

    return NextResponse.json({
      success: true,
      data: {
        roots,
        orphans: orphanedNodes,
        totalAssets,
        maxDepth,
        circularReferences: [], // No circular references in O_DD hierarchy
        oddLevels: Object.fromEntries(oddLevelMap.entries()),
        oddPaths: Array.from(oddPathMap.keys())
      }
    })

  } catch (error) {
    console.error('Error building hierarchy:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to build hierarchy: ${errorMessage}` 
      },
      { status: 500 }
    )
  }
}