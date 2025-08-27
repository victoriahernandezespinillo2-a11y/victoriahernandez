/**
 * API Route para estadísticas de torneos
 * GET /api/tournaments/stats - Obtener estadísticas de torneos
 */

import { NextRequest } from 'next/server';
import { TournamentService } from '@/lib/services/tournament.service';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';

const tournamentService = new TournamentService();

/**
 * GET /api/tournaments/stats
 * Obtener estadísticas de torneos
 * Acceso: STAFF o superior
 */
export async function GET(request: NextRequest) {
  return withStaffMiddleware(async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const centerId = searchParams.get('centerId') || undefined;
      
      const stats = await tournamentService.getTournamentStats(centerId);
      
      return ApiResponse.success(stats);
    } catch (error) {
      console.error('Error obteniendo estadísticas de torneos:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, {});
}

/**
 * OPTIONS /api/tournaments/stats
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
