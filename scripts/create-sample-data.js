const { PrismaClient, ParameterType } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSampleData() {
  try {
    // Create a sample asset with the GUID that matches your GLB naming convention
    const sampleGuid = "21a96bfe-1d2f-4913-a727-8c72a07cf272-003cf9e2"
    
    console.log('Creating sample asset data...')
    
    // Create the asset
    const asset = await prisma.asset.upsert({
      where: { guid: sampleGuid },
      update: {
        name: "BUREAU OUVERT 377",
        category: "WORKSPACE",
        updatedAt: new Date()
      },
      create: {
        guid: sampleGuid,
        name: "BUREAU OUVERT 377", 
        category: "WORKSPACE",
        filePath: null
      }
    })

    console.log('Created asset:', asset)

    // Clear existing metadata
    await prisma.assetMetadata.deleteMany({
      where: { assetId: asset.id }
    })

    // Create sample metadata based on your expected data structure
    const metadata = [
      { parameterName: "DATA_FLOOR", parameterValue: "03", parameterType: "TEXT" },
      { parameterName: "DATA_ROOM_NUMBER", parameterValue: "377", parameterType: "TEXT" },
      { parameterName: "VOLUME M3", parameterValue: "103.6683483", parameterType: "VOLUME" },
      { parameterName: "AREA M2", parameterValue: "28.02604712", parameterType: "AREA" },
      { parameterName: "BUILDING NAME", parameterValue: "PHENIX", parameterType: "TEXT" },
      { parameterName: "FLOOR", parameterValue: "FLOOR 03", parameterType: "TEXT" },
      { parameterName: "ELEMENT TYPE", parameterValue: "ROOM", parameterType: "TEXT" },
      { parameterName: "FUNCTION", parameterValue: "FUNCTIONAL", parameterType: "TEXT" },
      { parameterName: "WORKSPACE TYPE", parameterValue: "WORKSPACES", parameterType: "TEXT" },
      { parameterName: "OFFICE TYPE", parameterValue: "OFFICES", parameterType: "TEXT" },
      { parameterName: "CONSTRUCTION YEAR", parameterValue: "1960", parameterType: "NUMBER" }
    ]

    const metadataEntries = metadata.map(meta => ({
      assetId: asset.id,
      parameterName: meta.parameterName,
      parameterValue: meta.parameterValue,
      parameterType: meta.parameterType
    }))

    await prisma.assetMetadata.createMany({
      data: metadataEntries
    })

    console.log(`Created ${metadataEntries.length} metadata entries`)

    // Create another sample asset for testing
    const sampleGuid2 = "cd8ac5ee-97e9-4195-ae3a-50787736c7df-003f8a8c"
    
    const asset2 = await prisma.asset.upsert({
      where: { guid: sampleGuid2 },
      update: {
        name: "FOCUS ROOM 318",
        category: "FOCUS",
        updatedAt: new Date()
      },
      create: {
        guid: sampleGuid2,
        name: "FOCUS ROOM 318", 
        category: "FOCUS",
        filePath: null
      }
    })

    const metadata2 = [
      { parameterName: "DATA_FLOOR", parameterValue: "02", parameterType: "TEXT" },
      { parameterName: "DATA_ROOM_NUMBER", parameterValue: "318", parameterType: "TEXT" },
      { parameterName: "VOLUME M3", parameterValue: "45.2341156", parameterType: "VOLUME" },
      { parameterName: "AREA M2", parameterValue: "15.78942635", parameterType: "AREA" },
      { parameterName: "BUILDING NAME", parameterValue: "PHENIX", parameterType: "TEXT" },
      { parameterName: "FLOOR", parameterValue: "FLOOR 02", parameterType: "TEXT" },
      { parameterName: "ELEMENT TYPE", parameterValue: "ROOM", parameterType: "TEXT" },
      { parameterName: "FUNCTION", parameterValue: "FUNCTIONAL", parameterType: "TEXT" }
    ]

    const metadataEntries2 = metadata2.map(meta => ({
      assetId: asset2.id,
      parameterName: meta.parameterName,
      parameterValue: meta.parameterValue,
      parameterType: meta.parameterType
    }))

    await prisma.assetMetadata.createMany({
      data: metadataEntries2
    })

    console.log(`Created second asset with ${metadataEntries2.length} metadata entries`)
    
    console.log('Sample data creation completed!')
    console.log('\nTo test:')
    console.log(`1. Name your GLB file: ${sampleGuid}.glb`)
    console.log(`2. Or name your GLB file: ${sampleGuid2}.glb`)
    console.log('3. Upload it to the 3D viewer')
    console.log('4. The asset metadata panel should automatically show the data')

  } catch (error) {
    console.error('Error creating sample data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleData()