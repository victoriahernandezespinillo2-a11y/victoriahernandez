/**
 * API Routes para tipos de membresía
 * GET /api/memberships/types - Obtener tipos de membresía disponibles
 */

import { NextRequest } from 'next/server';
import { MembershipService } from '../../../../lib/services/membership.service';
import { withPublicMiddleware, ApiResponse } from '../../../../lib/middleware';

const membershipService = new MembershipService();

/**
 * GET /api/memberships/types
 * Obtener tipos de membresía disponibles
 * Ruta pública
 */
export const GET = withPublicMiddleware(async (req: NextRequest) => {
  try {
    const types = membershipService.getMembershipTypes();
    
    return ApiResponse.success(types);
  } catch (error) {
    console.error('Error obteniendo tipos de membresía:', error);
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
});

/**
 * OPTIONS /api/memberships/types
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}