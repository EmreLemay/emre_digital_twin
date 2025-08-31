import { NextResponse } from 'next/server'
import { existsSync, unlinkSync } from 'fs'
import path from 'path'

export async function DELETE() {
  try {
    const motherGlbPath = path.join(process.cwd(), 'public', 'mother-glb', 'mother.glb')
    
    if (existsSync(motherGlbPath)) {
      // Delete the file
      unlinkSync(motherGlbPath)
      console.log('🗑️ Persistent mother GLB file deleted:', motherGlbPath)
      
      return NextResponse.json({
        success: true,
        message: 'Persistent mother GLB file cleared successfully'
      })
    } else {
      return NextResponse.json({
        success: true,
        message: 'No mother GLB file found to clear'
      })
    }
    
  } catch (error) {
    console.error('Error clearing mother GLB file:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to clear mother GLB file'
    })
  }
}