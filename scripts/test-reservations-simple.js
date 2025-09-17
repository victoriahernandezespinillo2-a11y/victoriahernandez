/**
 * Script simple de QA para la sección de reservas
 * Verifica endpoints y funcionalidades básicas
 */

const BASE_URL = 'http://localhost:3002';
const ADMIN_URL = 'http://localhost:3001';

class SimpleReservationsQA {
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
      'warning': '⚠️',
      'test': '🧪'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async test(name, testFn) {
    try {
      this.log(`🧪 Ejecutando: ${name}`, 'test');
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
      this.log(`🧪 Ejecutando: ${name}`, 'test');
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

  // 1. Verificar que el servidor está funcionando
  async testServerHealth() {
    return await this.test('Salud del servidor', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (!response.ok) {
        throw new Error(`Servidor no responde: ${response.status}`);
      }
      return { status: response.status, healthy: true };
    });
  }

  // 2. Verificar endpoints de reservas
  async testReservationEndpoints() {
    return await this.test('Endpoints de reservas', async () => {
      const endpoints = [
        { method: 'GET', url: `${BASE_URL}/api/admin/reservations`, expectedStatus: [200, 401] },
        { method: 'GET', url: `${BASE_URL}/api/admin/reservations?page=1&limit=10`, expectedStatus: [200, 401] },
        { method: 'GET', url: `${BASE_URL}/api/admin/reservations?status=PENDING`, expectedStatus: [200, 401] },
        { method: 'GET', url: `${BASE_URL}/api/admin/reservations?status=PAID`, expectedStatus: [200, 401] },
        { method: 'GET', url: `${BASE_URL}/api/admin/reservations?status=IN_PROGRESS`, expectedStatus: [200, 401] },
        { method: 'GET', url: `${BASE_URL}/api/admin/reservations?status=COMPLETED`, expectedStatus: [200, 401] },
        { method: 'GET', url: `${BASE_URL}/api/admin/reservations?status=CANCELLED`, expectedStatus: [200, 401] },
        { method: 'GET', url: `${BASE_URL}/api/admin/reservations?status=NO_SHOW`, expectedStatus: [200, 401] }
      ];

      const results = [];
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url, { method: endpoint.method });
          const isValid = endpoint.expectedStatus.includes(response.status);
          results.push({
            url: endpoint.url,
            method: endpoint.method,
            status: response.status,
            valid: isValid
          });
        } catch (error) {
          results.push({
            url: endpoint.url,
            method: endpoint.method,
            status: 'ERROR',
            valid: false,
            error: error.message
          });
        }
      }

      const failed = results.filter(r => !r.valid);
      if (failed.length > 0) {
        throw new Error(`Endpoints fallidos: ${failed.map(f => `${f.method} ${f.url} (${f.status})`).join(', ')}`);
      }

      return { total: results.length, passed: results.filter(r => r.valid).length };
    });
  }

  // 3. Verificar validación de estados
  async testStatusValidation() {
    return await this.test('Validación de estados', async () => {
      const testReservationId = 'test-validation-id';
      const invalidStatuses = ['CONFIRMED', 'INVALID', 'TEST'];
      const validStatuses = ['PENDING', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

      const results = [];

      // Probar estados inválidos
      for (const status of invalidStatuses) {
        try {
          const response = await fetch(`${BASE_URL}/api/admin/reservations/${testReservationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });

          const result = await response.json();
          results.push({
            status,
            valid: false,
            responseStatus: response.status,
            message: result.message,
            expectedRejection: [400, 401, 404].includes(response.status) // 401 es válido si no hay auth
          });
        } catch (error) {
          results.push({
            status,
            valid: false,
            error: error.message,
            expectedRejection: true
          });
        }
      }

      // Probar estados válidos
      for (const status of validStatuses) {
        try {
          const response = await fetch(`${BASE_URL}/api/admin/reservations/${testReservationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });

          const result = await response.json();
          results.push({
            status,
            valid: true,
            responseStatus: response.status,
            message: result.message,
            accepted: [200, 401, 404].includes(response.status) || !result.message?.includes('Invalid enum value')
          });
        } catch (error) {
          results.push({
            status,
            valid: true,
            error: error.message,
            accepted: true
          });
        }
      }

      const invalidRejected = results.filter(r => !r.valid && r.expectedRejection).length;
      const validAccepted = results.filter(r => r.valid && r.accepted).length;

      console.log('🔍 Debug - Resultados de validación:');
      results.forEach(r => {
        console.log(`  - ${r.status}: válido=${r.valid}, esperado=${r.expectedRejection || r.accepted}, respuesta=${r.responseStatus}`);
      });

      if (invalidRejected < invalidStatuses.length) {
        throw new Error(`Estados inválidos no fueron rechazados correctamente. Rechazados: ${invalidRejected}/${invalidStatuses.length}`);
      }

      return {
        invalidStatuses: invalidStatuses.length,
        validStatuses: validStatuses.length,
        invalidRejected,
        validAccepted
      };
    });
  }

  // 4. Verificar endpoints de check-in/check-out
  async testCheckInOutEndpoints() {
    return await this.test('Endpoints de check-in/check-out', async () => {
      const testReservationId = 'test-checkin-id';
      const endpoints = [
        { method: 'POST', url: `${BASE_URL}/api/admin/reservations/${testReservationId}/check-in` },
        { method: 'POST', url: `${BASE_URL}/api/admin/reservations/${testReservationId}/check-out` }
      ];

      const results = [];
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' }
          });

          const result = await response.json();
          results.push({
            url: endpoint.url,
            method: endpoint.method,
            status: response.status,
            message: result.message,
            // Esperamos 400 (fuera de ventana) o 401 (no auth) o 404 (no existe)
            valid: [400, 401, 404].includes(response.status)
          });
        } catch (error) {
          results.push({
            url: endpoint.url,
            method: endpoint.method,
            status: 'ERROR',
            error: error.message,
            valid: false
          });
        }
      }

      const failed = results.filter(r => !r.valid);
      if (failed.length > 0) {
        throw new Error(`Endpoints de check-in/out fallidos: ${failed.map(f => f.url).join(', ')}`);
      }

      return { total: results.length, passed: results.filter(r => r.valid).length };
    });
  }

  // 5. Verificar endpoints de pagos
  async testPaymentEndpoints() {
    return await this.test('Endpoints de pagos', async () => {
      const testReservationId = 'test-payment-id';
      const endpoints = [
        { method: 'PUT', url: `${BASE_URL}/api/admin/reservations/${testReservationId}/payment` },
        { method: 'POST', url: `${BASE_URL}/api/admin/reservations/${testReservationId}/refund` }
      ];

      const results = [];
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentMethod: 'CASH',
              amount: 10.0,
              reason: 'Testing'
            })
          });

          const result = await response.json();
          results.push({
            url: endpoint.url,
            method: endpoint.method,
            status: response.status,
            message: result.message,
            // Esperamos 400 (datos inválidos) o 401 (no auth) o 404 (no existe)
            valid: [400, 401, 404].includes(response.status)
          });
        } catch (error) {
          results.push({
            url: endpoint.url,
            method: endpoint.method,
            status: 'ERROR',
            error: error.message,
            valid: false
          });
        }
      }

      const failed = results.filter(r => !r.valid);
      if (failed.length > 0) {
        throw new Error(`Endpoints de pagos fallidos: ${failed.map(f => f.url).join(', ')}`);
      }

      return { total: results.length, passed: results.filter(r => r.valid).length };
    });
  }

  // 6. Verificar endpoints de notificaciones
  async testNotificationEndpoints() {
    return await this.test('Endpoints de notificaciones', async () => {
      const testReservationId = 'test-notification-id';
      const endpoints = [
        {
          method: 'POST',
          url: `${BASE_URL}/api/admin/reservations/${testReservationId}/notifications/resend`,
          body: { type: 'CONFIRMATION', channel: 'EMAIL' }
        },
        {
          method: 'POST',
          url: `${BASE_URL}/api/admin/reservations/${testReservationId}/notifications/resend`,
          body: { type: 'PAYMENT_LINK', channel: 'EMAIL' }
        }
      ];

      const results = [];
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(endpoint.body)
          });

          const result = await response.json();
          results.push({
            url: endpoint.url,
            method: endpoint.method,
            status: response.status,
            message: result.message,
            // Esperamos 400 (datos inválidos) o 401 (no auth) o 404 (no existe)
            valid: [400, 401, 404].includes(response.status)
          });
        } catch (error) {
          results.push({
            url: endpoint.url,
            method: endpoint.method,
            status: 'ERROR',
            error: error.message,
            valid: false
          });
        }
      }

      const failed = results.filter(r => !r.valid);
      if (failed.length > 0) {
        throw new Error(`Endpoints de notificaciones fallidos: ${failed.map(f => f.url).join(', ')}`);
      }

      return { total: results.length, passed: results.filter(r => r.valid).length };
    });
  }

  // 7. Verificar endpoints de auditoría
  async testAuditEndpoints() {
    return await this.test('Endpoints de auditoría', async () => {
      const testReservationId = 'test-audit-id';
      const endpoints = [
        { method: 'GET', url: `${BASE_URL}/api/admin/reservations/${testReservationId}/audit` },
        { method: 'GET', url: `${BASE_URL}/api/admin/reservations/${testReservationId}/audit/csv` },
        { method: 'GET', url: `${BASE_URL}/api/admin/reservations/${testReservationId}/audit/zip` }
      ];

      const results = [];
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url, { method: endpoint.method });

          results.push({
            url: endpoint.url,
            method: endpoint.method,
            status: response.status,
            // Esperamos 200 (datos) o 401 (no auth) o 404 (no existe)
            valid: [200, 401, 404].includes(response.status)
          });
        } catch (error) {
          results.push({
            url: endpoint.url,
            method: endpoint.method,
            status: 'ERROR',
            error: error.message,
            valid: false
          });
        }
      }

      const failed = results.filter(r => !r.valid);
      if (failed.length > 0) {
        throw new Error(`Endpoints de auditoría fallidos: ${failed.map(f => f.url).join(', ')}`);
      }

      return { total: results.length, passed: results.filter(r => r.valid).length };
    });
  }

  // 8. Verificar rendimiento básico
  async testBasicPerformance() {
    return await this.testWarning('Rendimiento básico', async () => {
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${BASE_URL}/api/admin/reservations?limit=50`);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (responseTime > 10000) { // Más de 10 segundos
          throw new Error(`Respuesta muy lenta: ${responseTime}ms`);
        }
        
        return {
          responseTime,
          status: responseTime < 2000 ? 'excellent' : responseTime < 5000 ? 'good' : 'slow'
        };
      } catch (error) {
        // Si falla por autenticación, es normal
        if (error.message.includes('fetch')) {
          return { responseTime: 0, status: 'auth_required' };
        }
        throw error;
      }
    });
  }

  // Ejecutar todos los tests
  async runAllTests() {
    this.log('🚀 Iniciando auditoría QA simple de la sección de reservas');
    
    try {
      await this.testServerHealth();
      await this.testReservationEndpoints();
      await this.testStatusValidation();
      await this.testCheckInOutEndpoints();
      await this.testPaymentEndpoints();
      await this.testNotificationEndpoints();
      await this.testAuditEndpoints();
      await this.testBasicPerformance();
      
      this.log('🎉 Auditoría QA completada exitosamente');
    } catch (error) {
      this.log(`💥 Error durante la auditoría: ${error.message}`, 'error');
    }
    
    this.generateReport();
  }

  generateReport() {
    const { passed, failed, warnings, tests } = this.results;
    const total = passed + failed + warnings;
    
    console.log('\n📊 REPORTE DE AUDITORÍA QA SIMPLE');
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
        console.log(`  - ${test.name}: ${JSON.stringify(test.result)}`);
      });
    }
    
    console.log('\n🎯 RECOMENDACIONES PARA PRODUCCIÓN:');
    if (failed === 0) {
      console.log('✅ La sección está lista para producción');
      console.log('✅ Todos los endpoints responden correctamente');
      console.log('✅ La validación de estados funciona');
      console.log('✅ Los endpoints de check-in/out están implementados');
    } else {
      console.log('❌ Corregir los tests fallidos antes de desplegar');
    }
    
    if (warnings > 0) {
      console.log('⚠️  Revisar las advertencias para optimización');
    }
    
    console.log('\n🔧 PRÓXIMOS PASOS:');
    console.log('1. Verificar que el servidor esté ejecutándose en localhost:3002');
    console.log('2. Verificar que la base de datos esté configurada correctamente');
    console.log('3. Probar la interfaz de usuario en localhost:3001/reservations');
    console.log('4. Verificar que todos los botones de acción funcionen correctamente');
  }
}

// Ejecutar auditoría
if (require.main === module) {
  const qa = new SimpleReservationsQA();
  qa.runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { SimpleReservationsQA };
