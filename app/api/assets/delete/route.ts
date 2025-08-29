import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ 
        success: false, 
        error: 'File path is required' 
      })
    }

    // Security: only allow deletion from assets folders
    if (!filePath.startsWith('/assets/glb/') && !filePath.startsWith('/assets/panoramas/')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file path' 
      })
    }

    // Convert public path to actual file system path
    const actualPath = join(process.cwd(), 'public', filePath)
    
    // Delete the file
    await unlink(actualPath)
    
    console.log(`File deleted successfully: ${actualPath}`)

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting file:', error)
    
    // Check if file doesn't exist
    if ((error as any).code === 'ENOENT') {
      return NextResponse.json({ 
        success: false, 
        error: 'File not found' 
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete file' 
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { filePaths } = await request.json()

    if (!filePaths || !Array.isArray(filePaths)) {
      return NextResponse.json({ 
        success: false, 
        error: 'File paths array is required' 
      })
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const filePath of filePaths) {
      try {
        // Security: only allow deletion from assets folders
        if (!filePath.startsWith('/assets/glb/') && !filePath.startsWith('/assets/panoramas/')) {
          results.push({ path: filePath, success: false, error: 'Invalid file path' })
          errorCount++
          continue
        }

        // Convert public path to actual file system path
        const actualPath = join(process.cwd(), 'public', filePath)
        
        // Delete the file
        await unlink(actualPath)
        
        results.push({ path: filePath, success: true })
        successCount++
        
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error)
        results.push({ 
          path: filePath, 
          success: false, 
          error: (error as any).code === 'ENOENT' ? 'File not found' : 'Failed to delete'
        })
        errorCount++
      }
    }

    console.log(`Bulk delete completed: ${successCount} success, ${errorCount} errors`)

    return NextResponse.json({
      success: errorCount === 0,
      message: `Deleted ${successCount} files${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      results,
      successCount,
      errorCount
    })

  } catch (error) {
    console.error('Error in bulk delete:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process bulk delete' 
    })
  }
}