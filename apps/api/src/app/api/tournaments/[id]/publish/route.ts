/**
 * API Route para publicar torneo
 * POST /api/tournaments/[id]/publish - Publicar torneo (abrir inscripciones)
 */

import { NextRequest } from 'next/server';
import { TournamentService } from '@/lib/services/tournament.service';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';

const tournamentService = new TournamentService();

/**
 * POST /api/tournaments/[id]/publish
 * Publicar torneo (abrir inscripciones)
 * Acceso: ADMIN
 */
export async function POST(
  request: NextRequest
) {
  return withAdminMiddleware(async (req, context: any) => {
    try {
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').slice(-2, -1)[0] as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de torneo requerido');
      }
      
      const tournament = await tournamentService.publishTournament(id);
      
      return ApiResponse.success(tournament);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('no encontrado')) {
          return ApiResponse.notFound('Torneo no encontrado');
        }
        if (error.message.includes('borrador') || error.message.includes('publicar')) {
          return ApiResponse.badRequest(error.message);
        }
      }
      
      console.error('Error publicando torneo:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/tournaments/[id]/publish
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}