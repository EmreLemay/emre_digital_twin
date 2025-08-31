import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
) {
  try {
    const { guid } = await params

    if (!guid) {
      return NextResponse.json(
        { error: 'GUID parameter is required' },
        { status: 400 }
      )
    }

    // Extract GUID from filename (GLB or panorama)
    // GLB files: "46ad14df-85fd-41dc-b1b4-0a7baf1b5412-003cf5ca.glb"
    // Panorama files: "a0edc2ea-5ecb-4332-992e-6785ae78c6c8-003daafc_360.jpg"
    const cleanGuid = guid
      .replace(/\.(glb|GLB)$/, '')  // Remove .glb extension
      .replace(/_360\.(jpg|jpeg|png|JPG|JPEG|PNG)$/, '')  // Remove _360.jpg suffix

    // Find asset by GUID including all metadata
    const asset = await prisma.asset.findUnique({
      where: { guid: cleanGuid },
      include: {
        metadata: {
          orderBy: [
            { parameterName: 'asc' }
          ]
        }
      }
    })

    if (!asset) {
      return NextResponse.json(
        { error: `Asset not found for GUID: ${cleanGuid}` },
        { status: 404 }
      )
    }

    // Structure the response
    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        guid: asset.guid,
        name: asset.name,
        category: asset.category,
        filePath: asset.filePath,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        metadata: asset.metadata.map(meta => ({
          id: meta.id,
          parameterName: meta.parameterName,
          parameterValue: meta.parameterValue,
          parameterType: meta.parameterType
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching asset by GUID:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to fetch asset: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// Update asset metadata parameter
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
) {
  try {
    const { guid } = await params
    const { parameterId, parameterValue } = await request.json()

    if (!guid || !parameterId || parameterValue === undefined) {
      return NextResponse.json(
        { error: 'GUID, parameterId, and parameterValue are required' },
        { status: 400 }
      )
    }

    // Extract GUID from filename (GLB or panorama)
    const cleanGuid = guid
      .replace(/\.(glb|GLB)$/, '')  // Remove .glb extension
      .replace(/_360\.(jpg|jpeg|png|JPG|JPEG|PNG)$/, '')  // Remove _360.jpg suffix

    // Find the asset first
    const asset = await prisma.asset.findUnique({
      where: { guid: cleanGuid }
    })

    if (!asset) {
      return NextResponse.json(
        { error: `Asset not found for GUID: ${cleanGuid}` },
        { status: 404 }
      )
    }

    // Update the specific parameter
    const updatedParameter = await prisma.assetMetadata.update({
      where: {
        id: parseInt(parameterId),
        assetId: asset.id // Ensure parameter belongs to this asset
      },
      data: {
        parameterValue: parameterValue.toString()
      }
    })

    return NextResponse.json({
      success: true,
      parameter: {
        id: updatedParameter.id,
        parameterName: updatedParameter.parameterName,
        parameterValue: updatedParameter.parameterValue,
        parameterType: updatedParameter.parameterType
      }
    })

  } catch (error) {
    console.error('Error updating asset parameter:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to update parameter: ${errorMessage}` },
      { status: 500 }
    )
  }
}