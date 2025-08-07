import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanDatabase() {
  console.log('🧹 Limpiando base de datos...')
  
  try {
    // Eliminar datos en orden correcto para evitar errores de foreign key
    console.log('Eliminando datos de ejemplo...')
    
    // Eliminar eventos y webhooks
    await prisma.outboxEvent.deleteMany()
    await prisma.webhookEvent.deleteMany()
    await prisma.gdprDeletionRequest.deleteMany()
    
    // Eliminar datos relacionados con usuarios
    await prisma.waitingList.deleteMany()
    await prisma.tournamentUser.deleteMany()
    await prisma.tournament.deleteMany()
    await prisma.membership.deleteMany()
    
    // Eliminar reservas
    await prisma.reservation.deleteMany()
    
    // Eliminar datos relacionados con canchas
    await prisma.maintenanceSchedule.deleteMany()
    await prisma.pricingRule.deleteMany()
    await prisma.court.deleteMany()
    
    // Eliminar centros y usuarios
    await prisma.center.deleteMany()
    await prisma.user.deleteMany()
    
    console.log('✅ Base de datos limpiada exitosamente')
    console.log('📊 La base de datos está lista para datos reales')
    
  } catch (error) {
    console.error('❌ Error al limpiar la base de datos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

cleanDatabase()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })