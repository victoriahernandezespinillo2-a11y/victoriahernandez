import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function setupProduction() {
  console.log('🚀 Configurando datos iniciales para producción...')
  
  try {
    // Verificar si ya existe un centro
    const existingCenter = await prisma.center.findFirst()
    if (existingCenter) {
      console.log('⚠️  Ya existe un centro deportivo configurado')
      return
    }

    // Crear centro deportivo principal
    const center = await prisma.center.create({
      data: {
        name: 'Polideportivo Oroquieta',
        address: 'Dirección del polideportivo',
        phone: '+34 XXX XXX XXX',
        email: 'info@polideportivooroquieta.com',
        settings: JSON.stringify({
          timezone: 'Europe/Madrid',
          currency: 'EUR',
          language: 'es',
          openingHours: {
            monday: { open: '08:00', close: '22:00' },
            tuesday: { open: '08:00', close: '22:00' },
            wednesday: { open: '08:00', close: '22:00' },
            thursday: { open: '08:00', close: '22:00' },
            friday: { open: '08:00', close: '22:00' },
            saturday: { open: '09:00', close: '21:00' },
            sunday: { open: '09:00', close: '20:00' }
          }
        })
      }
    })

    console.log(`✅ Centro deportivo creado: ${center.name}`)

    // Crear usuario administrador
    const adminEmail = 'admin@polideportivooroquieta.com'
    const adminPassword = 'admin123' // Cambiar en producción
    
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12)
      
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Administrador',
          membershipType: 'admin',
          isActive: true,
          gdprConsent: true,
          gdprConsentDate: new Date()
        }
      })

      console.log(`✅ Usuario administrador creado: ${admin.email}`)
      console.log(`🔑 Contraseña temporal: ${adminPassword}`)
      console.log('⚠️  IMPORTANTE: Cambiar la contraseña después del primer login')
    } else {
      console.log('⚠️  Ya existe un usuario administrador')
    }

    console.log('\n🎉 Configuración inicial completada')
    console.log('📋 Próximos pasos:')
    console.log('   1. Actualizar información del centro deportivo')
    console.log('   2. Crear las canchas/pistas')
    console.log('   3. Configurar reglas de precios')
    console.log('   4. Cambiar contraseña del administrador')
    
  } catch (error) {
    console.error('❌ Error en la configuración inicial:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

setupProduction()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })