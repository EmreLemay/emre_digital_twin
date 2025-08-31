import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file: File | null = formData.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' })
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.glb')) {
      return NextResponse.json({ success: false, error: 'Only GLB files are allowed' })
    }

    // Create mother-glb directory if it doesn't exist
    const motherGlbDir = path.join(process.cwd(), 'public', 'mother-glb')
    if (!existsSync(motherGlbDir)) {
      await mkdir(motherGlbDir, { recursive: true })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save as mother.glb (single file, overwrite existing)
    const filePath = path.join(motherGlbDir, 'mother.glb')
    await writeFile(filePath, buffer)

    console.log(`Mother GLB uploaded successfully: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    return NextResponse.json({ 
      success: true,
      publicPath: '/mother-glb/mother.glb',
      fileName: file.name,
      fileSize: file.size,
      message: 'Mother GLB uploaded successfully'
    })

  } catch (error) {
    console.error('Mother GLB upload error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to upload mother GLB file' 
    })
  }
}