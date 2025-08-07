/**
 * API Routes para reactivación de membresías
 * POST /api/memberships/[id]/reactivate - Reactivar membresía suspendida
 */

import { NextRequest } from 'next/server';
import { MembershipService } from '../../../../../lib/services/membership.service';
import { withAdminMiddleware, ApiResponse } from '../../../../../lib/middleware';

const membershipService = new MembershipService();

/**
 * POST /api/memberships/[id]/reactivate
 * Reactivar membresía suspendida
 * Solo ADMIN puede reactivar membresías
 */
export const POST = withAdminMiddleware(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const membershipId = params.id;
    
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
});

/**
 * OPTIONS /api/memberships/[id]/reactivate
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}