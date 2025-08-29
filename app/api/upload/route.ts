import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determine file type and target directory
    const fileName = file.name.toLowerCase()
    let targetDir: string
    let publicPath: string

    if (fileName.endsWith('.glb')) {
      targetDir = join(process.cwd(), 'public/assets/glb')
      publicPath = `/assets/glb/${file.name}`
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp')) {
      targetDir = join(process.cwd(), 'public/assets/panoramas')
      publicPath = `/assets/panoramas/${file.name}`
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Unsupported file type. Please upload .glb, .jpg, .png, or .webp files' 
      })
    }

    // Write file to disk
    const filePath = join(targetDir, file.name)
    await writeFile(filePath, buffer)

    console.log(`File uploaded successfully: ${filePath}`)

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      publicPath: publicPath
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to upload file' 
    })
  }
}