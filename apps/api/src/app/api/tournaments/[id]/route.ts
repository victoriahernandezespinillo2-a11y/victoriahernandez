/**
 * API Routes para torneo específico
 * GET /api/tournaments/[id] - Obtener torneo por ID
 * PUT /api/tournaments/[id] - Actualizar torneo
 * DELETE /api/tournaments/[id] - Cancelar torneo
 */

import { NextRequest } from 'next/server';
import { TournamentService, UpdateTournamentSchema } from '@/lib/services/tournament.service';
import { withPublicMiddleware, withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const tournamentService = new TournamentService();

/**
 * GET /api/tournaments/[id]
 * Obtener torneo por ID
 * Acceso: Público (solo torneos públicos) / STAFF+ (todos)
 */
export async function GET(
  request: NextRequest
) {
  return withPublicMiddleware(async (req, context: any) => {
    try {
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').pop() as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de torneo requerido');
      }
      
      const tournament = await tournamentService.getTournamentById(id);
      
      // Si no hay usuario autenticado y el torneo no es público, denegar acceso
      if (!(context as any)?.user && !tournament.isPublic) {
        return ApiResponse.notFound('Torneo no encontrado');
      }
      
      return ApiResponse.success(tournament);
    } catch (error) {
      if (error instanceof Error && error.message.includes('no encontrado')) {
        return ApiResponse.notFound('Torneo no encontrado');
      }
      
      console.error('Error obteniendo torneo:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * PUT /api/tournaments/[id]
 * Actualizar torneo
 * Acceso: ADMIN
 */
export async function PUT(
  request: NextRequest
) {
  return withAdminMiddleware(async (req, context: any) => {
    try {
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').pop() as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de torneo requerido');
      }
      
      const body = await req.json();
      
      // Validar datos de entrada
      const validatedData = UpdateTournamentSchema.parse(body);
      
      const tournament = await tournamentService.updateTournament(id, validatedData);
      
      return ApiResponse.success(tournament);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      if (error instanceof Error) {
        if (error.message.includes('no encontrado')) {
          return ApiResponse.notFound('Torneo');
        }
        if (error.message.includes('progreso') || error.message.includes('completado')) {
          return ApiResponse.badRequest(error.message);
        }
        if (error.message.includes('fecha')) {
          return ApiResponse.badRequest(error.message);
        }
        if (error.message.includes('conflicto') || error.message.includes('ya existe')) {
          return ApiResponse.error(error.message, 409);
        }
      }
      
      console.error('Error actualizando torneo:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * DELETE /api/tournaments/[id]
 * Cancelar torneo
 * Acceso: ADMIN
 */
export async function DELETE(
  request: NextRequest
) {
  return withAdminMiddleware(async (req, context: any) => {
    try {
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').pop() as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de torneo requerido');
      }
      
      const tournament = await tournamentService.deleteTournament(id);
      
      return ApiResponse.success(tournament);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('no encontrado')) {
          return ApiResponse.notFound('Torneo');
        }
        if (error.message.includes('progreso') || error.message.includes('completado')) {
          return ApiResponse.badRequest(error.message);
        }
        if (error.message.includes('participantes')) {
          return ApiResponse.badRequest(error.message);
        }
      }
      
      console.error('Error cancelando torneo:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/tournaments/[id]
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}