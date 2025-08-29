import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Extract GUID from GLB filename
function extractGuidFromFilename(filename: string): string | null {
  // GLB files are named like: "46ad14df-85fd-41dc-b1b4-0a7baf1b5412-003cf5ca.glb"
  // Extract the first GUID part before the last dash
  const match = filename.match(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/)
  return match ? match[1] : null
}

// Get Revit metadata for a GLB file by extracting GUID from filename
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
    if (!filename || !filename.endsWith('.glb')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not a GLB file' 
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