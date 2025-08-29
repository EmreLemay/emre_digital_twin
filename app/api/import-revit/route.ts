import { NextRequest, NextResponse } from 'next/server'
import { RevitImporter } from '@/lib/revit-importer'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const importer = new RevitImporter()
    let result

    // Determine file type and use appropriate importer
    if (file.name.endsWith('.csv')) {
      result = await importer.importFromCSV(file)
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      result = await importer.importFromExcel(file)
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a CSV or Excel file.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Successfully imported ${result.count} assets`
        : 'Import completed with errors',
      count: result.count,
      errors: result.errors
    })

  } catch (error) {
    console.error('Error in import-revit API:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Import failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get summary of imported assets
    const { prisma } = await import('@/lib/prisma')
    
    const totalAssets = await prisma.asset.count()
    const categories = await prisma.asset.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } }
    })

    const recentAssets = await prisma.asset.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { metadata: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      summary: {
        totalAssets,
        categories: categories.map(cat => ({
          category: cat.category || 'Unknown',
          count: cat._count.category
        })),
        recentAssets: recentAssets.map(asset => ({
          id: asset.id,
          guid: asset.guid,
          name: asset.name,
          category: asset.category,
          parameterCount: asset._count.metadata,
          createdAt: asset.createdAt
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching Revit assets summary:', error)
    return NextResponse.json(
      { error: 'Error fetching assets summary' },
      { status: 500 }
    )
  }
}