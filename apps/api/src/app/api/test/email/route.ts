import { NextRequest } from 'next/server';
import { notificationService } from '@repo/notifications';
import { ApiResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [EMAIL-TEST] Iniciando test de email...');
    
    // Test simple de envío de email
    const testEmail = 'test@example.com';
    const testVariables = {
      userName: 'Usuario Test',
      courtName: 'Cancha Test',
      date: '2025-01-15',
      startTime: '10:00',
      endTime: '11:00',
      duration: '60',
      price: '15.00',
      reservationCode: 'TEST123',
      qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      accessPassUrl: 'https://example.com/pass',
      googleCalendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    };
    
    console.log('🧪 [EMAIL-TEST] Enviando email de prueba...');
    
    const result = await notificationService.sendEmailTemplate(
      'reservationConfirmation',
      testEmail,
      testVariables
    );
    
    console.log('🧪 [EMAIL-TEST] Resultado:', result);
    
    return ApiResponse.success({
      message: 'Test de email completado',
      result,
      configuration: {
        emailProvider: process.env.EMAIL_PROVIDER || 'smtp',
        hasSmtpHost: !!process.env.SMTP_HOST,
        hasGmailUser: !!process.env.GMAIL_USER,
        hasSendgridKey: !!process.env.SENDGRID_API_KEY
      }
    });
    
  } catch (error) {
    console.error('🧪 [EMAIL-TEST] Error:', error);
    return ApiResponse.internalError('Error en test de email: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}




