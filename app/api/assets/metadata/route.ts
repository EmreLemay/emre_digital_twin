import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Get metadata for a file asset
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

    // Get or create file asset
    let fileAsset = await prisma.fileAsset.findUnique({
      where: { filepath },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    if (!fileAsset) {
      // Create file asset if it doesn't exist
      const filename = filepath.split('/').pop() || 'unknown'
      const fileType = filepath.includes('/glb/') ? 'GLB' : 'PANORAMA'

      fileAsset = await prisma.fileAsset.create({
        data: {
          filename,
          filepath,
          fileType,
          size: 0, // Will be updated later
        },
        include: {
          tags: {
            include: {
              tag: true
            }
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      metadata: {
        id: fileAsset.id,
        description: fileAsset.description,
        tags: fileAsset.tags.map(ft => ({
          id: ft.tag.id,
          name: ft.tag.name,
          color: ft.tag.color
        }))
      }
    })

  } catch (error) {
    console.error('Error getting asset metadata:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get metadata' 
    })
  }
}

// Update metadata for a file asset
export async function POST(request: NextRequest) {
  try {
    const { filepath, description, tags } = await request.json()

    if (!filepath) {
      return NextResponse.json({ 
        success: false, 
        error: 'File path is required' 
      })
    }

    // Get or create file asset
    const filename = filepath.split('/').pop() || 'unknown'
    const fileType = filepath.includes('/glb/') ? 'GLB' : 'PANORAMA'

    const fileAsset = await prisma.fileAsset.upsert({
      where: { filepath },
      create: {
        filename,
        filepath,
        fileType,
        size: 0,
        description: description || null
      },
      update: {
        description: description || null
      }
    })

    // Handle tags if provided
    if (Array.isArray(tags)) {
      // Remove existing tags
      await prisma.fileAssetTag.deleteMany({
        where: { fileAssetId: fileAsset.id }
      })

      // Add new tags
      for (const tagName of tags) {
        if (!tagName.trim()) continue

        // Get or create tag
        const tag = await prisma.tag.upsert({
          where: { name: tagName.trim() },
          create: { name: tagName.trim() },
          update: {}
        })

        // Link tag to asset
        await prisma.fileAssetTag.create({
          data: {
            fileAssetId: fileAsset.id,
            tagId: tag.id
          }
        })
      }
    }

    // Return updated metadata
    const updatedAsset = await prisma.fileAsset.findUnique({
      where: { id: fileAsset.id },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      metadata: {
        id: updatedAsset!.id,
        description: updatedAsset!.description,
        tags: updatedAsset!.tags.map(ft => ({
          id: ft.tag.id,
          name: ft.tag.name,
          color: ft.tag.color
        }))
      }
    })

  } catch (error) {
    console.error('Error updating asset metadata:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update metadata' 
    })
  }
}