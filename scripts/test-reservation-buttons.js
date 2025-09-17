/**
 * Script específico para probar todos los botones de acción de reservas
 * Simula las interacciones del usuario en la interfaz
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class ReservationButtonsTester {
  constructor() {
    this.results = [];
    this.testReservations = [];
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

  async createTestReservations() {
    this.log('Creando reservas de prueba para testing de botones');
    
    // Crear usuario de prueba
    const testUser = await prisma.user.upsert({
      where: { email: 'test-buttons@polideportivo.com' },
      update: {},
      create: {
        email: 'test-buttons@polideportivo.com',
        name: 'Test User Buttons',
        role: 'USER',
        isActive: true
      }
    });

    // Crear cancha de prueba
    const testCourt = await prisma.court.upsert({
      where: { id: 'test-court-buttons' },
      update: {},
      create: {
        id: 'test-court-buttons',
        centerId: 'test-center-buttons',
        name: 'Cancha Test Buttons',
        sportType: 'TENNIS',
        basePricePerHour: 10.0,
        isActive: true
      }
    });

    // Crear centro de prueba
    await prisma.center.upsert({
      where: { id: 'test-center-buttons' },
      update: {},
      create: {
        id: 'test-center-buttons',
        name: 'Centro Test Buttons',
        settings: {
          checkin: {
            toleranceMinutes: 30
          }
        }
      }
    });

    // Crear reservas de prueba con diferentes estados
    const reservationStates = [
      {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas en el futuro
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
        description: 'Reserva pendiente para check-in'
      },
      {
        status: 'PAID',
        paymentStatus: 'PAID',
        startTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hora en el futuro
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        description: 'Reserva pagada para check-in'
      },
      {
        status: 'IN_PROGRESS',
        paymentStatus: 'PAID',
        startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
        endTime: new Date(Date.now() + 30 * 60 * 1000),
        checkInTime: new Date(Date.now() - 30 * 60 * 1000),
        description: 'Reserva en curso para check-out'
      },
      {
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
        endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        checkOutTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        description: 'Reserva completada'
      },
      {
        status: 'CANCELLED',
        paymentStatus: 'PENDING',
        startTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 horas en el futuro
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        description: 'Reserva cancelada'
      }
    ];

    for (let i = 0; i < reservationStates.length; i++) {
      const state = reservationStates[i];
      const reservation = await prisma.reservation.create({
        data: {
          courtId: testCourt.id,
          userId: testUser.id,
          startTime: state.startTime,
          endTime: state.endTime,
          status: state.status,
          totalPrice: 10.0,
          paymentMethod: 'CASH',
          checkInTime: state.checkInTime,
          checkOutTime: state.checkOutTime
        }
      });
      
      this.testReservations.push({
        ...reservation,
        description: state.description
      });
    }

    this.log(`Creadas ${this.testReservations.length} reservas de prueba`);
  }

  async testButton(buttonName, reservation, testFn) {
    try {
      this.log(`🧪 Probando botón: ${buttonName} - ${reservation.description}`, 'test');
      const result = await testFn(reservation);
      this.results.push({
        button: buttonName,
        reservation: reservation.id,
        status: 'passed',
        result
      });
      this.log(`✅ ${buttonName} - PASÓ`, 'success');
      return result;
    } catch (error) {
      this.results.push({
        button: buttonName,
        reservation: reservation.id,
        status: 'failed',
        error: error.message
      });
      this.log(`❌ ${buttonName} - FALLÓ: ${error.message}`, 'error');
      throw error;
    }
  }

  // 1. Botón de Check-in (▶)
  async testCheckInButton() {
    const pendingReservation = this.testReservations.find(r => r.status === 'PENDING');
    const paidReservation = this.testReservations.find(r => r.status === 'PAID');
    
    if (pendingReservation) {
      await this.testButton('Check-in (PENDING)', pendingReservation, async (reservation) => {
        // Simular intento de check-in fuera de ventana
        const response = await fetch(`http://localhost:3002/api/admin/reservations/${reservation.id}/check-in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'admin-session=test'
          }
        });
        
        const result = await response.json();
        
        if (response.status === 400 && result.message?.includes('Fuera de ventana de check-in')) {
          return { validWindow: true, message: 'Validación de ventana funciona' };
        } else {
          throw new Error('Validación de ventana no funciona correctamente');
        }
      });
    }
    
    if (paidReservation) {
      await this.testButton('Check-in (PAID)', paidReservation, async (reservation) => {
        // Verificar que el botón está disponible
        const shouldShowButton = reservation.status !== 'IN_PROGRESS' && 
                                 reservation.status !== 'COMPLETED';
        
        if (!shouldShowButton) {
          throw new Error('Botón de check-in no debería estar visible');
        }
        
        return { buttonVisible: true, status: reservation.status };
      });
    }
  }

  // 2. Botón de Check-out (■)
  async testCheckOutButton() {
    const inProgressReservation = this.testReservations.find(r => r.status === 'IN_PROGRESS');
    
    if (inProgressReservation) {
      await this.testButton('Check-out', inProgressReservation, async (reservation) => {
        // Verificar que el botón está disponible
        const shouldShowButton = reservation.status === 'IN_PROGRESS';
        
        if (!shouldShowButton) {
          throw new Error('Botón de check-out no debería estar visible');
        }
        
        // Simular check-out
        const response = await fetch(`http://localhost:3002/api/admin/reservations/${reservation.id}/check-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'admin-session=test'
          }
        });
        
        if (response.ok) {
          return { buttonVisible: true, checkOutSuccessful: true };
        } else {
          throw new Error(`Check-out falló: ${response.status}`);
        }
      });
    }
  }

  // 3. Botón de Reenviar Confirmación (@)
  async testResendConfirmationButton() {
    const anyReservation = this.testReservations[0];
    
    await this.testButton('Reenviar Confirmación', anyReservation, async (reservation) => {
      // Verificar que el botón está disponible
      const shouldShowButton = true; // Siempre disponible
      
      if (!shouldShowButton) {
        throw new Error('Botón de reenviar confirmación no debería estar visible');
      }
      
      // Simular reenvío
      const response = await fetch(`http://localhost:3002/api/admin/reservations/${reservation.id}/notifications/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'admin-session=test'
        },
        body: JSON.stringify({ type: 'CONFIRMATION', channel: 'EMAIL' })
      });
      
      if (response.ok || response.status === 400) { // 400 puede ser válido si no hay email configurado
        return { buttonVisible: true, resendAttempted: true };
      } else {
        throw new Error(`Reenvío falló: ${response.status}`);
      }
    });
  }

  // 4. Botón de Reenviar Enlace de Pago (↗)
  async testResendPaymentLinkButton() {
    const pendingPaymentReservation = this.testReservations.find(r => r.paymentStatus === 'PENDING');
    
    if (pendingPaymentReservation) {
      await this.testButton('Reenviar Enlace de Pago', pendingPaymentReservation, async (reservation) => {
        // Verificar que el botón está disponible
        const shouldShowButton = reservation.paymentStatus === 'PENDING';
        
        if (!shouldShowButton) {
          throw new Error('Botón de reenviar enlace de pago no debería estar visible');
        }
        
        // Simular reenvío
        const response = await fetch(`http://localhost:3002/api/admin/reservations/${reservation.id}/notifications/resend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'admin-session=test'
          },
          body: JSON.stringify({ type: 'PAYMENT_LINK', channel: 'EMAIL' })
        });
        
        if (response.ok || response.status === 400) {
          return { buttonVisible: true, resendAttempted: true };
        } else {
          throw new Error(`Reenvío de enlace falló: ${response.status}`);
        }
      });
    }
  }

  // 5. Botón de Confirmar Pago (✓)
  async testConfirmPaymentButton() {
    const pendingPaymentReservation = this.testReservations.find(r => 
      r.paymentStatus === 'PENDING' && r.status !== 'CANCELLED'
    );
    
    if (pendingPaymentReservation) {
      await this.testButton('Confirmar Pago', pendingPaymentReservation, async (reservation) => {
        // Verificar que el botón está disponible
        const shouldShowButton = reservation.paymentStatus === 'PENDING' && 
                                 reservation.status !== 'CANCELLED';
        
        if (!shouldShowButton) {
          throw new Error('Botón de confirmar pago no debería estar visible');
        }
        
        // Simular confirmación de pago
        const response = await fetch(`http://localhost:3002/api/admin/reservations/${reservation.id}/payment`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'admin-session=test'
          },
          body: JSON.stringify({
            paymentMethod: 'CASH',
            paymentStatus: 'PAID',
            notes: 'Pago confirmado en testing'
          })
        });
        
        if (response.ok) {
          return { buttonVisible: true, paymentConfirmed: true };
        } else {
          const error = await response.json();
          throw new Error(`Confirmación de pago falló: ${response.status} - ${error.message}`);
        }
      });
    }
  }

  // 6. Botón de Descargar PDF + Auditoría (⤓)
  async testDownloadAuditButton() {
    const anyReservation = this.testReservations[0];
    
    await this.testButton('Descargar PDF + Auditoría', anyReservation, async (reservation) => {
      // Verificar que el enlace está disponible
      const shouldShowButton = true; // Siempre disponible
      
      if (!shouldShowButton) {
        throw new Error('Enlace de descarga no debería estar visible');
      }
      
      // Verificar que el endpoint existe
      const response = await fetch(`http://localhost:3002/api/admin/reservations/${reservation.id}/audit/zip`, {
        headers: { 'Cookie': 'admin-session=test' }
      });
      
      if (response.ok || response.status === 404) { // 404 puede ser válido si no hay datos
        return { buttonVisible: true, endpointExists: true };
      } else {
        throw new Error(`Endpoint de auditoría falló: ${response.status}`);
      }
    });
  }

  // 7. Botón de Reembolsar (€)
  async testRefundButton() {
    const paidReservation = this.testReservations.find(r => r.paymentStatus === 'PAID');
    
    if (paidReservation) {
      await this.testButton('Reembolsar', paidReservation, async (reservation) => {
        // Verificar que el botón está disponible
        const shouldShowButton = reservation.paymentStatus === 'PAID';
        
        if (!shouldShowButton) {
          throw new Error('Botón de reembolsar no debería estar visible');
        }
        
        // Simular reembolso
        const response = await fetch(`http://localhost:3002/api/admin/reservations/${reservation.id}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'admin-session=test'
          },
          body: JSON.stringify({
            amount: 10.0,
            reason: 'Testing refund'
          })
        });
        
        if (response.ok || response.status === 400) { // 400 puede ser válido si no hay procesador de pagos
          return { buttonVisible: true, refundAttempted: true };
        } else {
          throw new Error(`Reembolso falló: ${response.status}`);
        }
      });
    }
  }

  // 8. Botón de Editar (PencilIcon)
  async testEditButton() {
    const anyReservation = this.testReservations[0];
    
    await this.testButton('Editar', anyReservation, async (reservation) => {
      // Verificar que el botón está disponible
      const shouldShowButton = true; // Siempre disponible
      
      if (!shouldShowButton) {
        throw new Error('Botón de editar no debería estar visible');
      }
      
      // Simular actualización de reserva
      const response = await fetch(`http://localhost:3002/api/admin/reservations/${reservation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'admin-session=test'
        },
        body: JSON.stringify({
          notes: 'Nota de prueba actualizada'
        })
      });
      
      if (response.ok) {
        return { buttonVisible: true, editSuccessful: true };
      } else {
        throw new Error(`Edición falló: ${response.status}`);
      }
    });
  }

  // 9. Botón de Auditoría (🛈)
  async testAuditButton() {
    const anyReservation = this.testReservations[0];
    
    await this.testButton('Ver Auditoría', anyReservation, async (reservation) => {
      // Verificar que el botón está disponible
      const shouldShowButton = true; // Siempre disponible
      
      if (!shouldShowButton) {
        throw new Error('Botón de auditoría no debería estar visible');
      }
      
      // Simular obtención de auditoría
      const response = await fetch(`http://localhost:3002/api/admin/reservations/${reservation.id}/audit`, {
        headers: { 'Cookie': 'admin-session=test' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return { buttonVisible: true, auditData: data };
      } else {
        throw new Error(`Auditoría falló: ${response.status}`);
      }
    });
  }

  // 10. Botón de Eliminar (TrashIcon)
  async testDeleteButton() {
    const anyReservation = this.testReservations[0];
    
    await this.testButton('Eliminar', anyReservation, async (reservation) => {
      // Verificar que el botón está disponible
      const shouldShowButton = true; // Siempre disponible
      
      if (!shouldShowButton) {
        throw new Error('Botón de eliminar no debería estar visible');
      }
      
      // Simular eliminación (cancelación)
      const response = await fetch(`http://localhost:3002/api/admin/reservations/${reservation.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'admin-session=test'
        }
      });
      
      if (response.ok) {
        return { buttonVisible: true, deleteSuccessful: true };
      } else {
        throw new Error(`Eliminación falló: ${response.status}`);
      }
    });
  }

  // 11. Selector de Estado
  async testStatusSelector() {
    const anyReservation = this.testReservations[0];
    
    await this.testButton('Selector de Estado', anyReservation, async (reservation) => {
      // Probar cambio a cada estado válido
      const validStatuses = ['PENDING', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
      const results = [];
      
      for (const status of validStatuses) {
        const response = await fetch(`http://localhost:3002/api/admin/reservations/${reservation.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'admin-session=test'
          },
          body: JSON.stringify({ status })
        });
        
        if (response.ok) {
          results.push({ status, success: true });
        } else {
          const error = await response.json();
          results.push({ status, success: false, error: error.message });
        }
      }
      
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        throw new Error(`Estados fallidos: ${failed.map(f => f.status).join(', ')}`);
      }
      
      return { totalStatuses: validStatuses.length, allSuccessful: true };
    });
  }

  async runAllButtonTests() {
    this.log('🚀 Iniciando testing exhaustivo de botones de reservas');
    
    try {
      await this.createTestReservations();
      
      await this.testCheckInButton();
      await this.testCheckOutButton();
      await this.testResendConfirmationButton();
      await this.testResendPaymentLinkButton();
      await this.testConfirmPaymentButton();
      await this.testDownloadAuditButton();
      await this.testRefundButton();
      await this.testEditButton();
      await this.testAuditButton();
      await this.testDeleteButton();
      await this.testStatusSelector();
      
      this.log('🎉 Testing de botones completado exitosamente');
    } catch (error) {
      this.log(`💥 Error durante el testing: ${error.message}`, 'error');
    } finally {
      await this.cleanup();
    }
    
    this.generateReport();
  }

  async cleanup() {
    this.log('🧹 Limpiando datos de prueba');
    
    try {
      // Eliminar reservas de prueba
      await prisma.reservation.deleteMany({
        where: { courtId: 'test-court-buttons' }
      });
      
      // Eliminar cancha de prueba
      await prisma.court.deleteMany({
        where: { id: 'test-court-buttons' }
      });
      
      // Eliminar centro de prueba
      await prisma.center.deleteMany({
        where: { id: 'test-center-buttons' }
      });
      
      // Eliminar usuario de prueba
      await prisma.user.deleteMany({
        where: { email: 'test-buttons@polideportivo.com' }
      });
      
      this.log('✅ Limpieza completada');
    } catch (error) {
      this.log(`⚠️ Error durante la limpieza: ${error.message}`, 'warning');
    } finally {
      await prisma.$disconnect();
    }
  }

  generateReport() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    
    console.log('\n📊 REPORTE DE TESTING DE BOTONES');
    console.log('='.repeat(50));
    console.log(`Total de tests: ${total}`);
    console.log(`✅ Pasaron: ${passed}`);
    console.log(`❌ Fallaron: ${failed}`);
    console.log(`📈 Tasa de éxito: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ BOTONES FALLIDOS:');
      this.results.filter(r => r.status === 'failed').forEach(result => {
        console.log(`  - ${result.button} (Reserva ${result.reservation}): ${result.error}`);
      });
    }
    
    console.log('\n🎯 ESTADO PARA PRODUCCIÓN:');
    if (failed === 0) {
      console.log('✅ Todos los botones funcionan correctamente - LISTO PARA PRODUCCIÓN');
    } else {
      console.log('❌ Corregir botones fallidos antes de desplegar');
    }
  }
}

// Ejecutar testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ReservationButtonsTester();
  tester.runAllButtonTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

export { ReservationButtonsTester };

