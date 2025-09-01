/**
 * API Routes para operaciones específicas de membresías
 * GET /api/memberships/[id] - Obtener membresía por ID
 * PUT /api/memberships/[id] - Actualizar membresía
 * DELETE /api/memberships/[id] - Cancelar membresía
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { MembershipService, UpdateMembershipSchema } from '../../../../lib/services/membership.service';
import { withAuthMiddleware, withAdminMiddleware, ApiResponse } from '@/lib/middleware';

const membershipService = new MembershipService();

/**
 * GET /api/memberships/[id]
 * Obtener membresía por ID
 * Los usuarios pueden ver sus propias membresías, STAFF/ADMIN pueden ver cualquier membresía
 */
export async function GET(req: NextRequest) {
  return withAuthMiddleware(async (request: NextRequest) => {
    try {
      const pathname = request.nextUrl.pathname;
      const membershipId = pathname.split('/').pop() as string;
      const user = (request as any).user;
      
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
  })(req);
}

/**
 * PUT /api/memberships/[id]
 * Actualizar membresía
 * Solo ADMIN puede actualizar membresías
 */
export async function PUT(req: NextRequest) {
  return withAdminMiddleware(async (request: NextRequest) => {
    try {
      const pathname = request.nextUrl.pathname;
      const membershipId = pathname.split('/').pop() as string;
      const body = await request.json();
      
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
  })(req);
}

/**
 * DELETE /api/memberships/[id]
 * Cancelar membresía (suspender)
 * Los usuarios pueden cancelar sus propias membresías, ADMIN puede cancelar cualquier membresía
 */
export async function DELETE(req: NextRequest) {
  return withAuthMiddleware(async (request: NextRequest) => {
    try {
      const pathname = request.nextUrl.pathname;
      const membershipId = pathname.split('/').pop() as string;
      const user = (request as any).user;
      
      // Obtener la membresía para verificar permisos
      const membership = await membershipService.getMembershipById(membershipId);
      
      // Verificar permisos: usuarios solo pueden cancelar sus propias membresías
      if (user.role === 'USER' && membership.userId !== user.id) {
        return ApiResponse.forbidden('Solo puedes cancelar tus propias membresías');
      }
      
      const { searchParams } = request.nextUrl;
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
  })(req);
}

/**
 * OPTIONS /api/memberships/[id]
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}