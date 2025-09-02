import { NextRequest } from 'next/server';
// Forzar Node.js runtime: pdfkit no funciona en Edge
export const runtime = 'nodejs';
import { auth } from '@repo/auth';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  let userId: string | null = null;
  
  // 1) Intentar autenticación de sesión primero
  try {
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
      console.log('✅ [RECEIPT] Usuario autenticado por sesión:', userId);
    }
  } catch (sessionError) {
    console.log('⚠️ [RECEIPT] Error en autenticación de sesión:', sessionError);
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
        console.log('✅ [RECEIPT] Usuario autenticado por JWT header:', userId);
      } catch (jwtError) {
        console.log('❌ [RECEIPT] Error en autenticación JWT header:', jwtError);
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
        
        // Verificar que es un token de acceso al recibo
        if (payload.type === 'receipt-access') {
          userId = payload.userId || payload.id || payload.uid;
          console.log('✅ [RECEIPT] Usuario autenticado por token query:', userId);
        } else {
          console.log('❌ [RECEIPT] Token no es de tipo receipt-access');
        }
      } catch (jwtError) {
        console.log('❌ [RECEIPT] Error en autenticación JWT query:', jwtError);
      }
    }
  }

  const id = request.nextUrl.pathname.split('/').slice(-2, -1)[0];
  if (!id) return new Response('ID requerido', { status: 400 });
  
  const reservation = await db.reservation.findUnique({ 
    where: { id }, 
    include: { user: true, court: { include: { center: true } } } 
  });
  
  if (!reservation) {
    return new Response('Reserva no encontrada', { status: 404 });
  }

  // 4) En desarrollo, permitir acceso sin autenticación para facilitar pruebas
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ [RECEIPT] Modo desarrollo: permitiendo acceso público');
    // No validar pertenencia en desarrollo
  } else if (userId && reservation.userId !== userId) {
    // En producción, validar que el usuario es propietario de la reserva
    return new Response('No autorizado', { status: 401 });
  } else if (!userId) {
    // En producción, requerir autenticación
    return new Response('No autorizado', { status: 401 });
  }

  // Generar recibo usando React-PDF (sin dependencias nativas)
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { default: ReceiptPDF } = await import('../../../../../components/ReceiptPDF');
  
  // Configuración dinámica del centro
  const centerSettings: any = (reservation.court.center as any).settings || {};
  const receiptCfg: any = centerSettings.receipt || {};
  
  // Calcular overrides y ajustes
  let total = Number(reservation.totalPrice || 0);
  let sumOverrides = 0;
  let reasons: string[] = [];
  try {
    const overrideEvents = await db.outboxEvent.findMany({
      where: { eventType: 'PRICE_OVERRIDE', eventData: { path: ['reservationId'], equals: reservation.id } as any } as any,
      select: { eventData: true },
      orderBy: { createdAt: 'asc' },
    });
    for (const ev of overrideEvents as any[]) {
      sumOverrides += Number(ev?.eventData?.delta || 0);
      if (ev?.eventData?.reason) reasons.push(String(ev.eventData.reason));
    }
  } catch {}
  
  const buffer = await renderToBuffer(
    ReceiptPDF({
      reservation,
      centerSettings: receiptCfg,
      total,
      sumOverrides,
      reasons
    })
  );
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=recibo-${reservation.id}.pdf`,
    },
  });
}


