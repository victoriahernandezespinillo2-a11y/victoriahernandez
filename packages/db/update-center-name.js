/**
 * 🔧 SCRIPT PARA ACTUALIZAR EL NOMBRE DEL CENTRO
 * =============================================
 * 
 * Este script actualiza el nombre del centro deportivo de
 * "Polideportivo Oroquieta" a "IDB Victoria Hernández"
 * y corrige la información de contacto.
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Cargar variables de entorno desde el archivo .env del proyecto raíz
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function updateCenterName() {
  try {
    console.log('🔧 Actualizando nombre del centro deportivo...');
    
    // Buscar el centro existente
    const existingCenter = await prisma.center.findFirst();
    
    if (!existingCenter) {
      console.log('❌ No se encontró ningún centro deportivo');
      return;
    }
    
    console.log(`📋 Centro actual: ${existingCenter.name}`);
    console.log(`📍 Dirección actual: ${existingCenter.address}`);
    console.log(`📧 Email actual: ${existingCenter.email}`);
    
    // Actualizar el centro
    const updatedCenter = await prisma.center.update({
      where: { id: existingCenter.id },
      data: {
        name: 'IDB Victoria Hernández',
        address: 'CALLE CONSENSO, 5, 28041 Madrid, España (Los Rosales, Villaverde)',
        phone: '+34 XXX XXX XXX',
        email: 'info@polideportivovictoriahernandez.es',
        settings: {
          ...existingCenter.settings,
          timezone: 'Europe/Madrid',
          currency: 'EUR',
          language: 'es'
        }
      }
    });
    
    console.log('✅ Centro actualizado exitosamente:');
    console.log(`   📋 Nombre: ${updatedCenter.name}`);
    console.log(`   📍 Dirección: ${updatedCenter.address}`);
    console.log(`   📧 Email: ${updatedCenter.email}`);
    console.log(`   🌍 Zona horaria: ${updatedCenter.settings?.timezone || 'Europe/Madrid'}`);
    console.log(`   💰 Moneda: ${updatedCenter.settings?.currency || 'EUR'}`);
    
  } catch (error) {
    console.error('❌ Error actualizando el centro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
updateCenterName();




