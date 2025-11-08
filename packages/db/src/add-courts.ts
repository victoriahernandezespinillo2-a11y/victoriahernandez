import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addCourts() {
  console.log('🏟️ Agregando canchas al polideportivo...')
  
  try {
    // Buscar el centro deportivo
    const center = await prisma.center.findFirst()
    if (!center) {
      console.error('❌ No se encontró un centro deportivo. Ejecuta primero db:setup-production')
      return
    }

    // Verificar si ya existen canchas
    const existingCourts = await prisma.court.findMany()
    if (existingCourts.length > 0) {
      console.log('⚠️  Ya existen canchas configuradas')
      return
    }

    // Crear canchas
    const courts = [
      {
        name: 'Cancha de Fútbol 1',
        sportType: 'football',
        capacity: 22,
        basePricePerHour: new Prisma.Decimal(50.00)
      },
      {
        name: 'Cancha de Fútbol 2',
        sportType: 'football',
        capacity: 22,
        basePricePerHour: new Prisma.Decimal(50.00)
      },
      {
        name: 'Pista de Tenis 1',
        sportType: 'tennis',
        capacity: 4,
        basePricePerHour: new Prisma.Decimal(25.00)
      },
      {
        name: 'Pista de Tenis 2',
        sportType: 'tennis',
        capacity: 4,
        basePricePerHour: new Prisma.Decimal(25.00)
      },
      {
        name: 'Cancha de Baloncesto',
        sportType: 'basketball',
        capacity: 10,
        basePricePerHour: new Prisma.Decimal(35.00)
      },
      {
        name: 'Pista de Pádel 1',
        sportType: 'padel',
        capacity: 4,
        basePricePerHour: new Prisma.Decimal(30.00)
      },
      {
        name: 'Pista de Pádel 2',
        sportType: 'padel',
        capacity: 4,
        basePricePerHour: new Prisma.Decimal(30.00)
      }
    ]

    for (const courtData of courts) {
      const court = await prisma.court.create({
        data: {
          ...courtData,
          centerId: center.id,
          isActive: true,
          maintenanceStatus: 'operational'
        }
      })

      // Crear reglas de precios básicas para cada cancha
      await prisma.pricingRule.create({
        data: {
          courtId: court.id,
          name: 'Horario Normal',
          timeStart: '08:00',
          timeEnd: '18:00',
          daysOfWeek: { set: [1, 2, 3, 4, 5] }, // Lunes a Viernes
          priceMultiplier: new Prisma.Decimal(1.0),
          memberDiscount: new Prisma.Decimal(0.1), // 10% descuento para miembros
          isActive: true
        }
      })

      await prisma.pricingRule.create({
        data: {
          courtId: court.id,
          name: 'Horario Premium',
          timeStart: '18:00',
          timeEnd: '22:00',
          daysOfWeek: { set: [1, 2, 3, 4, 5, 6, 7] }, // Todos los días
          priceMultiplier: new Prisma.Decimal(1.3), // 30% más caro
          memberDiscount: new Prisma.Decimal(0.15), // 15% descuento para miembros
          isActive: true
        }
      })

      await prisma.pricingRule.create({
        data: {
          courtId: court.id,
          name: 'Fin de Semana',
          timeStart: '08:00',
          timeEnd: '22:00',
          daysOfWeek: { set: [6, 7] }, // Sábado y Domingo
          priceMultiplier: new Prisma.Decimal(1.2), // 20% más caro
          memberDiscount: new Prisma.Decimal(0.1), // 10% descuento para miembros
          isActive: true
        }
      })

      console.log(`✅ Cancha creada: ${court.name} (${court.sportType})`)
    }

    console.log('\n🎉 Canchas y reglas de precios configuradas exitosamente')
    console.log('📋 Canchas disponibles:')
    
    const allCourts = await prisma.court.findMany({
      include: {
        pricingRules: true
      }
    })

    allCourts.forEach(court => {
      console.log(`   - ${court.name}: €${court.basePricePerHour}/hora (${court.pricingRules.length} reglas de precio)`)
    })

    console.log('\n🚀 El sistema está listo para recibir reservas!')
    
  } catch (error) {
    console.error('❌ Error al crear las canchas:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

addCourts()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })