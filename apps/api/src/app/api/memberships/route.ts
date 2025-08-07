/**
 * API Routes para gestión de membresías
 * GET /api/memberships - Obtener lista de membresías
 * POST /api/memberships - Crear nueva membresía
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { MembershipService, CreateMembershipSchema, GetMembershipsSchema } from '../../../lib/services/membership.service';
import { withAuthMiddleware, withStaffMiddleware, withAdminMiddleware, ApiResponse, AuthenticatedContext } from '../../../lib/middleware';

const membershipService = new MembershipService();

/**
 * GET /api/memberships
 * Obtener lista de membresías con filtros y paginación
 * Los usuarios pueden ver solo sus membresías, STAFF/ADMIN pueden ver todas
 */
export const GET = withAuthMiddleware(async (
  req: NextRequest,
  { user }: AuthenticatedContext
) => {
  try {
    const { searchParams } = req.nextUrl;
    const params = Object.fromEntries(searchParams.entries());
    
    // Si es usuario normal, solo puede ver sus propias membresías
    if (user.role === 'USER') {
      params.userId = user.id;
    }
    
    const result = await membershipService.getMemberships(params);
    
    return ApiResponse.success(result);
  } catch (error) {
    console.error('Error obteniendo membresías:', error);
    
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
});

/**
 * POST /api/memberships
 * Crear una nueva membresía
 * Los usuarios pueden crear sus propias membresías, ADMIN puede crear para cualquier usuario
 */
export const POST = withAuthMiddleware(async (
  req: NextRequest,
  { user }: AuthenticatedContext
) => {
  try {
    const body = await req.json();
    
    // Si es usuario normal, solo puede crear membresías para sí mismo
    if (user.role === 'USER') {
      body.userId = user.id;
    }
    
    // Verificar que el usuario puede crear membresías para el userId especificado
    if (user.role !== 'ADMIN' && body.userId !== user.id) {
      return ApiResponse.forbidden('Solo puedes crear membresías para ti mismo');
    }
    
    const membership = await membershipService.createMembership(body);
    
    return ApiResponse.success(membership, 201);
  } catch (error) {
    console.error('Error creando membresía:', error);
    
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
      if (error.message.includes('ya tiene una membresía activa')) {
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
});

/**
 * OPTIONS /api/memberships
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}