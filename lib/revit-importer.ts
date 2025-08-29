import * as XLSX from 'xlsx'
import * as Papa from 'papaparse'
import { prisma } from './prisma'
import { ParameterType } from '@prisma/client'
import * as fs from 'fs'

export interface RevitScheduleRow {
  [key: string]: string | number | undefined
}

type ExcelInput =
  | File // browser
  | ArrayBuffer
  | Uint8Array
  | Buffer
  | string // filesystem path

export class RevitImporter {
  // Import from Excel (Revit Schedule export)
  async importFromExcel(input: ExcelInput): Promise<{ success: boolean; count: number; errors: string[] }> {
    try {
      const bytes = await this.readExcelInput(input)
      const workbook = XLSX.read(bytes, { type: 'array' })

      if (!workbook.SheetNames.length) {
        return { success: false, count: 0, errors: ['Excel file contains no worksheets'] }
      }

      // Use first sheet by default
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]

      // Parse with defaults; ensure empty cells become '' not undefined
      const rawRows: RevitScheduleRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

      if (!rawRows.length) {
        return { success: false, count: 0, errors: ['Excel worksheet contains no data'] }
      }

      // Normalize headers: trim header keys and coerce values to primitive strings/numbers where possible
      const data = rawRows.map(row => this.normalizeRow(row))

      return await this.processScheduleData(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return { success: false, count: 0, errors: [errorMessage] }
    }
  }

