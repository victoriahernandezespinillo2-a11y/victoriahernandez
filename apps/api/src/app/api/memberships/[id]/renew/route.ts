/**
 * API Routes para renovación de membresías
 * POST /api/memberships/[id]/renew - Renovar membresía
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { MembershipService, RenewMembershipSchema } from '../../../../../lib/services/membership.service';
import { withAuthMiddleware, ApiResponse, AuthenticatedContext } from '@/lib/middleware';

const membershipService = new MembershipService();

/**
 * POST /api/memberships/[id]/renew
 * Renovar membresía
 * Los usuarios pueden renovar sus propias membresías, ADMIN puede renovar cualquier membresía
 */
export async function POST(req: NextRequest) {
  return withAuthMiddleware(async (request: NextRequest, context) => {
    try {
      const pathname = request.nextUrl.pathname;
      const membershipId = pathname.split('/').slice(-2, -1)[0] as string;
      const { user } = (context as any) || {};
      
      // Obtener la membresía para verificar permisos
      const membership = await membershipService.getMembershipById(membershipId);
      
      // Verificar permisos: usuarios solo pueden renovar sus propias membresías
      if (user.role === 'USER' && membership.userId !== user.id) {
        return ApiResponse.forbidden('Solo puedes renovar tus propias membresías');
      }
      
      const body = await request.json();
      
      const renewedMembership = await membershipService.renewMembership(membershipId, body);
      
      return ApiResponse.success(renewedMembership);
    } catch (error) {
      console.error('Error renovando membresía:', error);
      
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      if (error instanceof Error) {
        if (error.message === 'Membresía no encontrada') {
          return ApiResponse.notFound('Membresía');
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
 * OPTIONS /api/memberships/[id]/renew
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}