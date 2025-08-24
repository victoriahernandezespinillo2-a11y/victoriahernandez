/**
 * API Routes para estadísticas de membresías
 * GET /api/memberships/stats - Obtener estadísticas de membresías
 */

import { NextRequest } from 'next/server';
import { MembershipService } from '../../../../lib/services/membership.service';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';

const membershipService = new MembershipService();

/**
 * GET /api/memberships/stats
 * Obtener estadísticas de membresías
 * Requiere rol STAFF o superior
 */
export async function GET(req: NextRequest) {
  return withStaffMiddleware(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const centerId = searchParams.get('centerId') || undefined;
    
    const stats = await membershipService.getMembershipStats(centerId);
    
    return ApiResponse.success(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas de membresías:', error);
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
  })(req);
}

/**
 * OPTIONS /api/memberships/stats
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