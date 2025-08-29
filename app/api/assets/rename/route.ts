import { NextRequest, NextResponse } from 'next/server'
import { rename } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { oldPath, newName } = await request.json()

    if (!oldPath || !newName) {
      return NextResponse.json({ 
        success: false, 
        error: 'Old path and new name are required' 
      })
    }

    // Security: only allow renaming files in assets folders
    if (!oldPath.startsWith('/assets/glb/') && !oldPath.startsWith('/assets/panoramas/')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file path' 
      })
    }

    // Get the original file extension
    const oldExtension = extname(oldPath)
    const newNameWithExtension = newName.endsWith(oldExtension) ? newName : newName + oldExtension

    // Validate filename (no special characters, reasonable length)
    if (!/^[a-zA-Z0-9._\-\s()]+$/.test(newNameWithExtension)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid filename. Use only letters, numbers, spaces, dots, hyphens, underscores, and parentheses.' 
      })
    }

    if (newNameWithExtension.length > 255) {
      return NextResponse.json({ 
        success: false, 
        error: 'Filename too long (max 255 characters)' 
      })
    }

    // Convert paths to actual file system paths
    const oldActualPath = join(process.cwd(), 'public', oldPath)
    const directory = dirname(oldActualPath)
    const newActualPath = join(directory, newNameWithExtension)

    // Check if new name already exists
    try {
      await import('fs/promises').then(fs => fs.access(newActualPath))
      return NextResponse.json({ 
        success: false, 
        error: 'A file with this name already exists' 
      })
    } catch {
      // File doesn't exist, good to proceed
    }

    // Rename the file
    await rename(oldActualPath, newActualPath)
    
    // Generate new public path
    const newPublicPath = oldPath.replace(basename(oldPath), newNameWithExtension)
    
    console.log(`File renamed successfully: ${oldActualPath} -> ${newActualPath}`)

    return NextResponse.json({
      success: true,
      message: 'File renamed successfully',
      oldPath,
      newPath: newPublicPath,
      newName: newNameWithExtension
    })

  } catch (error) {
    console.error('Error renaming file:', error)
    
    // Check specific error types
    if ((error as any).code === 'ENOENT') {
      return NextResponse.json({ 
        success: false, 
        error: 'Original file not found' 
      })
    }
    
    if ((error as any).code === 'EACCES') {
      return NextResponse.json({ 
        success: false, 
        error: 'Permission denied' 
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to rename file' 
    })
  }
}