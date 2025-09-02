import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Extract GUID from filename (GLB or panorama) using improved logic
function extractGuidFromFilename(filename: string): string | null {
  console.log('🔍 API: Extracting GUID from filename:', filename)
  
  // Handle GLB files
  if (filename.toLowerCase().endsWith('.glb')) {
    // First try to match the extended format: GUID-extension (e.g., 21a96bfe-1d2f-4913-a727-8c72a07cf272-003cf9e2)
    let guidMatch = filename.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{8})\.glb$/i)
    let guid = guidMatch ? guidMatch[1] : null
    
    // If not found, try standard GUID format (allowing any alphanumeric characters for flexibility)
    if (!guid) {
      guidMatch = filename.match(/([0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12})\.glb$/i)
      guid = guidMatch ? guidMatch[1] : null
    }
    
    // If still not found, try to extract just the filename without extension as GUID
    if (!guid) {
      const nameWithoutExt = filename.replace(/\.glb$/i, '')
      if (nameWithoutExt.length > 0) {
        guid = nameWithoutExt
      }
    }
    
    console.log('🔍 API: GLB GUID extraction result:', { filename, guid })
    return guid?.toLowerCase() || null
  }
  
  // Handle panorama files
  if (/_360\.(jpg|jpeg|png|JPG|JPEG|PNG)$/.test(filename)) {
    const guid = filename.replace(/_360\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i, '')
    console.log('🔍 API: Panorama GUID extraction result:', { filename, guid })
    return guid.toLowerCase()
  }
  
  console.log('🔍 API: No GUID pattern matched for:', filename)
  return null
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