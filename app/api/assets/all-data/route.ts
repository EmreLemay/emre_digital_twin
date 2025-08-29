import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Fetch all assets with their metadata
    const assets = await prisma.asset.findMany({
      include: {
        metadata: {
          orderBy: {
            parameterName: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform data into a flat structure suitable for table display
    const tableData = assets.flatMap(asset => {
      if (asset.metadata.length === 0) {
        // Asset with no metadata - show basic info only
        return [{
          assetId: asset.id,
          assetGuid: asset.guid,
          assetName: asset.name,
          assetCategory: asset.category,
          assetFilePath: asset.filePath,
          assetCreatedAt: asset.createdAt,
          assetUpdatedAt: asset.updatedAt,
          parameterId: null,
          parameterName: null,
          parameterValue: null,
          parameterType: null
        }]
      }

      // Asset with metadata - create row for each parameter
      return asset.metadata.map(param => ({
        assetId: asset.id,
        assetGuid: asset.guid,
        assetName: asset.name,
        assetCategory: asset.category,
        assetFilePath: asset.filePath,
        assetCreatedAt: asset.createdAt,
        assetUpdatedAt: asset.updatedAt,
        parameterId: param.id,
        parameterName: param.parameterName,
        parameterValue: param.parameterValue,
        parameterType: param.parameterType
      }))
    })

    return NextResponse.json({
      success: true,
      data: tableData,
      totalAssets: assets.length,
      totalParameters: tableData.filter(row => row.parameterId).length
    })

  } catch (error) {
    console.error('Error fetching all asset data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to fetch asset data: ${errorMessage}` },
      { status: 500 }
    )
  }
}