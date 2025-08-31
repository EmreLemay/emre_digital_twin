import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    const results = {
      processed: [] as string[],
      errors: [] as string[],
      skipped: [] as string[],
      totalFound: 0
    }

    // Scan GLB folder
    const glbBulkPath = path.join(process.cwd(), 'public/bulk-upload/glb')
    const panoramaBulkPath = path.join(process.cwd(), 'public/bulk-upload/panoramas')
    
    // Process GLB files
    if (fs.existsSync(glbBulkPath)) {
      const glbFiles = fs.readdirSync(glbBulkPath).filter(file => 
        file.toLowerCase().endsWith('.glb')
      )
      
      results.totalFound += glbFiles.length

      for (const filename of glbFiles) {
        try {
          // Extract full identifier from filename (format: uuid-suffix.glb)
          // Use the full filename (without .glb extension) as the unique identifier
          const guid = filename.replace('.glb', '').toLowerCase()
          
          // Check if asset already exists - we'll override it
          const existingAsset = await prisma.asset.findUnique({
            where: { guid }
          })

          // Move file to proper location
          const sourcePath = path.join(glbBulkPath, filename)
          const targetDir = path.join(process.cwd(), 'public/assets/glb')
          
          // Ensure target directory exists
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true })
          }

          const targetPath = path.join(targetDir, filename)
          
          // Move file (this will override if file exists)
          fs.renameSync(sourcePath, targetPath)

          // Create or update database entry
          let asset
          if (existingAsset) {
            asset = await prisma.asset.update({
              where: { guid },
              data: {
                name: filename.replace('.glb', ''),
                category: 'Bulk Upload',
                filePath: `/assets/glb/${filename}`,
                updatedAt: new Date()
              }
            })
            results.processed.push(`${filename}: Updated existing asset ID ${asset.id}`)
          } else {
            asset = await prisma.asset.create({
              data: {
                guid,
                name: filename.replace('.glb', ''),
                category: 'Bulk Upload',
                filePath: `/assets/glb/${filename}`
              }
            })
            results.processed.push(`${filename}: Created new asset ID ${asset.id}`)
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`${filename}: ${errorMessage}`)
        }
      }
    }

    // Process Panorama files
    if (fs.existsSync(panoramaBulkPath)) {
      const panoramaFiles = fs.readdirSync(panoramaBulkPath).filter(file => 
        /\.(jpg|jpeg|png|webp)$/i.test(file)
      )
      
      results.totalFound += panoramaFiles.length

      for (const filename of panoramaFiles) {
        try {
          // Extract GUID from panorama filename (format: [guid]_360.jpg)
          const guid = filename.replace('_360.jpg', '').toLowerCase()
          
          // Check if asset already exists - we'll override it
          const existingAsset = await prisma.asset.findUnique({
            where: { guid }
          })

          // Move file to proper location
          const sourcePath = path.join(panoramaBulkPath, filename)
          const targetDir = path.join(process.cwd(), 'public/assets/panoramas')
          
          // Ensure target directory exists
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true })
          }

          const targetPath = path.join(targetDir, filename)
          
          // Move file (this will override if file exists)
          fs.renameSync(sourcePath, targetPath)

          // Create or update database entry
          let asset
          if (existingAsset) {
            asset = await prisma.asset.update({
              where: { guid },
              data: {
                name: filename.replace('_360.jpg', ''),
                category: 'Bulk Upload - Panorama',
                filePath: `/assets/panoramas/${filename}`,
                updatedAt: new Date()
              }
            })
            results.processed.push(`${filename}: Updated existing panorama asset ID ${asset.id}`)
          } else {
            asset = await prisma.asset.create({
              data: {
                guid,
                name: filename.replace('_360.jpg', ''),
                category: 'Bulk Upload - Panorama',
                filePath: `/assets/panoramas/${filename}`
              }
            })
            results.processed.push(`${filename}: Created new panorama asset ID ${asset.id}`)
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`${filename}: ${errorMessage}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Bulk upload scan error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to scan bulk uploads: ${errorMessage}` },
      { status: 500 }
    )
  }
}