const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addPanoramaAssetData() {
  try {
    // Add asset data for the first panorama
    const asset1 = await prisma.asset.create({
      data: {
        guid: 'af21f998-aa80-4907-adcc-74c684f7a883',
        name: 'Conference Room View',
        category: 'Rooms & Spaces',
        filePath: '/assets/panoramas/af21f998-aa80-4907-adcc-74c684f7a883-003d5b70_360.jpg',
        metadata: {
          create: [
            {
              parameterName: 'Room Name',
              parameterValue: 'Conference Room A',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Room Number',
              parameterValue: 'CR-101',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Floor Area',
              parameterValue: '45.5',
              parameterType: 'AREA'
            },
            {
              parameterName: 'Ceiling Height',
              parameterValue: '2.8',
              parameterType: 'LENGTH'
            },
            {
              parameterName: 'Occupancy',
              parameterValue: '12',
              parameterType: 'NUMBER'
            },
            {
              parameterName: 'Department',
              parameterValue: 'Executive',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Has AV Equipment',
              parameterValue: 'true',
              parameterType: 'BOOLEAN'
            },
            {
              parameterName: 'Last Renovation',
              parameterValue: '2023-03-15',
              parameterType: 'DATE'
            },
            {
              parameterName: 'Room Volume',
              parameterValue: '127.4',
              parameterType: 'VOLUME'
            },
            {
              parameterName: 'Fire Rating',
              parameterValue: '1 Hour',
              parameterType: 'TEXT'
            }
          ]
        }
      },
      include: {
        metadata: true
      }
    })

    console.log('Panorama asset 1 added successfully:')
    console.log(`Asset: ${asset1.name} (${asset1.guid})`)
    console.log(`Metadata count: ${asset1.metadata.length}`)
    
    // Add asset data for the second panorama
    const asset2 = await prisma.asset.create({
      data: {
        guid: 'a0edc2ea-5ecb-4332-992e-6785ae78c6c8',
        name: 'Office Workspace',
        category: 'Rooms & Spaces',
        filePath: '/assets/panoramas/a0edc2ea-5ecb-4332-992e-6785ae78c6c8-003daafc_360.jpg',
        metadata: {
          create: [
            {
              parameterName: 'Room Name',
              parameterValue: 'Open Office Area B',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Room Number',
              parameterValue: 'OF-205',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Floor Area',
              parameterValue: '150.2',
              parameterType: 'AREA'
            },
            {
              parameterName: 'Ceiling Height',
              parameterValue: '3.0',
              parameterType: 'LENGTH'
            },
            {
              parameterName: 'Workstations',
              parameterValue: '24',
              parameterType: 'NUMBER'
            },
            {
              parameterName: 'Department',
              parameterValue: 'Engineering',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Natural Lighting',
              parameterValue: 'true',
              parameterType: 'BOOLEAN'
            },
            {
              parameterName: 'HVAC Zone',
              parameterValue: 'Zone-2B',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Room Volume',
              parameterValue: '450.6',
              parameterType: 'VOLUME'
            },
            {
              parameterName: 'Lighting Watts',
              parameterValue: '1800',
              parameterType: 'NUMBER'
            },
            {
              parameterName: 'Carpet Area',
              parameterValue: '135.8',
              parameterType: 'AREA'
            }
          ]
        }
      }
    })

    console.log(`Panorama asset 2: ${asset2.name} (${asset2.guid})`)

  } catch (error) {
    console.error('Error adding panorama asset data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addPanoramaAssetData()