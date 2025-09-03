/**
 * API Routes para tipos de membresía
 * GET /api/memberships/types - Obtener tipos de membresía disponibles
 */

import { NextRequest } from 'next/server';
import { MembershipService } from '../../../../lib/services/membership.service';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';

const membershipService = new MembershipService();

/**
 * GET /api/memberships/types
 * Obtener tipos de membresía disponibles
 * Ruta pública
 */
export async function GET(req: NextRequest) {
  return withPublicMiddleware(async () => {
  try {
    const types = await membershipService.getMembershipTypes();
    
    return ApiResponse.success(types);
  } catch (error) {
    console.error('Error obteniendo tipos de membresía:', error);
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
  })(req);
}

/**
 * OPTIONS /api/memberships/types
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
