/**
 * API Routes para gestiÃ³n de membresÃ­as
 * GET /api/memberships - Obtener lista de membresÃ­as
 * POST /api/memberships - Crear nueva membresÃ­a
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { MembershipService, CreateMembershipSchema, GetMembershipsSchema } from '../../../lib/services/membership.service';
import { withAuthMiddleware, withStaffMiddleware, withAdminMiddleware, ApiResponse } from '@/lib/middleware';

const membershipService = new MembershipService();

/**
 * GET /api/memberships
 * Obtener lista de membresÃ­as con filtros y paginaciÃ³n
 * Los usuarios pueden ver solo sus membresÃ­as, STAFF/ADMIN pueden ver todas
 */
export async function GET(req: NextRequest) {
  return withAuthMiddleware(async (request: NextRequest) => {
  try {
    const { user } = (req as any) || {};
    const { searchParams } = request.nextUrl;
    const params = GetMembershipsSchema.parse(Object.fromEntries(searchParams.entries()));
    
    // Si es usuario normal, solo puede ver sus propias membresÃ­as
    if (user.role === 'USER') {
      params.userId = user.id;
    }
    
    const result = await membershipService.getMemberships(params);
    
    return ApiResponse.success(result);
  } catch (error) {
    console.error('Error obteniendo membresÃ­as:', error);
    
    if (error instanceof z.ZodError) {
      return ApiResponse.validation(
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
  })(req);
}

/**
 * POST /api/memberships
 * Crear una nueva membresÃ­a
 * Los usuarios pueden crear sus propias membresÃ­as, ADMIN puede crear para cualquier usuario
 */
export async function POST(req: NextRequest) {
  return withAuthMiddleware(async (request: NextRequest) => {
  try {
    const { user } = (req as any) || {};
    const body = await request.json();
    
    // Si es usuario normal, solo puede crear membresÃ­as para sÃ­ mismo
    if (user.role === 'USER') {
      body.userId = user.id;
    }
    
    // Verificar que el usuario puede crear membresÃ­as para el userId especificado
    if (user.role !== 'ADMIN' && body.userId !== user.id) {
      return ApiResponse.forbidden('Solo puedes crear membresÃ­as para ti mismo');
    }
    
    const membership = await membershipService.createMembership(body);
    
    return ApiResponse.success(membership, 201);
  } catch (error) {
    console.error('Error creando membresÃ­a:', error);
    
    if (error instanceof z.ZodError) {
      return ApiResponse.validation(
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Usuario no encontrado')) {
        return ApiResponse.notFound('Usuario');
      }
      if (error.message.includes('ya tiene una membresÃ­a activa')) {
        return ApiResponse.error(error.message, 409);
      }
      if (error.message.includes('Error al procesar el pago')) {
        return ApiResponse.error(error.message, 402);
      }
    }
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
  })(req);
}

/**
 * OPTIONS /api/memberships
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
