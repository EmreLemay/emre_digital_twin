import { NextResponse } from 'next/server'
import { existsSync, statSync } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const motherGlbPath = path.join(process.cwd(), 'public', 'mother-glb', 'mother.glb')
    
    if (existsSync(motherGlbPath)) {
      // Get file stats
      const stats = statSync(motherGlbPath)
      const fileSizeInMB = (stats.size / 1024 / 1024).toFixed(2)
      
      return NextResponse.json({
        exists: true,
        fileName: 'mother.glb',
        filePath: '/mother-glb/mother.glb',
        fileSize: stats.size,
        fileSizeFormatted: `${fileSizeInMB} MB`,
        lastModified: stats.mtime.toISOString(),
        lastModifiedFormatted: stats.mtime.toLocaleString(),
        message: 'Mother GLB file found'
      })
    } else {
      return NextResponse.json({
        exists: false,
        message: 'No mother GLB file found'
      })
    }
    
  } catch (error) {
    console.error('Error checking mother GLB file:', error)
    return NextResponse.json({
      exists: false,
      error: 'Failed to check for mother GLB file'
    })
  }
}