  // Import from CSV (alternative)
  async importFromCSV(file: File): Promise<{ success: boolean; count: number; errors: string[] }> {
    try {
      if (!file) {
        return { success: false, count: 0, errors: ['No file provided'] }
      }

      if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
        return { success: false, count: 0, errors: ['Invalid file type. Please provide a CSV file'] }
      }

      const text = await file.text()

      if (!text.trim()) {
        return { success: false, count: 0, errors: ['CSV file is empty'] }
      }

      return new Promise((resolve) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          transform: (value) => (typeof value === 'string' ? value.trim() : value),
          complete: async (results) => {
            if (results.errors.length > 0) {
              const parseErrors = results.errors.map(err => `CSV parsing error: ${err.message}`)
              resolve({ success: false, count: 0, errors: parseErrors })
              return
            }

            if (!results.data.length) {
              resolve({ success: false, count: 0, errors: ['CSV file contains no valid data rows'] })
              return
            }

            const normalized = (results.data as RevitScheduleRow[]).map(r => this.normalizeRow(r))
            const result = await this.processScheduleData(normalized)
            resolve(result)
          },
          error: (error: Error) => {
            resolve({ success: false, count: 0, errors: [`CSV parsing failed: ${error.message}`] })
          }
        })
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return { success: false, count: 0, errors: [errorMessage] }
    }
  }

  private normalizeRow(row: RevitScheduleRow): RevitScheduleRow {
    const out: RevitScheduleRow = {}
    for (const [k, v] of Object.entries(row)) {
      const key = (k ?? '').toString().trim()
      if (!key) continue
      if (typeof v === 'string') {
        const trimmed = v.trim()
        // Try to coerce numeric-looking strings to numbers; leave GUIDs and mixed alphas alone
        const num = Number(trimmed)
        out[key] = trimmed !== '' && !isNaN(num) && /^[+-]?\d+(\.\d+)?$/.test(trimmed) ? num : trimmed
      } else {
        out[key] = v
      }
    }
    return out
  }

  private async readExcelInput(input: ExcelInput): Promise<ArrayBuffer> {
    if (typeof input === 'string') {
      // Filesystem path
      const buf = fs.readFileSync(input)
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    }
    if (typeof File !== 'undefined' && input instanceof File) {
      return input.arrayBuffer()
    }
    if (input instanceof ArrayBuffer) return input
    if (input instanceof Uint8Array || (typeof Buffer !== 'undefined' && input instanceof Buffer)) {
      return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
    }
    throw new Error('Unsupported Excel input type')
  }

  private async processScheduleData(data: RevitScheduleRow[]): Promise<{ success: boolean; count: number; errors: string[] }> {
    const errors: string[] = []
    let importedCount = 0

    for (const row of data) {
      try {
        // REQUIRED MAPPING (as requested)
        const guid = this.extractGUID(row) // LCX_GUID
        const name = this.extractReadableName(row) // DATA_ROOM_NAME + DATA_ROOM_NUMBER
        const category = this.extractCategory(row) // DATA_FUNCTION

        if (!guid) {
          errors.push(`Skipping row - no LCX_GUID found: ${JSON.stringify(row)}`)
          continue
        }

        // Upsert asset by GUID
        const asset = await prisma.asset.upsert({
          where: { guid },
          update: {
            name,
            category,
            updatedAt: new Date()
          },
          create: {
            guid,
            name,
            category,
            filePath: null
          }
        })

        // Clear old metadata
        await prisma.assetMetadata.deleteMany({ where: { assetId: asset.id } })

        // Store ALL other columns as metadata (including DATA_FLOOR etc.)
        const metadataEntries: {
          assetId: number
          parameterName: string
          parameterValue: string
          parameterType: ParameterType
        }[] = []

        for (const [key, value] of Object.entries(row)) {
          if (!this.isParameterColumn(key)) continue
          if (value === null || value === undefined) continue
          const str = String(value).trim()
          if (str === '') continue

          metadataEntries.push({
            assetId: asset.id,
            parameterName: key,
            parameterValue: str,
            parameterType: this.guessParameterType(value)
          })
        }

        if (metadataEntries.length > 0) {
          await prisma.assetMetadata.createMany({ data: metadataEntries })
        }

        importedCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Error processing row: ${errorMessage}`)
      }
    }

    return { success: errors.length === 0, count: importedCount, errors }
  }

  // REQUIRED: LCX_GUID as unique identifier
  private extractGUID(row: RevitScheduleRow): string | null {
    const val = row['LCX_GUID']
    if (val !== null && val !== undefined) {
      const s = String(val).trim()
      if (s) return s
    }
    // Fallbacks if sheet headers differ
    const alt = ['UniqueId', 'GUID', 'ElementId', 'Id', 'Element ID']
    for (const col of alt) {
      const v = row[col]
      if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
    }
    return null
  }

  // REQUIRED: name = DATA_ROOM_NAME + ' ' + DATA_ROOM_NUMBER (if number exists)
  private extractReadableName(row: RevitScheduleRow): string {
    const roomName = String(row['DATA_ROOM_NAME'] ?? '').trim()
    const roomNumber = String(row['DATA_ROOM_NUMBER'] ?? '').trim()
    if (roomName && roomNumber) return `${roomName} ${roomNumber}`
    if (roomName) return roomName
    if (roomNumber) return roomNumber
    // conservative fallback
    return String(row['Name'] ?? 'Unnamed').trim() || 'Unnamed'
  }

  // REQUIRED: category = DATA_FUNCTION
  private extractCategory(row: RevitScheduleRow): string {
    const cat = String(row['DATA_FUNCTION'] ?? '').trim()
    if (cat) return cat
    // conservative fallback
    const fallbackCols = ['Category', 'Family Category']
    for (const col of fallbackCols) {
      const v = row[col]
      if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
    }
    return 'Unknown'
  }

  // ONLY skip the key columns; everything else becomes metadata
  private isParameterColumn(columnName: string): boolean {
    const keyCols = new Set([
      'LCX_GUID',
      'DATA_ROOM_NAME',
      'DATA_ROOM_NUMBER',
      'DATA_FUNCTION'
      // Do NOT skip DATA_FLOOR; it should be stored as metadata per spec ("all other columns")
    ])
    return !keyCols.has(columnName)
  }

  // Guess parameter type from value
  private guessParameterType(value: any): ParameterType {
    if (typeof value === 'number') return ParameterType.NUMBER
    if (typeof value === 'boolean') return ParameterType.BOOLEAN

    const strValue = String(value).trim()

    // Date
    if (!isNaN(Date.parse(strValue))) return ParameterType.DATE

    // Booleans
    if (/^(yes|no|true|false)$/i.test(strValue)) return ParameterType.BOOLEAN

    // Units
    if (/(?:^|\s)(m²|ft²|sq\.? ?(m|ft)|square)/i.test(strValue)) return ParameterType.AREA
    if (/(?:^|\s)(m³|ft³|cubic)/i.test(strValue)) return ParameterType.VOLUME
    if (/(mm|cm|m|ft|in|")$/i.test(strValue)) return ParameterType.LENGTH
    if (/°|degrees?/i.test(strValue)) return ParameterType.ANGLE

    // Pure numeric
    if (/^[+-]?\d+(\.\d+)?$/.test(strValue)) return ParameterType.NUMBER

    return ParameterType.TEXT
  }
}
