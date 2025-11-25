/**
 * API Routes para gestiÃ³n de usuarios desde administraciÃ³n
 * GET /api/admin/users - Obtener lista de usuarios con filtros avanzados
 * POST /api/admin/users - Crear nuevo usuario
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';
import { hashPassword } from '@repo/auth';

// Usar cliente compartido

const GetUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLoginAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  hasReservations: z.coerce.boolean().optional(),
  hasMemberships: z.coerce.boolean().optional()
});

const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional(),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  dateOfBirth: z
    .string()
    .refine((val) => {
      if (!val) return true; // Opcional
      // Aceptar formato YYYY-MM-DD (input date) o datetime ISO
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      return dateRegex.test(val) || datetimeRegex.test(val);
    }, { message: 'Fecha de nacimiento inválida. Use formato YYYY-MM-DD' })
    .optional()
    .nullable(),
  gdprConsent: z.boolean().default(false),
  membershipType: z.string().optional().nullable(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']).default('USER'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  centerId: z.string().optional(),
  sendWelcomeEmail: z.boolean().optional().default(true)
}).refine((data) => {
  // Si el rol es USER, no se requiere contraseña (se enviará email de activación)
  // Si el rol es STAFF o ADMIN, se requiere contraseña
  if (data.role === 'USER') {
    return true; // No se requiere contraseña para USER
  }
  // Para STAFF y ADMIN, validar que la contraseña existe y tiene al menos 8 caracteres
  if (!data.password) {
    return false; // Falta contraseña
  }
  return data.password.length >= 8;
}, {
  message: 'La contraseña es requerida y debe tener al menos 8 caracteres para roles STAFF y ADMIN',
  path: ['password']
});

/**
 * GET /api/admin/users
 * Obtener lista de usuarios con filtros avanzados
 * Acceso: ADMIN Ãºnicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = GetUsersQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      const skip = (params.page - 1) * params.limit;
      
      // Construir filtros
      const where: any = {};
      
      if (params.search) {
        const searchTerm = params.search.trim();
        
        // Normalizar teléfono: eliminar espacios, guiones, paréntesis y el prefijo +
        const normalizedPhone = searchTerm.replace(/[\s\-\(\)\+]/g, '');
        const isPhoneSearch = normalizedPhone.length > 0 && /^\d+$/.test(normalizedPhone);
        
        // Construir condiciones de búsqueda
        // Buscar en name, firstName, lastName, email y phone
        const searchConditions: any[] = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } }
        ];
        
        // Si el término parece un teléfono (solo números), buscar también la versión normalizada
        if (isPhoneSearch && normalizedPhone.length >= 3) {
          searchConditions.push({
            phone: { contains: normalizedPhone, mode: 'insensitive' }
          });
        }
        
        where.OR = searchConditions;
      }
      
      if (params.role) {
        where.role = params.role;
      }
      
      if (params.status) {
        where.isActive = params.status === 'ACTIVE';
      }
      
      if (params.hasReservations !== undefined) {
        if (params.hasReservations) {
          where.reservations = { some: {} };
        } else {
          where.reservations = { none: {} };
        }
      }
      
      if (params.hasMemberships !== undefined) {
        if (params.hasMemberships) {
          where.memberships = { some: {} };
        } else {
          where.memberships = { none: {} };
        }
      }
      
      // Construir ordenamiento
      const orderBy: any = {};
      orderBy[params.sortBy] = params.sortOrder;
      
      // Obtener usuarios y total con timeout
      const [users, total] = await Promise.race([
        Promise.all([
          db.user.findMany({
            where,
            skip,
            take: params.limit,
            orderBy,
            select: {
              id: true,
              email: true,
              name: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              isActive: true,
              emailVerified: true,
              emailVerifiedAt: true,
              createdAt: true,
              updatedAt: true,
              lastLoginAt: true,
              _count: {
                select: {
                  reservations: true,
                  memberships: true
                }
              }
            }
          }),
          db.user.count({ where })
        ]),
        // Timeout de 15 segundos para la consulta principal
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout en consulta de usuarios')), 15000)
        )
      ]) as [any[], number];
      
      // Calcular estadísticas adicionales de forma optimizada (batch queries)
      let usersWithStats = users;
      
      try {
        // Obtener estadísticas en batch para todos los usuarios de una vez
        const userIds = users.map(u => u.id);
        
        const [reservationStats, membershipStats] = await Promise.race([
          Promise.all([
            // Estadísticas de reservas por usuario
            db.reservation.groupBy({
              by: ['userId'],
              where: { 
                userId: { in: userIds },
                status: { in: ['PAID', 'IN_PROGRESS', 'COMPLETED'] }
              },
              _sum: { totalPrice: true },
              _count: { id: true }
            }),
            // Estadísticas de membresías activas por usuario
            db.membership.groupBy({
              by: ['userId'],
              where: { 
                userId: { in: userIds },
                status: 'active'
              },
              _count: { id: true }
            })
          ]),
          // Timeout de 10 segundos para las estadísticas
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout en consulta de estadísticas')), 10000)
          )
        ]) as [any[], any[]];
        
        // Crear mapas para acceso rápido
        const reservationMap = new Map();
        const membershipMap = new Map();
        
        reservationStats.forEach(stat => {
          reservationMap.set(stat.userId, {
            totalSpent: Number(stat._sum.totalPrice || 0),
            activeReservations: stat._count.id
          });
        });
        
        membershipStats.forEach(stat => {
          membershipMap.set(stat.userId, {
            activeMemberships: stat._count.id
          });
        });
        
        // Aplicar estadísticas a cada usuario
        usersWithStats = users.map((user: any) => {
          const resStats = reservationMap.get(user.id) || { totalSpent: 0, activeReservations: 0 };
          const memStats = membershipMap.get(user.id) || { activeMemberships: 0 };
          
          return {
            ...user,
            stats: {
              totalSpent: resStats.totalSpent,
              activeReservations: resStats.activeReservations,
              activeMemberships: memStats.activeMemberships,
              totalReservations: user._count?.reservations ?? 0,
              totalMemberships: user._count?.memberships ?? 0,
            },
          };
        });
        
      } catch (e) {
        console.error('Error calculando estadísticas en batch, usando datos básicos:', e);
        // Fallback: usar solo los datos básicos sin estadísticas adicionales
        usersWithStats = users.map((user: any) => ({
          ...user,
          stats: {
            totalSpent: 0,
            activeReservations: 0,
            activeMemberships: 0,
            totalReservations: user._count?.reservations ?? 0,
            totalMemberships: user._count?.memberships ?? 0,
          },
        }));
      }
      
      const result = {
        data: usersWithStats,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          pages: Math.ceil(total / params.limit)
        },
        filters: {
          search: params.search,
          role: params.role,
          status: params.status,
          hasReservations: params.hasReservations,
          hasMemberships: params.hasMemberships
        },
        sorting: {
          sortBy: params.sortBy,
          sortOrder: params.sortOrder
        }
      };
      
      return ApiResponse.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      // Fallback: si falla el bloque principal, devolver lista básica sin estadísticas
      try {
        console.error('Error obteniendo usuarios (principal). Aplicando fallback sin estadísticas:', error);
        const { searchParams } = (request as any).nextUrl;
        const params = GetUsersQuerySchema.parse(Object.fromEntries(searchParams.entries()));
        const skip = (params.page - 1) * params.limit;
        const where: any = {};
        if (params.search) {
          const searchTerm = params.search.trim();
          const normalizedPhone = searchTerm.replace(/[\s\-\(\)\+]/g, '');
          const isPhoneSearch = normalizedPhone.length > 0 && /^\d+$/.test(normalizedPhone);
          
          const searchConditions: any[] = [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } }
          ];
          
          if (isPhoneSearch && normalizedPhone.length >= 3) {
            searchConditions.push({
              phone: { contains: normalizedPhone, mode: 'insensitive' }
            });
          }
          
          where.OR = searchConditions;
        }
        if (params.role) where.role = params.role;
        if (params.status) where.isActive = params.status === 'ACTIVE';
        const orderBy: any = {}; orderBy[params.sortBy] = params.sortOrder;
        const [users, total] = await Promise.all([
          db.user.findMany({ where, skip, take: params.limit, orderBy, select: {
            id: true, email: true, name: true, firstName: true, lastName: true, phone: true, role: true, isActive: true,
            emailVerified: true, emailVerifiedAt: true, createdAt: true, updatedAt: true, lastLoginAt: true,
          } }),
          db.user.count({ where })
        ]);
        return ApiResponse.success({
          data: users,
          pagination: { page: params.page, limit: params.limit, total, pages: Math.ceil(total / params.limit) },
          partial: true,
        });
      } catch (fallbackError) {
        console.error('Fallback también falló en /admin/users:', fallbackError);
        return ApiResponse.internalError('Error interno del servidor');
      }
    }
  })(request);
}

/**
 * POST /api/admin/users
 * Crear nuevo usuario desde administraciÃ³n
 * Acceso: ADMIN Ãºnicamente
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const adminUser = (req as any).user;
      const body = await req.json();
      const userData = CreateUserSchema.parse(body);
      
      // Verificar que el email no esté en uso
      const existingUser = await db.user.findUnique({
        where: { email: userData.email }
      });
      
      if (existingUser) {
        return ApiResponse.conflict('El email ya está registrado');
      }
      
      // Determinar si se requiere contraseña
      const isUserRole = userData.role === 'USER';
      const requiresPassword = !isUserRole; // STAFF y ADMIN requieren contraseña
      
      if (requiresPassword && !userData.password) {
        return ApiResponse.badRequest('La contraseña es requerida para roles STAFF y ADMIN');
      }
      
      // Hashear contraseña solo si se proporciona
      const hashedPassword = userData.password ? await hashPassword(userData.password) : null;
      
      // Crear usuario
      const newUser = await db.user.create({
        data: {
          email: userData.email,
          password: hashedPassword, // null para USER sin contraseña
          firstName: userData.firstName,
          lastName: userData.lastName,
          name: `${userData.firstName} ${userData.lastName}`.trim(),
          phone: userData.phone,
          dateOfBirth: userData.dateOfBirth 
            ? new Date(userData.dateOfBirth.includes('T') 
                ? userData.dateOfBirth 
                : `${userData.dateOfBirth}T00:00:00`) 
            : null,
          gdprConsent: userData.gdprConsent,
          membershipType: userData.membershipType ?? null,
          role: userData.role,
          isActive: userData.status === 'ACTIVE',
          // Para USER sin contraseña, no verificar email hasta que establezca contraseña
          emailVerified: !isUserRole || !!hashedPassword,
          emailVerifiedAt: (!isUserRole || !!hashedPassword) ? new Date() : null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true,
          phone: true,
          dateOfBirth: true,
          gdprConsent: true,
          membershipType: true,
          role: true,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      // Si es usuario USER sin contraseña, generar token de activación
      if (isUserRole && !hashedPassword) {
        try {
          // Generar token seguro criptográficamente
          const crypto = await import('crypto');
          const activationToken = crypto.randomBytes(32).toString('hex');
          
          // Calcular expiración (48 horas) - tiempo suficiente pero no excesivo
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 48);
          
          // Log de seguridad (sin exponer el token completo)
          console.log(`[SECURITY] Token de activación generado para usuario ${newUser.id} (${newUser.email}), expira: ${expiresAt.toISOString()}`);
          
          // Crear token de activación (reutilizando PasswordResetToken)
          await db.passwordResetToken.create({
            data: {
              token: activationToken,
              userId: newUser.id,
              expiresAt: expiresAt
            }
          });
          
          // Enviar email de activación
          try {
            const { NotificationService } = await import('@repo/notifications');
            const notificationService = new NotificationService();
            
            // Construir URL de activación
            const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const activationUrl = `${baseUrl}/auth/set-password?token=${activationToken}`;
            
            // Enviar email de activación
            await notificationService.sendEmail({
              to: newUser.email,
              subject: 'Activa tu cuenta - Establece tu contraseña',
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Activa tu cuenta</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">¡Bienvenido a Polideportivo Victoria Hernández!</h1>
                  </div>
                  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
                    <p style="font-size: 16px;">Hola <strong>${newUser.firstName || newUser.name || 'Usuario'}</strong>,</p>
                    <p style="font-size: 16px;">Tu cuenta ha sido creada exitosamente. Para completar tu registro y comenzar a usar nuestros servicios, necesitas establecer tu contraseña.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${activationUrl}" style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Establecer Contraseña</a>
                    </div>
                    <p style="font-size: 14px; color: #6b7280;">O copia y pega este enlace en tu navegador:</p>
                    <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">${activationUrl}</p>
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0; font-size: 14px; color: #92400e;">
                        <strong>⚠️ Importante:</strong> Este enlace expirará en 48 horas por razones de seguridad.
                      </p>
                    </div>
                    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">Si no solicitaste esta cuenta, puedes ignorar este correo.</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="font-size: 12px; color: #9ca3af; text-align: center;">© ${new Date().getFullYear()} Polideportivo Victoria Hernández. Todos los derechos reservados.</p>
                  </div>
                </body>
                </html>
              `
            });
            
            console.log(`✅ Email de activación enviado a ${newUser.email}`);
          } catch (emailError) {
            console.error('❌ Error enviando email de activación:', emailError);
            // No fallar la creación del usuario si falla el email
            // El admin puede reenviar el enlace manualmente
          }
        } catch (tokenError) {
          console.error('❌ Error generando token de activación:', tokenError);
          // Si falla la generación del token, el usuario puede usar "Olvidé mi contraseña"
        }
      } else if (userData.sendWelcomeEmail) {
        // Enviar email de bienvenida estándar para usuarios con contraseña
        try {
          const { NotificationService } = await import('@repo/notifications');
          const notificationService = new NotificationService();
          
          await notificationService.sendEmail({
            to: newUser.email,
            subject: 'Bienvenido a Polideportivo Victoria Hernández',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Hola <strong>${newUser.firstName || newUser.name || 'Usuario'}</strong>,</p>
                <p>Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión con tu email y contraseña.</p>
                <p>¡Bienvenido!</p>
              </body>
              </html>
            `
          });
          console.log(`✅ Email de bienvenida enviado a ${newUser.email}`);
        } catch (emailError) {
          console.error('❌ Error enviando email de bienvenida:', emailError);
        }
      }
      
      return ApiResponse.success(newUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error creando usuario:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/admin/users
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
