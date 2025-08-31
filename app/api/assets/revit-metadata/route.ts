import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Extract GUID from filename (GLB or panorama)
function extractGuidFromFilename(filename: string): string | null {
  // GLB files: "46ad14df-85fd-41dc-b1b4-0a7baf1b5412-003cf5ca.glb"
  // Panorama files: "a0edc2ea-5ecb-4332-992e-6785ae78c6c8-003daafc_360.jpg"
  return filename
    .replace(/\.(glb|GLB)$/, '')  // Remove .glb extension
    .replace(/_360\.(jpg|jpeg|png|JPG|JPEG|PNG)$/, '')  // Remove _360.jpg suffix
    .toLowerCase()
}

// Get Revit metadata for GLB or panorama files by extracting GUID from filename
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filepath = searchParams.get('filepath')

    if (!filepath) {
      return NextResponse.json({ 
        success: false, 
        error: 'File path is required' 
      })
    }

    // Extract filename from filepath
    const filename = filepath.split('/').pop()
    if (!filename) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file path' 
      })
    }
    
    // Support both GLB and panorama files
    const isGLB = filename.endsWith('.glb') || filename.endsWith('.GLB')
    const isPanorama = /_360\.(jpg|jpeg|png|JPG|JPEG|PNG)$/.test(filename)
    
    if (!isGLB && !isPanorama) {
      return NextResponse.json({ 
        success: false, 
        error: 'File must be a GLB or panorama file (_360.jpg)' 
      })
    }

    // Extract GUID from filename
    const guid = extractGuidFromFilename(filename)
    if (!guid) {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not extract GUID from filename' 
      })
    }

    // Find the asset by GUID
    const asset = await prisma.asset.findUnique({
      where: { guid },
      include: {
        metadata: true
      }
    })

    if (!asset) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Revit data found for this GUID',
        guid 
      })
    }

    // Format metadata for display
    const formattedMetadata = asset.metadata.reduce((acc, meta) => {
      acc[meta.parameterName] = {
        value: meta.parameterValue,
        type: meta.parameterType
      }
      return acc
    }, {} as Record<string, { value: string; type: string }>)

    return NextResponse.json({
      success: true,
      guid,
      asset: {
        id: asset.id,
        guid: asset.guid,
        name: asset.name,
        category: asset.category,
        filePath: asset.filePath,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt
      },
      metadata: formattedMetadata,
      parameterCount: asset.metadata.length
    })

  } catch (error) {
    console.error('Error getting Revit metadata:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get Revit metadata' 
    })
  }
}