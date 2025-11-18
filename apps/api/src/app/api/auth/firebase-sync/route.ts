/**
 * API Route para sincronización de usuarios Firebase
 * POST /api/auth/firebase-sync - Sincronizar usuario de Firebase con base de datos local
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/db';
import { hashPassword } from '@repo/auth';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';

// Schema de validación para datos de sincronización Firebase
const FirebaseSyncSchema = z.object({
  firebaseUid: z.string().min(1, 'Firebase UID es requerido'),
  email: z.string().email('Email inválido'),
  name: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  action: z.enum(['signin', 'signup']).default('signin')
});

/**
 * Determina el rol del usuario basado en el email
 */
function determineUserRole(email: string): 'ADMIN' | 'STAFF' | 'USER' {
  const adminEmails = new Set([
    'admin@polideportivovictoriahernandez.es',
    'administrador@polideportivovictoriahernandez.es',
    'director@polideportivovictoriahernandez.es'
  ]);
  
  const staffEmails = new Set([
    'staff@polideportivovictoriahernandez.es',
    'empleado@polideportivovictoriahernandez.es',
    'recepcion@polideportivovictoriahernandez.es'
  ]);
  
  if (adminEmails.has(email.toLowerCase())) {
    return 'ADMIN';
  }
  
  if (staffEmails.has(email.toLowerCase())) {
    return 'STAFF';
  }
  
  return 'USER';
}

/**
 * POST /api/auth/firebase-sync
 * Sincronizar usuario de Firebase con la base de datos local
 */
export async function POST(req: NextRequest) {
  return withPublicMiddleware(async (request: NextRequest) => {
    try {
      const body = await request.json();
      const validatedData = FirebaseSyncSchema.parse(body);
      
      const { firebaseUid, email, name, image, action } = validatedData;

      // Buscar usuario existente por email o firebaseUid
      let existingUser = await db.user.findFirst({
        where: {
          OR: [
            { email },
            { firebaseUid }
          ]
        }
      });

      if (existingUser) {
        // Usuario existe, actualizar firebaseUid si es necesario
        if (!existingUser.firebaseUid) {
          existingUser = await db.user.update({
            where: { id: existingUser.id },
            data: {
              firebaseUid,
              name: name || existingUser.name,
              avatar: image || existingUser.avatar,
              lastLoginAt: new Date()
            }
          });
        } else {
          // Solo actualizar última conexión
          existingUser = await db.user.update({
            where: { id: existingUser.id },
            data: {
              lastLoginAt: new Date()
            }
          });
        }

        return ApiResponse.success({
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            image: existingUser.avatar,
            role: existingUser.role,
            membershipType: existingUser.membershipType,
            creditsBalance: existingUser.creditsBalance,
            isActive: existingUser.isActive
          }
        });
      }

      // Usuario no existe, crear nuevo si la acción lo permite
      if (action === 'signup' || action === 'signin') {
        const role = determineUserRole(email);
        
        // Generar contraseña temporal para usuarios de Firebase
        const tempPassword = await hashPassword(firebaseUid);
        
        const newUser = await db.user.create({
          data: {
            email,
            name: name || email.split('@')[0],
            avatar: image,
            firebaseUid,
            password: tempPassword, // Contraseña temporal basada en firebaseUid
            role,
            membershipType: 'basic',
            creditsBalance: 0,
            isActive: true,
            emailVerified: true, // Firebase ya verifica el email
            emailVerifiedAt: new Date(),
            lastLoginAt: new Date()
          }
        });

        // Log de evento de seguridad
        console.log('SECURITY_EVENT:', {
          type: 'LOGIN_SUCCESS',
          userId: newUser.id,
          method: 'firebase',
          provider: action === 'signup' ? 'firebase-signup' : 'firebase-signin',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });

        // Enviar correo de bienvenida solo para nuevos usuarios (signup)
        if (action === 'signup' && newUser.email) {
          try {
            const { NotificationService } = await import('@repo/notifications');
            const notificationService = new NotificationService();
            
            await notificationService.sendEmailTemplate('welcome', newUser.email, {
              name: newUser.name || newUser.email?.split('@')[0] || 'Usuario'
            });
            
            console.log(`Correo de bienvenida enviado a: ${newUser.email}`);
          } catch (emailError) {
            console.error('Error enviando correo de bienvenida:', emailError);
            // No fallar el registro por error en el correo
          }
        }

        return ApiResponse.success({
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            image: newUser.avatar,
            role: newUser.role,
            membershipType: newUser.membershipType,
            creditsBalance: newUser.creditsBalance,
            isActive: newUser.isActive
          }
        });
      }

      return ApiResponse.notFound('Usuario');

    } catch (error) {
      console.error('❌ [FIREBASE-SYNC] Error completo:', error);
      
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }

      // Log detallado del error para diagnóstico
      const errorDetails: any = {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
      };

      // Si es un error de Prisma, agregar más detalles
      if (error && typeof error === 'object' && 'code' in error) {
        errorDetails.code = (error as any).code;
        errorDetails.meta = (error as any).meta;
        errorDetails.target = (error as any).target;
      }

      // Log de la URL de base de datos (sin exponer credenciales)
      const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL || 'NO_CONFIGURADA';
      const dbUrlPreview = dbUrl.replace(/:[^:@]*@/, ':***@').substring(0, 100);
      console.error('❌ [FIREBASE-SYNC] DATABASE_URL:', dbUrlPreview);
      console.error('❌ [FIREBASE-SYNC] Error details:', JSON.stringify(errorDetails, null, 2));

      return ApiResponse.error(
        error instanceof Error ? error.message : 'Error interno del servidor',
        500,
        {
          error: errorDetails,
          databaseUrlConfigured: !!process.env.DATABASE_URL,
          directDatabaseUrlConfigured: !!process.env.DIRECT_DATABASE_URL,
        }
      );
    }
  })(req);
}

/**
 * OPTIONS /api/auth/firebase-sync
 * Manejar preflight requests para CORS
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
