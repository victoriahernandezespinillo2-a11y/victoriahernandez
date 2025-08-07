/**
 * API Routes para operaciones específicas de membresías
 * GET /api/memberships/[id] - Obtener membresía por ID
 * PUT /api/memberships/[id] - Actualizar membresía
 * DELETE /api/memberships/[id] - Cancelar membresía
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { MembershipService, UpdateMembershipSchema } from '../../../../lib/services/membership.service';
import { withAuthMiddleware, withAdminMiddleware, ApiResponse, AuthenticatedContext } from '../../../../lib/middleware';

const membershipService = new MembershipService();

/**
 * GET /api/memberships/[id]
 * Obtener membresía por ID
 * Los usuarios pueden ver sus propias membresías, STAFF/ADMIN pueden ver cualquier membresía
 */
export const GET = withAuthMiddleware(async (
  req: NextRequest,
  { params, user }: AuthenticatedContext & { params: { id: string } }
) => {
  try {
    const membershipId = params.id;
    
    const membership = await membershipService.getMembershipById(membershipId);
    
    // Verificar permisos: usuarios solo pueden ver sus propias membresías
    if (user.role === 'USER' && membership.userId !== user.id) {
      return ApiResponse.forbidden('Solo puedes ver tus propias membresías');
    }
    
    return ApiResponse.success(membership);
  } catch (error) {
    console.error('Error obteniendo membresía:', error);
    
    if (error instanceof Error && error.message === 'Membresía no encontrada') {
      return ApiResponse.notFound('Membresía');
    }
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
});

/**
 * PUT /api/memberships/[id]
 * Actualizar membresía
 * Solo ADMIN puede actualizar membresías
 */
export const PUT = withAdminMiddleware(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const membershipId = params.id;
    const body = await req.json();
    
    const updatedMembership = await membershipService.updateMembership(membershipId, body);
    
    return ApiResponse.success(updatedMembership);
  } catch (error) {
    console.error('Error actualizando membresía:', error);
    
    if (error instanceof z.ZodError) {
      return ApiResponse.validation(
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }
    
    if (error instanceof Error && error.message === 'Membresía no encontrada') {
      return ApiResponse.notFound('Membresía');
    }
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
});

/**
 * DELETE /api/memberships/[id]
 * Cancelar membresía (suspender)
 * Los usuarios pueden cancelar sus propias membresías, ADMIN puede cancelar cualquier membresía
 */
export const DELETE = withAuthMiddleware(async (
  req: NextRequest,
  { params, user }: AuthenticatedContext & { params: { id: string } }
) => {
  try {
    const membershipId = params.id;
    
    // Obtener la membresía para verificar permisos
    const membership = await membershipService.getMembershipById(membershipId);
    
    // Verificar permisos: usuarios solo pueden cancelar sus propias membresías
    if (user.role === 'USER' && membership.userId !== user.id) {
      return ApiResponse.forbidden('Solo puedes cancelar tus propias membresías');
    }
    
    const { searchParams } = req.nextUrl;
    const reason = searchParams.get('reason') || undefined;
    
    const suspendedMembership = await membershipService.suspendMembership(membershipId, reason);
    
    return ApiResponse.success(suspendedMembership);
  } catch (error) {
    console.error('Error cancelando membresía:', error);
    
    if (error instanceof Error && error.message === 'Membresía no encontrada') {
      return ApiResponse.notFound('Membresía');
    }
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
});

/**
 * OPTIONS /api/memberships/[id]
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}