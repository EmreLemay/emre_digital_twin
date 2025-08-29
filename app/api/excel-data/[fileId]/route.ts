import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = parseInt(params.fileId)

    if (isNaN(fileId)) {
      return NextResponse.json(
        { error: 'Invalid file ID' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sheetName = searchParams.get('sheet')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const skip = (page - 1) * limit

    // Get file info
    const file = await prisma.excelFile.findUnique({
      where: { id: fileId },
      include: {
        worksheets: {
          select: {
            id: true,
            sheetName: true,
            rowCount: true,
            columnCount: true,
          },
        },
      },
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // If specific sheet requested
    if (sheetName) {
      const worksheet = file.worksheets.find(ws => ws.sheetName === sheetName)
      
      if (!worksheet) {
        return NextResponse.json(
          { error: 'Worksheet not found' },
          { status: 404 }
        )
      }

      // Get paginated row data
      const rows = await prisma.excelRow.findMany({
        where: {
          worksheet: {
            excelFileId: fileId,
            sheetName: sheetName,
          },
        },
        orderBy: { rowIndex: 'asc' },
        skip: skip,
        take: limit,
      })

      // Get total count
      const totalRows = await prisma.excelRow.count({
        where: {
          worksheet: {
            excelFileId: fileId,
            sheetName: sheetName,
          },
        },
      })

      return NextResponse.json({
        success: true,
        file: {
          id: file.id,
          originalName: file.originalName,
          uploadedAt: file.uploadedAt,
          status: file.status,
        },
        worksheet: worksheet,
        rows: rows.map(row => ({
          rowIndex: row.rowIndex,
          data: JSON.parse(row.data),
          createdAt: row.createdAt,
        })),
        pagination: {
          page,
          limit,
          total: totalRows,
          totalPages: Math.ceil(totalRows / limit),
        },
      })
    }

    // Return file info with all worksheets
    return NextResponse.json({
      success: true,
      file: {
        id: file.id,
        originalName: file.originalName,
        uploadedAt: file.uploadedAt,
        processedAt: file.processedAt,
        status: file.status,
        fileSize: file.fileSize,
      },
      worksheets: file.worksheets,
    })

  } catch (error) {
    console.error('Error fetching Excel data:', error)
    return NextResponse.json(
      { error: 'Error fetching data' },
      { status: 500 }
    )
  }
}