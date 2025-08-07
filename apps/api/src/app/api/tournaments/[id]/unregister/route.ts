/**
 * API Route para cancelar inscripción en torneos
 * DELETE /api/tournaments/[id]/unregister - Cancelar inscripción en torneo
 */

import { NextRequest } from 'next/server';
import { TournamentService } from '@/lib/services/tournament.service';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';

const tournamentService = new TournamentService();

/**
 * DELETE /api/tournaments/[id]/unregister
 * Cancelar inscripción en torneo
 * Acceso: Usuario autenticado (solo su propia inscripción) / ADMIN (cualquier inscripción)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthMiddleware(async (req, context) => {
    try {
      const { id: tournamentId } = params;
      
      if (!tournamentId) {
        return ApiResponse.badRequest('ID de torneo requerido');
      }
      
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get('userId') || context.user!.id;
      
      // Solo permitir que los usuarios cancelen su propia inscripción (excepto ADMIN)
      if (userId !== context.user!.id && context.user!.role !== 'ADMIN') {
        return ApiResponse.forbidden('Solo puedes cancelar tu propia inscripción');
      }
      
      const result = await tournamentService.cancelRegistration(tournamentId, userId);
      
      return ApiResponse.success(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('no encontrada')) {
          return ApiResponse.notFound('Inscripción no encontrada');
        }
        if (error.message.includes('progreso') || error.message.includes('completado')) {
          return ApiResponse.badRequest(error.message);
        }
      }
      
      console.error('Error cancelando inscripción:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, { params });
}

/**
 * OPTIONS /api/tournaments/[id]/unregister
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}