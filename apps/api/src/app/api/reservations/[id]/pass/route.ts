// Pase de acceso del usuario (con QR)
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';
import { 
  VALID_PASS_STATUSES, 
  RESERVATION_STATUS_MESSAGES, 
  RESERVATION_STATUS_LABELS,
  PASS_EXPIRATION_BUFFER_HOURS 
} from '../../../../../lib/constants/reservation.constants';
import { PassValidationService } from '../../../../../lib/services/pass-validation.service';

export async function GET(request: NextRequest) {
  let userId: string | null = null;
  
  // 1) Intentar autenticación de sesión primero
  try {
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
      console.log('✅ [PASS] Usuario autenticado por sesión:', userId);
    }
  } catch (sessionError) {
    console.log('⚠️ [PASS] Error en autenticación de sesión:', sessionError);
  }

  // 2) Si no hay sesión, intentar autenticación por token JWT en header
  if (!userId) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = (await import('jsonwebtoken')) as unknown as typeof import('jsonwebtoken');
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        userId = payload.uid || payload.userId || payload.id;
        console.log('✅ [PASS] Usuario autenticado por JWT header:', userId);
      } catch (jwtError) {
        console.log('❌ [PASS] Error en autenticación JWT header:', jwtError);
      }
    }
  }

  // 3) Si no hay autenticación, intentar token en query parameter
  if (!userId) {
    const tokenParam = request.nextUrl.searchParams.get('token');
    if (tokenParam) {
      try {
        const jwt = (await import('jsonwebtoken')) as unknown as typeof import('jsonwebtoken');
        const payload = jwt.verify(tokenParam, process.env.JWT_SECRET || 'your-secret-key') as any;
        
        // Verificar que es un token de acceso al pase
        if (payload.type === 'pass-access') {
          userId = payload.userId || payload.id || payload.uid;
          console.log('✅ [PASS] Usuario autenticado por token query:', userId);
        } else {
          console.log('❌ [PASS] Token no es de tipo pass-access');
        }
      } catch (jwtError) {
        console.log('❌ [PASS] Error en autenticación JWT query:', jwtError);
      }
    }
  }

  // 4) ID de reserva y validación
  const id = request.nextUrl.pathname.split('/').slice(-2, -1)[0];
  if (!id) return new Response('ID requerido', { status: 400 });

  const reservation = await db.reservation.findUnique({
    where: { id },
    include: { user: true, court: { include: { center: true } } },
  });
  
  if (!reservation) {
    return new Response('Reserva no encontrada', { status: 404 });
  }

  // 🔒 VALIDACIÓN ROBUSTA DE ESTADO DE RESERVA
  // Solo permitir pases para reservas en estado válido
  const validation = PassValidationService.validateReservationForPass(
    reservation.status,
    reservation.endTime
  );

  if (!validation.isValid) {
    return new Response(validation.message, { 
      status: validation.statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 📊 LOGGING PROFESIONAL PARA AUDITORÍA
  PassValidationService.logValidation(
    reservation.id,
    reservation.status,
    reservation.userId,
    reservation.courtId,
    true
  );

  // 5) En desarrollo, permitir acceso sin autenticación para facilitar pruebas
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ [PASS] Modo desarrollo: permitiendo acceso público');
    // No validar pertenencia en desarrollo
  } else if (userId && reservation.userId !== userId) {
    // En producción, validar que el usuario es propietario de la reserva
    return new Response('No autorizado', { status: 401 });
  } else if (!userId) {
    // En producción, requerir autenticación
    return new Response('No autorizado', { status: 401 });
  }

  // 6) Generar token QR
  const endPlus = new Date(reservation.endTime.getTime() + PASS_EXPIRATION_BUFFER_HOURS * 60 * 60 * 1000); // +1h
  const expSeconds = Math.floor(endPlus.getTime() / 1000);
  const jwt = (await import('jsonwebtoken')) as unknown as typeof import('jsonwebtoken');
  const token = jwt.sign(
    { 
      reservationId: reservation.id, 
      uid: reservation.userId, 
      status: reservation.status,
      startTime: reservation.startTime.toISOString(),
      endTime: reservation.endTime.toISOString(),
      validatedAt: new Date().toISOString(),
      exp: expSeconds 
    },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  // 7) Generar QR
  const QRCode = (await import('qrcode')) as unknown as { toDataURL: (text: string, opts?: any) => Promise<string> };
  const qrDataUrl = await QRCode.toDataURL(token, { width: 320, margin: 1 });

  // 8) Preparar datos
  const center: any = reservation.court.center;
  const title = (center?.name || 'Polideportivo').toString();
  const code = reservation.id.slice(0, 10).toUpperCase();

  // 9) Generar PDF usando React-PDF (sin dependencias nativas)
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { default: PassPDF } = await import('../../../../../components/PassPDF');
  
  const statusLabel = RESERVATION_STATUS_LABELS[reservation.status as keyof typeof RESERVATION_STATUS_LABELS] || reservation.status;
  
  const buffer = await renderToBuffer(
    PassPDF({
      reservation,
      qrDataUrl,
      expiresAt: endPlus,
      statusLabel
    })
  );
  
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=pase-${code}.pdf`,
    },
  });
}



