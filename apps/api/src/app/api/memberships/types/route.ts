/**
 * API Routes para tipos de membresía
 * GET /api/memberships/types - Obtener tipos de membresía disponibles
 */

import { NextRequest } from 'next/server';
import { MembershipService } from '../../../../lib/services/membership.service';
import { withPublicMiddleware, withAuthMiddleware, ApiResponse } from '@/lib/middleware';

const membershipService = new MembershipService();

/**
 * GET /api/memberships/types
 * Obtener tipos de membresía disponibles
 * Ruta pública - usuarios autenticados ven todos los planes, no autenticados solo activos
 */
export async function GET(req: NextRequest) {
  // Verificar si hay sesión de usuario
  const hasAuth = req.headers.get('authorization') || req.cookies.get('next-auth.session-token');
  
  if (hasAuth) {
    // Usuario autenticado - mostrar todos los planes (activos e inactivos)
    return withAuthMiddleware(async () => {
      try {
        const types = await membershipService.getAllMembershipPlans();
        
        return ApiResponse.success(types);
      } catch (error) {
        console.error('Error obteniendo tipos de membresía:', error);
        
        return ApiResponse.error(
          error instanceof Error ? error.message : 'Error interno del servidor',
          500
        );
      }
    })(req);
  } else {
    // Usuario no autenticado - mostrar solo planes activos
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
}

/**
 * OPTIONS /api/memberships/types
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
