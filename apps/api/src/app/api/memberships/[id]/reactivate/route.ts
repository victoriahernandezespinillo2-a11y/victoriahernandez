/**
 * API Routes para reactivación de membresías
 * POST /api/memberships/[id]/reactivate - Reactivar membresía suspendida
 */

import { NextRequest } from 'next/server';
import { MembershipService } from '../../../../../lib/services/membership.service';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';

const membershipService = new MembershipService();

/**
 * POST /api/memberships/[id]/reactivate
 * Reactivar membresía suspendida
 * Solo ADMIN puede reactivar membresías
 */
export async function POST(req: NextRequest) {
  return withAdminMiddleware(async (request: NextRequest) => {
    try {
      const pathname = request.nextUrl.pathname;
      const membershipId = pathname.split('/').slice(-2, -1)[0] as string;
      
      const reactivatedMembership = await membershipService.reactivateMembership(membershipId);
      
      return ApiResponse.success(reactivatedMembership);
    } catch (error) {
      console.error('Error reactivando membresía:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Membresía no encontrada') {
          return ApiResponse.notFound('Membresía');
        }
        if (error.message.includes('expirada')) {
          return ApiResponse.error(error.message, 409);
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
 * OPTIONS /api/memberships/[id]/reactivate
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}