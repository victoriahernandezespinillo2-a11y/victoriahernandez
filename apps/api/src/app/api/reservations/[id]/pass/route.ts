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

  // 9) Importación dinámica de PDFDocument
  // Importación robusta de pdfkit (ESM/CJS)
  let PDFDocument: any;
  try {
    const mod = await import('pdfkit');
    PDFDocument = (mod as any)?.default || (mod as any);
  } catch {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const PDFKitImport = require('pdfkit');
    PDFDocument = (PDFKitImport as any)?.default || PDFKitImport;
  }

  // 10) Crear documento PDF con pdfkit
  const doc = new PDFDocument({ 
    margin: 0, 
    size: [400, 600], // formato vertical elegante
    bufferPages: true 
  });
  const chunks: any[] = [];
  doc.on('data', (c: any) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks as any))));

  // 11) Crear PDF con diseño minimalista y elegante sin iconos
  // Fondo degradado moderno
  const gradient = doc.linearGradient(0, 0, 0, 600);
  gradient.stop(0, '#667eea'); // Azul moderno
  gradient.stop(0.5, '#764ba2'); // Púrpura
  gradient.stop(1, '#f093fb'); // Rosa suave
  doc.rect(0, 0, 400, 600).fill(gradient);

  // Patrón geométrico sutil
  doc.save();
  doc.fillColor('#ffffff');
  doc.opacity(0.05);
  for (let i = 0; i < 400; i += 30) {
    for (let j = 0; j < 600; j += 30) {
      doc.circle(i, j, 2).fill();
    }
  }
  doc.restore();

  // Header minimalista y elegante
  // Título principal centrado
  doc.fillColor('#ffffff')
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('POLIDEPORTIVO', 40, 50, { align: 'center', width: 320 });

  // Nombre del centro centrado
  doc.fillColor('#ffffff')
     .fontSize(22)
     .font('Helvetica-Bold')
     .text('VICTORIA HERNANDEZ', 40, 85, { align: 'center', width: 320 });

  // Subtítulo centrado
  doc.fillColor('#e2e8f0')
     .fontSize(16)
     .font('Helvetica')
     .text('PASE DE ACCESO', 40, 115, { align: 'center', width: 320 });

  // Línea decorativa sutil
  doc.save();
  doc.strokeColor('#ffffff');
  doc.lineWidth(1);
  doc.opacity(0.2);
  doc.moveTo(60, 140);
  doc.lineTo(340, 140);
  doc.stroke();
  doc.restore();

  // Información de la cancha centrada
  doc.fillColor('#ffffff')
     .fontSize(20)
     .font('Helvetica-Bold')
     .text(`CANCHA ${reservation.court.name.split(' ').pop() || '1'}`, 40, 170, { align: 'center', width: 320 });

  // Tipo de deporte detectado centrado
  const courtName = reservation.court.name.toLowerCase();
  let sportType = 'DEPORTE';
  
  if (courtName.includes('futbol') || courtName.includes('fútbol')) {
    sportType = 'FÚTBOL 7';
  } else if (courtName.includes('tenis')) {
    sportType = 'TENIS';
  } else if (courtName.includes('padel') || courtName.includes('pádel')) {
    sportType = 'PÁDEL';
  } else if (courtName.includes('basquet') || courtName.includes('básquet')) {
    sportType = 'BÁSQUET';
  } else if (courtName.includes('voley') || courtName.includes('voleibol')) {
    sportType = 'VOLEIBOL';
  } else if (courtName.includes('paddle')) {
    sportType = 'PADDLE';
  }
  
  doc.fillColor('#e2e8f0')
     .fontSize(14)
     .font('Helvetica')
     .text(sportType, 40, 195, { align: 'center', width: 320 });

  // Fecha y hora centrada
  const dateStr = reservation.startTime.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  const timeStr = reservation.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const endTimeStr = reservation.endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  doc.fillColor('#ffffff')
     .fontSize(16)
     .font('Helvetica')
     .text(`${dateStr} ${timeStr} – ${endTimeStr}`, 40, 210, { align: 'center', width: 320 });

  // QR Code centrado y prominente con mejor diseño
  const qrSize = 180;
  const qrX = (400 - qrSize) / 2;
  const qrY = 250;
  
  // Marco exterior elegante con sombra
  doc.save();
  doc.fillColor('#ffffff');
  doc.opacity(0.98);
  doc.rect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40).fill();
  doc.restore();
  
  // Borde exterior del marco
  doc.save();
  doc.strokeColor('#e2e8f0');
  doc.lineWidth(3);
  doc.rect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40).stroke();
  doc.restore();
  
  // Marco interior con borde más fino
  doc.save();
  doc.strokeColor('#cbd5e1');
  doc.lineWidth(1);
  doc.rect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30).stroke();
  doc.restore();

  // Convertir QR data URL a buffer
  const base64Parts = qrDataUrl.split(',');
  const base64 = base64Parts[1];
  if (!base64) {
    throw new Error('QR code data URL format is invalid');
  }
  const qrBuffer = Buffer.from(base64, 'base64');
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  // Información del usuario centrada (con más espacio del QR)
  doc.fillColor('#ffffff')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text(reservation.user?.name || 'Usuario', 40, qrY + qrSize + 50, { align: 'center', width: 320 });

  // Código de reserva centrado
  doc.fillColor('#e2e8f0')
     .fontSize(14)
     .font('Helvetica')
     .text(`Código: #${code}`, 40, qrY + qrSize + 80, { align: 'center', width: 320 });

  // Información de validez centrada
  doc.fillColor('#cbd5e1')
     .fontSize(12)
     .font('Helvetica')
     .text(`Válido hasta: ${endPlus.toLocaleString('es-ES')}`, 40, qrY + qrSize + 105, { align: 'center', width: 320 });

  // Estado de la reserva centrado
  const statusLabel = RESERVATION_STATUS_LABELS[reservation.status as keyof typeof RESERVATION_STATUS_LABELS] || reservation.status;
  
  doc.fillColor('#10b981') // Verde para estado válido
     .fontSize(11)
     .font('Helvetica-Bold')
     .text(statusLabel, 40, qrY + qrSize + 125, { align: 'center', width: 320 });

  // Instrucciones centradas
  doc.fillColor('#94a3b8')
     .fontSize(11)
     .font('Helvetica')
     .text('Presenta este código al personal de acceso', 40, qrY + qrSize + 150, { align: 'center', width: 320 });

  // Línea decorativa final sutil
  doc.save();
  doc.strokeColor('#ffffff');
  doc.lineWidth(1);
  doc.opacity(0.15);
  doc.moveTo(60, qrY + qrSize + 175);
  doc.lineTo(340, qrY + qrSize + 175);
  doc.stroke();
  doc.restore();

  doc.end();
  const buffer = await done;
  
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=pase-${code}.pdf`,
    },
  });
}



