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
  const adminEmails = [
    'admin@polideportivo.com',
    'administrador@polideportivo.com',
    'director@polideportivo.com'
  ];
  
  const staffEmails = [
    'staff@polideportivo.com',
    'empleado@polideportivo.com',
    'recepcion@polideportivo.com'
  ];
  
  if (adminEmails.includes(email.toLowerCase())) {
    return 'ADMIN';
  }
  
  if (staffEmails.includes(email.toLowerCase())) {
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
      console.error('Error en firebase-sync:', error);
      
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }

      return ApiResponse.internalError('Error interno del servidor');
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
