import { prisma } from './prisma'
import { ExcelDataType } from '@prisma/client'

export interface ExcelQueryOptions {
  fileId: number
  sheetName?: string
  columnName?: string
  searchValue?: string
  dataType?: ExcelDataType
  page?: number
  limit?: number
}

export interface ExcelQueryResult {
  data: any[]
  total: number
  page: number
  totalPages: number
}

/**
 * Query Excel data with flexible filtering options
 */
export async function queryExcelData(options: ExcelQueryOptions): Promise<ExcelQueryResult> {
  const {
    fileId,
    sheetName,
    columnName,
    searchValue,
    dataType,
    page = 1,
    limit = 100
  } = options

  const skip = (page - 1) * limit
  
  // Build where clause
  const where: any = {
    fileId: fileId,
  }

  if (sheetName) {
    where.sheetName = sheetName
  }

  if (columnName) {
    where.columnName = columnName
  }

  if (searchValue) {
    where.value = {
      contains: searchValue
    }
  }

  if (dataType) {
    where.dataType = dataType
  }

  // Get data and count in parallel
  const [data, total] = await Promise.all([
    prisma.excelData.findMany({
      where,
      orderBy: [
        { rowIndex: 'asc' },
        { columnIndex: 'asc' }
      ],
      skip,
      take: limit,
      include: {
        excelFile: {
          select: {
            originalName: true,
            uploadedAt: true
          }
        }
      }
    }),
    prisma.excelData.count({ where })
  ])

  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  }
}

/**
 * Get unique values from a specific column
 */
export async function getUniqueColumnValues(
  fileId: number, 
  sheetName: string, 
  columnName: string
): Promise<string[]> {
  const uniqueValues = await prisma.excelData.findMany({
    where: {
      fileId,
      sheetName,
      columnName,
      value: {
        not: null
      }
    },
    select: {
      value: true
    },
    distinct: ['value'],
    orderBy: {
      value: 'asc'
    }
  })

  return uniqueValues.map(item => item.value!).filter(Boolean)
}

/**
 * Get column statistics
 */
export async function getColumnStats(
  fileId: number, 
  sheetName: string, 
  columnName: string
) {
  const stats = await prisma.excelData.groupBy({
    by: ['dataType'],
    where: {
      fileId,
      sheetName,
      columnName
    },
    _count: {
      value: true
    }
  })

  const totalCount = await prisma.excelData.count({
    where: {
      fileId,
      sheetName,
      columnName
    }
  })

  const nullCount = await prisma.excelData.count({
    where: {
      fileId,
      sheetName,
      columnName,
      OR: [
        { value: null },
        { value: '' }
      ]
    }
  })

  return {
    totalRows: totalCount,
    nullValues: nullCount,
    dataTypeDistribution: stats.map(stat => ({
      dataType: stat.dataType,
      count: stat._count.value
    }))
  }
}

/**
 * Search across all Excel files
 */
export async function searchAllExcelFiles(searchTerm: string, limit = 50) {
  return await prisma.excelData.findMany({
    where: {
      value: {
        contains: searchTerm
      }
    },
    take: limit,
    include: {
      excelFile: {
        select: {
          id: true,
          originalName: true,
          uploadedAt: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}