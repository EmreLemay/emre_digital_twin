import { NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'

interface AssetFile {
  name: string
  type: 'glb' | 'panorama'
  size: number
  lastModified: Date
  publicPath: string
}

export async function GET() {
  try {
    const assets: AssetFile[] = []
    
    // Get GLB files
    try {
      const glbDir = join(process.cwd(), 'public/assets/glb')
      const glbFiles = await readdir(glbDir)
      
      for (const file of glbFiles) {
        if (file.endsWith('.glb')) {
          const filePath = join(glbDir, file)
          const stats = await stat(filePath)
          
          assets.push({
            name: file,
            type: 'glb',
            size: stats.size,
            lastModified: stats.mtime,
            publicPath: `/assets/glb/${file}`
          })
        }
      }
    } catch (error) {
      console.log('No GLB directory or files found')
    }
    
    // Get panorama files
    try {
      const panoramaDir = join(process.cwd(), 'public/assets/panoramas')
      const panoramaFiles = await readdir(panoramaDir)
      
      for (const file of panoramaFiles) {
        if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.webp')) {
          const filePath = join(panoramaDir, file)
          const stats = await stat(filePath)
          
          assets.push({
            name: file,
            type: 'panorama',
            size: stats.size,
            lastModified: stats.mtime,
            publicPath: `/assets/panoramas/${file}`
          })
        }
      }
    } catch (error) {
      console.log('No panorama directory or files found')
    }
    
    // Sort by last modified (newest first)
    assets.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
    
    return NextResponse.json({
      success: true,
      assets
    })

  } catch (error) {
    console.error('Error listing assets:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to list assets' 
    })
  }
}