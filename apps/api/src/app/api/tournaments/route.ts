/**
 * API Routes para gestión de torneos
 * GET /api/tournaments - Obtener lista de torneos
 * POST /api/tournaments - Crear nuevo torneo
 */

import { NextRequest } from 'next/server';
import { TournamentService, GetTournamentsSchema, CreateTournamentSchema } from '@/lib/services/tournament.service';
import { withPublicMiddleware, withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const tournamentService = new TournamentService();

/**
 * OPTIONS /api/tournaments
 * Responder preflight CORS
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

/**
 * GET /api/tournaments
 * Obtener lista de torneos
 * Acceso: Público (solo torneos públicos) / STAFF+ (todos)
 */
export async function GET(request: NextRequest) {
  return withPublicMiddleware(async (req, context: any) => {
    try {
      const { searchParams } = new URL(req.url);
      const rawParams = Object.fromEntries(searchParams.entries());
      
      // Si no hay usuario autenticado, solo mostrar torneos públicos
      if (!(context as any)?.user) {
        rawParams.isPublic = 'true';
      }
      
      // Validar y convertir parámetros usando el schema
      const params = GetTournamentsSchema.parse(rawParams);
      
      const result = await tournamentService.getTournaments(params);
      
      return ApiResponse.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo torneos:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * POST /api/tournaments
 * Crear nuevo torneo
 * Acceso: ADMIN
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req, context: any) => {
    try {
      const body = await req.json();
      
      // Validar datos de entrada
      const validatedData = CreateTournamentSchema.parse(body);
      
      const tournament = await tournamentService.createTournament(validatedData);
      
      return ApiResponse.success(tournament, 201);
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
          return ApiResponse.notFound('Centro deportivo');
        }
        if (error.message.includes('fecha')) {
          return ApiResponse.badRequest(error.message);
        }
        if (error.message.includes('conflicto') || error.message.includes('ya existe')) {
          return ApiResponse.error(error.message, 409);
        }
      }
      
      console.error('Error creando torneo:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/tournaments
 * Manejar preflight requests
 */
// Eliminado segundo handler OPTIONS duplicado
