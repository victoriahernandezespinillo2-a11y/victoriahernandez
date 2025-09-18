/**
 * Script de QA exhaustivo para la sección de reservas
 * Verifica todos los botones, filtros, validaciones y funcionalidades
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuración de prueba
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001',
  apiUrl: 'http://localhost:3002',
  testUser: {
    email: 'admin@polideportivo.com',
    password: 'admin123'
  }
};

// Estados de prueba
const TEST_RESERVATIONS = [
  {
    status: 'PENDING',
    paymentStatus: 'PENDING',
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas en el futuro
    duration: 60
  },
  {
    status: 'PAID',
    paymentStatus: 'PAID',
    startTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hora en el futuro
    duration: 90
  },
  {
    status: 'IN_PROGRESS',
    paymentStatus: 'PAID',
    startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
    duration: 60
  },
  {
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    duration: 60
  },
  {
    status: 'CANCELLED',
    paymentStatus: 'PENDING',
    startTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 horas en el futuro
    duration: 60
  },
  {
    status: 'NO_SHOW',
    paymentStatus: 'PAID',
    startTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hora atrás
    duration: 60
  }
];

class ReservationsQA {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async test(name, testFn) {
    try {
      this.log(`🧪 Ejecutando: ${name}`);
      const result = await testFn();
      this.results.tests.push({ name, status: 'passed', result });
      this.results.passed++;
      this.log(`✅ ${name} - PASÓ`, 'success');
      return result;
    } catch (error) {
      this.results.tests.push({ name, status: 'failed', error: error.message });
      this.results.failed++;
      this.log(`❌ ${name} - FALLÓ: ${error.message}`, 'error');
      throw error;
    }
  }

  async testWarning(name, testFn) {
    try {
      this.log(`🧪 Ejecutando: ${name}`);
      const result = await testFn();
      this.results.tests.push({ name, status: 'warning', result });
      this.results.warnings++;
      this.log(`⚠️ ${name} - ADVERTENCIA`, 'warning');
      return result;
    } catch (error) {
      this.results.tests.push({ name, status: 'failed', error: error.message });
      this.results.failed++;
      this.log(`❌ ${name} - FALLÓ: ${error.message}`, 'error');
      throw error;
    }
  }

  // 1. Verificar estructura de base de datos
  async testDatabaseStructure() {
    return await this.test('Estructura de base de datos', async () => {
      // Verificar que existe la tabla de reservas
      const reservations = await prisma.reservation.findMany({ take: 1 });
      
      // Verificar que existen los estados válidos
      const validStatuses = ['PENDING', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
      const existingStatuses = await prisma.$queryRaw`
        SELECT unnest(enum_range(NULL::"ReservationStatus")) as status;
      `;
      
      const statusValues = existingStatuses.map((s: any) => s.status);
      const missingStatuses = validStatuses.filter(s => !statusValues.includes(s));
      
      if (missingStatuses.length > 0) {
        throw new Error(`Estados faltantes en BD: ${missingStatuses.join(', ')}`);
      }
      
      return { reservations: reservations.length, statuses: statusValues };
    });
  }

  // 2. Verificar endpoints de API
  async testAPIEndpoints() {
    return await this.test('Endpoints de API', async () => {
      const endpoints = [
        'GET /api/admin/reservations',
        'PUT /api/admin/reservations/[id]',
        'DELETE /api/admin/reservations/[id]',
        'POST /api/admin/reservations/[id]/check-in',
        'POST /api/admin/reservations/[id]/check-out',
        'PUT /api/admin/reservations/[id]/payment',
        'POST /api/admin/reservations/[id]/refund',
        'POST /api/admin/reservations/[id]/notifications/resend',
        'GET /api/admin/reservations/[id]/audit'
      ];
      
      // Verificar que los archivos de endpoints existen
      const fs = await import('fs');
      const path = await import('path');
      
      const missingEndpoints = [];
      for (const endpoint of endpoints) {
        const [method, route] = endpoint.split(' ');
        const routePath = route.replace('[id]', 'test-id');
        const filePath = path.resolve(`../apps/api/src/app${routePath}/route.ts`);
        
        if (!fs.existsSync(filePath)) {
          missingEndpoints.push(endpoint);
        }
      }
      
      if (missingEndpoints.length > 0) {
        throw new Error(`Endpoints faltantes: ${missingEndpoints.join(', ')}`);
      }
      
      return { endpoints: endpoints.length, missing: missingEndpoints.length };
    });
  }

  // 3. Verificar validación de ventana de check-in
  async testCheckInWindowValidation() {
    return await this.test('Validación de ventana de check-in', async () => {
      // Crear una reserva de prueba
      const testReservation = await prisma.reservation.create({
        data: {
          courtId: 'test-court-id',
          userId: 'test-user-id',
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas en el futuro
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 horas en el futuro
          status: 'PAID',
          totalPrice: 10.0,
          paymentMethod: 'CASH'
        }
      });
      
      try {
        // Intentar check-in fuera de ventana (muy temprano)
        const response = await fetch(`${TEST_CONFIG.apiUrl}/api/admin/reservations/${testReservation.id}/check-in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'admin-session=test' // Simular sesión admin
          }
        });
        
        const result = await response.json();
        
        if (response.status === 400 && result.message?.includes('Fuera de ventana de check-in')) {
          return { validWindow: true, message: 'Validación de ventana funciona correctamente' };
        } else {
          throw new Error('Validación de ventana no funciona correctamente');
        }
      } finally {
        // Limpiar reserva de prueba
        await prisma.reservation.delete({ where: { id: testReservation.id } });
      }
    });
  }

  // 4. Verificar filtros y búsqueda
  async testFiltersAndSearch() {
    return await this.test('Filtros y búsqueda', async () => {
      const filterTests = [
        { name: 'Filtro por estado PENDING', filter: { status: 'PENDING' } },
        { name: 'Filtro por estado PAID', filter: { status: 'PAID' } },
        { name: 'Filtro por estado IN_PROGRESS', filter: { status: 'IN_PROGRESS' } },
        { name: 'Filtro por estado COMPLETED', filter: { status: 'COMPLETED' } },
        { name: 'Filtro por estado CANCELLED', filter: { status: 'CANCELLED' } },
        { name: 'Filtro por estado NO_SHOW', filter: { status: 'NO_SHOW' } },
        { name: 'Filtro por pago PENDING', filter: { paymentStatus: 'PENDING' } },
        { name: 'Filtro por pago PAID', filter: { paymentStatus: 'PAID' } },
        { name: 'Filtro por pago REFUNDED', filter: { paymentStatus: 'REFUNDED' } }
      ];
      
      const results = [];
      for (const test of filterTests) {
        try {
          const response = await fetch(`${TEST_CONFIG.apiUrl}/api/admin/reservations?${new URLSearchParams(test.filter)}`, {
            headers: { 'Cookie': 'admin-session=test' }
          });
          
          if (response.ok) {
            results.push({ name: test.name, status: 'passed' });
          } else {
            results.push({ name: test.name, status: 'failed', error: `HTTP ${response.status}` });
          }
        } catch (error) {
          results.push({ name: test.name, status: 'failed', error: error.message });
        }
      }
      
      const failed = results.filter(r => r.status === 'failed');
      if (failed.length > 0) {
        throw new Error(`Filtros fallidos: ${failed.map(f => f.name).join(', ')}`);
      }
      
      return { total: results.length, passed: results.filter(r => r.status === 'passed').length };
    });
  }

  // 5. Verificar métricas y contadores
  async testMetricsAndCounters() {
    return await this.test('Métricas y contadores', async () => {
      const metrics = await prisma.reservation.groupBy({
        by: ['status'],
        _count: { id: true }
      });
      
      const totalReservations = await prisma.reservation.count();
      const paidReservations = await prisma.reservation.count({
        where: { status: 'PAID' }
      });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayReservations = await prisma.reservation.count({
        where: {
          startTime: {
            gte: today,
            lt: tomorrow
          }
        }
      });
      
      return {
        total: totalReservations,
        paid: paidReservations,
        today: todayReservations,
        byStatus: metrics
      };
    });
  }

  // 6. Verificar validación de estados
  async testStatusValidation() {
    return await this.test('Validación de estados', async () => {
      const invalidStatuses = ['CONFIRMED', 'INVALID', 'TEST'];
      const validStatuses = ['PENDING', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
      
      // Crear reserva de prueba
      const testReservation = await prisma.reservation.create({
        data: {
          courtId: 'test-court-id',
          userId: 'test-user-id',
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
          status: 'PENDING',
          totalPrice: 10.0,
          paymentMethod: 'CASH'
        }
      });
      
      try {
        // Probar estados inválidos
        for (const invalidStatus of invalidStatuses) {
          const response = await fetch(`${TEST_CONFIG.apiUrl}/api/admin/reservations/${testReservation.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': 'admin-session=test'
            },
            body: JSON.stringify({ status: invalidStatus })
          });
          
          if (response.status !== 400) {
            throw new Error(`Estado inválido '${invalidStatus}' fue aceptado`);
          }
        }
        
        // Probar estados válidos
        for (const validStatus of validStatuses) {
          const response = await fetch(`${TEST_CONFIG.apiUrl}/api/admin/reservations/${testReservation.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': 'admin-session=test'
            },
            body: JSON.stringify({ status: validStatus })
          });
          
          if (response.status === 400) {
            const error = await response.json();
            if (error.message?.includes('Invalid enum value')) {
              throw new Error(`Estado válido '${validStatus}' fue rechazado`);
            }
          }
        }
        
        return { invalidRejected: invalidStatuses.length, validAccepted: validStatuses.length };
      } finally {
        await prisma.reservation.delete({ where: { id: testReservation.id } });
      }
    });
  }

  // 7. Verificar manejo de errores
  async testErrorHandling() {
    return await this.test('Manejo de errores', async () => {
      const errorTests = [
        {
          name: 'Reserva inexistente',
          url: `${TEST_CONFIG.apiUrl}/api/admin/reservations/invalid-id`,
          method: 'GET',
          expectedStatus: 404
        },
        {
          name: 'Check-in sin autenticación',
          url: `${TEST_CONFIG.apiUrl}/api/admin/reservations/test-id/check-in`,
          method: 'POST',
          expectedStatus: 401
        },
        {
          name: 'Actualización con datos inválidos',
          url: `${TEST_CONFIG.apiUrl}/api/admin/reservations/test-id`,
          method: 'PUT',
          body: { status: 'INVALID_STATUS' },
          expectedStatus: 400
        }
      ];
      
      const results = [];
      for (const test of errorTests) {
        try {
          const response = await fetch(test.url, {
            method: test.method,
            headers: {
              'Content-Type': 'application/json',
              ...(test.method !== 'GET' && { 'Cookie': 'admin-session=test' })
            },
            body: test.body ? JSON.stringify(test.body) : undefined
          });
          
          if (response.status === test.expectedStatus) {
            results.push({ name: test.name, status: 'passed' });
          } else {
            results.push({ name: test.name, status: 'failed', actual: response.status, expected: test.expectedStatus });
          }
        } catch (error) {
          results.push({ name: test.name, status: 'failed', error: error.message });
        }
      }
      
      const failed = results.filter(r => r.status === 'failed');
      if (failed.length > 0) {
        throw new Error(`Manejo de errores fallido: ${failed.map(f => f.name).join(', ')}`);
      }
      
      return { total: results.length, passed: results.filter(r => r.status === 'passed').length };
    });
  }

  // 8. Verificar rendimiento
  async testPerformance() {
    return await this.testWarning('Rendimiento', async () => {
      const startTime = Date.now();
      
      // Simular carga de reservas
      const response = await fetch(`${TEST_CONFIG.apiUrl}/api/admin/reservations?limit=200`, {
        headers: { 'Cookie': 'admin-session=test' }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (responseTime > 5000) { // Más de 5 segundos
        throw new Error(`Respuesta muy lenta: ${responseTime}ms`);
      }
      
      return { responseTime, status: responseTime < 2000 ? 'excellent' : responseTime < 5000 ? 'good' : 'slow' };
    });
  }

  // Ejecutar todos los tests
  async runAllTests() {
    this.log('🚀 Iniciando auditoría QA exhaustiva de la sección de reservas');
    
    try {
      await this.testDatabaseStructure();
      await this.testAPIEndpoints();
      await this.testCheckInWindowValidation();
      await this.testFiltersAndSearch();
      await this.testMetricsAndCounters();
      await this.testStatusValidation();
      await this.testErrorHandling();
      await this.testPerformance();
      
      this.log('🎉 Auditoría QA completada exitosamente');
    } catch (error) {
      this.log(`💥 Error durante la auditoría: ${error.message}`, 'error');
    } finally {
      await prisma.$disconnect();
    }
    
    this.generateReport();
  }

  generateReport() {
    const { passed, failed, warnings, tests } = this.results;
    const total = passed + failed + warnings;
    
    console.log('\n📊 REPORTE DE AUDITORÍA QA');
    console.log('='.repeat(50));
    console.log(`Total de tests: ${total}`);
    console.log(`✅ Pasaron: ${passed}`);
    console.log(`❌ Fallaron: ${failed}`);
    console.log(`⚠️  Advertencias: ${warnings}`);
    console.log(`📈 Tasa de éxito: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ TESTS FALLIDOS:');
      tests.filter(t => t.status === 'failed').forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
    }
    
    if (warnings > 0) {
      console.log('\n⚠️  ADVERTENCIAS:');
      tests.filter(t => t.status === 'warning').forEach(test => {
        console.log(`  - ${test.name}: ${test.result}`);
      });
    }
    
    console.log('\n🎯 RECOMENDACIONES PARA PRODUCCIÓN:');
    if (failed === 0) {
      console.log('✅ La sección está lista para producción');
    } else {
      console.log('❌ Corregir los tests fallidos antes de desplegar');
    }
    
    if (warnings > 0) {
      console.log('⚠️  Revisar las advertencias para optimización');
    }
  }
}

// Ejecutar auditoría
if (import.meta.url === `file://${process.argv[1]}`) {
  const qa = new ReservationsQA();
  qa.runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

export { ReservationsQA };



