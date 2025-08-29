const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addSampleRevitData() {
  try {
    // Add sample asset with the GUID from our GLB file
    const asset = await prisma.asset.create({
      data: {
        guid: '46ad14df-85fd-41dc-b1b4-0a7baf1b5412',
        name: 'Sample Revit Element',
        category: 'Structural Framing',
        filePath: '/assets/glb/46ad14df-85fd-41dc-b1b4-0a7baf1b5412-003cf5ca.glb',
        metadata: {
          create: [
            {
              parameterName: 'Element Type',
              parameterValue: 'Steel Beam',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Length',
              parameterValue: '3000',
              parameterType: 'LENGTH'
            },
            {
              parameterName: 'Width',
              parameterValue: '200',
              parameterType: 'LENGTH'
            },
            {
              parameterName: 'Height',
              parameterValue: '400',
              parameterType: 'LENGTH'
            },
            {
              parameterName: 'Material',
              parameterValue: 'Structural Steel',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Fire Rating',
              parameterValue: '2 Hour',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Load Capacity',
              parameterValue: '25000',
              parameterType: 'NUMBER'
            },
            {
              parameterName: 'Installation Date',
              parameterValue: '2024-08-15',
              parameterType: 'DATE'
            },
            {
              parameterName: 'Is Load Bearing',
              parameterValue: 'true',
              parameterType: 'BOOLEAN'
            },
            {
              parameterName: 'Cost',
              parameterValue: '2500.00',
              parameterType: 'NUMBER'
            }
          ]
        }
      },
      include: {
        metadata: true
      }
    })

    console.log('Sample Revit data added successfully:')
    console.log(`Asset: ${asset.name} (${asset.guid})`)
    console.log(`Metadata count: ${asset.metadata.length}`)
    
    // Add another sample asset for testing
    const asset2 = await prisma.asset.create({
      data: {
        guid: '3d97faf2-7d14-449d-a5de-82d3b2a9b8d5',
        name: 'HVAC Unit',
        category: 'Mechanical Equipment',
        filePath: '/assets/glb/test-model.glb',
        metadata: {
          create: [
            {
              parameterName: 'Equipment Type',
              parameterValue: 'Air Handling Unit',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Airflow Rate',
              parameterValue: '5000',
              parameterType: 'NUMBER'
            },
            {
              parameterName: 'Power Consumption',
              parameterValue: '15.5',
              parameterType: 'NUMBER'
            },
            {
              parameterName: 'Manufacturer',
              parameterValue: 'Carrier',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Model Number',
              parameterValue: 'AHU-5000',
              parameterType: 'TEXT'
            },
            {
              parameterName: 'Service Life',
              parameterValue: '20',
              parameterType: 'NUMBER'
            }
          ]
        }
      }
    })

    console.log(`Second asset: ${asset2.name} (${asset2.guid})`)

  } catch (error) {
    console.error('Error adding sample data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addSampleRevitData()