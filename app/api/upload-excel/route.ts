import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { FileProcessingStatus, ExcelDataType } from '@prisma/client'

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

    // Validate file type
    if (!file.type.includes('spreadsheet') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file.' },
        { status: 400 }
      )
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Create ExcelFile record
    const excelFile = await prisma.excelFile.create({
      data: {
        fileName: `${Date.now()}-${file.name}`,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: FileProcessingStatus.PROCESSING,
      },
    })

    try {
      // Parse Excel file using XLSX
      const workbook = XLSX.read(buffer, { type: 'array' })
      
      // Process each worksheet
      for (let i = 0; i < workbook.SheetNames.length; i++) {
        const sheetName = workbook.SheetNames[i]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert sheet to JSON
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          raw: false 
        }) as any[][]
        
        // Create Worksheet record
        const worksheetRecord = await prisma.worksheet.create({
          data: {
            excelFileId: excelFile.id,
            sheetName: sheetName,
            sheetIndex: i,
            rowCount: sheetData.length,
            columnCount: sheetData[0]?.length || 0,
          },
        })

        // Store row data
        for (let rowIndex = 0; rowIndex < sheetData.length; rowIndex++) {
          const rowData = sheetData[rowIndex]
          
          // Store entire row as JSON
          await prisma.excelRow.create({
            data: {
              worksheetId: worksheetRecord.id,
              rowIndex: rowIndex,
              data: JSON.stringify(rowData),
            },
          })

          // Store individual cell data for flexible querying
          if (Array.isArray(rowData)) {
            for (let colIndex = 0; colIndex < rowData.length; colIndex++) {
              const cellValue = rowData[colIndex]
              const columnName = rowIndex === 0 ? 
                (cellValue?.toString() || `Column_${colIndex + 1}`) : 
                `Column_${colIndex + 1}`

              // Determine data type
              let dataType: ExcelDataType = ExcelDataType.TEXT
              if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
                const stringValue = cellValue.toString()
                if (!isNaN(Number(stringValue)) && stringValue !== '') {
                  dataType = ExcelDataType.NUMBER
                } else if (stringValue.toLowerCase() === 'true' || stringValue.toLowerCase() === 'false') {
                  dataType = ExcelDataType.BOOLEAN
                } else if (stringValue.startsWith('=')) {
                  dataType = ExcelDataType.FORMULA
                } else if (!isNaN(Date.parse(stringValue))) {
                  dataType = ExcelDataType.DATE
                }
              }

              await prisma.excelData.create({
                data: {
                  fileId: excelFile.id,
                  sheetName: sheetName,
                  rowIndex: rowIndex,
                  columnName: columnName,
                  columnIndex: colIndex,
                  value: cellValue?.toString() || null,
                  dataType: dataType,
                },
              })
            }
          }
        }
      }

      // Update file status to completed
      await prisma.excelFile.update({
        where: { id: excelFile.id },
        data: {
          status: FileProcessingStatus.COMPLETED,
          processedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        fileId: excelFile.id,
        message: 'Excel file processed successfully',
        worksheets: workbook.SheetNames.length,
      })

    } catch (processingError) {
      console.error('Error processing Excel file:', processingError)
      
      // Update file status to failed
      await prisma.excelFile.update({
        where: { id: excelFile.id },
        data: {
          status: FileProcessingStatus.FAILED,
          errorMessage: processingError instanceof Error ? processingError.message : 'Unknown error',
        },
      })

      return NextResponse.json(
        { error: 'Error processing Excel file' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in upload-excel API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get all uploaded Excel files with their processing status
    const files = await prisma.excelFile.findMany({
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
      orderBy: {
        uploadedAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      files: files,
    })
  } catch (error) {
    console.error('Error fetching Excel files:', error)
    return NextResponse.json(
      { error: 'Error fetching files' },
      { status: 500 }
    )
  }
}