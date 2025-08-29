import { NextRequest, NextResponse } from 'next/server'
import { RevitImporter } from '@/lib/revit-importer'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const importer = new RevitImporter()
    let result

    // Determine file type and import accordingly
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      result = await importer.importFromExcel(file)
    } else if (file.name.endsWith('.csv')) {
      result = await importer.importFromCSV(file)
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use .xlsx, .xls, or .csv' }, { status: 400 })
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully imported ${result.count} assets`,
        count: result.count,
        errors: result.errors
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Import completed with errors',
        count: result.count,
        errors: result.errors
      }, { status: 207 }) // 207 = Multi-Status
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: 'Import failed: ' + errorMessage }, { status: 500 })
  }
}