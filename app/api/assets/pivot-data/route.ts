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

    // Get all unique parameter names across all assets
    const allParameterNames = new Set<string>()
    assets.forEach(asset => {
      asset.metadata.forEach(param => {
        allParameterNames.add(param.parameterName)
      })
    })
    
    const sortedParameterNames = Array.from(allParameterNames).sort()

    // Transform data into pivot table format
    const pivotData = assets.map(asset => {
      // Start with basic asset info
      const row: any = {
        assetId: asset.id,
        assetGuid: asset.guid,
        assetName: asset.name,
        assetCategory: asset.category,
        assetFilePath: asset.filePath,
        assetCreatedAt: asset.createdAt,
        assetUpdatedAt: asset.updatedAt
      }

      // Create a lookup for this asset's parameters
      const parameterMap = new Map()
      asset.metadata.forEach(param => {
        parameterMap.set(param.parameterName, {
          value: param.parameterValue,
          type: param.parameterType,
          id: param.id
        })
      })

      // Add all parameter columns, with values if they exist for this asset
      sortedParameterNames.forEach(paramName => {
        const param = parameterMap.get(paramName)
        row[`param_${paramName}`] = param ? param.value : null
        row[`paramType_${paramName}`] = param ? param.type : null
        row[`paramId_${paramName}`] = param ? param.id : null
      })

      return row
    })

    return NextResponse.json({
      success: true,
      data: pivotData,
      parameterNames: sortedParameterNames,
      totalAssets: assets.length,
      totalParameters: sortedParameterNames.length
    })

  } catch (error) {
    console.error('Error fetching pivot data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to fetch pivot data: ${errorMessage}` },
      { status: 500 }
    )
  }
}