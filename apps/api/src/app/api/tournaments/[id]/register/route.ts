/**
 * API Route para registro en torneos
 * POST /api/tournaments/[id]/register - Registrar participante en torneo
 */

import { NextRequest } from 'next/server';
import { TournamentService, RegisterParticipantSchema } from '@/lib/services/tournament.service';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const tournamentService = new TournamentService();

/**
 * POST /api/tournaments/[id]/register
 * Registrar participante en torneo
 * Acceso: Usuario autenticado
 */
export async function POST(
  request: NextRequest
) {
  return withAuthMiddleware(async (req, context: any) => {
    try {
      const user = (context as any).user;
      const pathname = req.nextUrl.pathname;
      const tournamentId = pathname.split('/').slice(-2, -1)[0] as string;
      
      if (!tournamentId) {
        return ApiResponse.badRequest('ID de torneo requerido');
      }
      
      const body = await req.json();
      
      // Si no se especifica userId, usar el del usuario autenticado
      if (!body.userId) {
        body.userId = user.id;
      }
      
      // Solo permitir que los usuarios se registren a sí mismos (excepto ADMIN)
      if (body.userId !== user.id && user.role !== 'ADMIN') {
        return ApiResponse.forbidden('Solo puedes registrarte a ti mismo');
      }
      
      // Validar datos de entrada
      const validatedData = RegisterParticipantSchema.parse(body);
      
      const participant = await tournamentService.registerParticipant(tournamentId, validatedData);
      
      return ApiResponse.success(participant, 201);
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
          return ApiResponse.notFound(error.message);
        }
        if (error.message.includes('inscripciones') || 
            error.message.includes('terminado') ||
            error.message.includes('máximo') ||
            error.message.includes('registrado') ||
            error.message.includes('compañero')) {
          return ApiResponse.badRequest(error.message);
        }
      }
      
      console.error('Error registrando participante:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/tournaments/[id]/register
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}