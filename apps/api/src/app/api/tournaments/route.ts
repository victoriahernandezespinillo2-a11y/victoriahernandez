/**
 * API Routes para gestiÃ³n de torneos
 * GET /api/tournaments - Obtener lista de torneos
 * POST /api/tournaments - Crear nuevo torneo
 */

import { NextRequest } from 'next/server';
import { TournamentService, GetTournamentsSchema, CreateTournamentSchema } from '@/lib/services/tournament.service';
import { withAuthMiddleware, withAdminMiddleware, ApiResponse } from '@/lib/middleware';
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
 * Acceso: PÃºblico (solo torneos pÃºblicos) / STAFF+ (todos)
 */
export async function GET(request: NextRequest) {
  return withAuthMiddleware(async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const rawParams = Object.fromEntries(searchParams.entries());
      
      // Si no hay usuario autenticado, solo mostrar torneos pÃºblicos
      if (!(req as any).user) {
        rawParams.isPublic = 'true';
        // Excluir torneos en estado DRAFT para usuarios no autenticados
        if (!rawParams.status) {
          rawParams.excludeStatus = 'DRAFT';
        }
      } else {
        // Si hay usuario autenticado, verificar si es admin
        const user = (req as any).user;
        if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
          // Usuarios normales no deben ver torneos DRAFT
          if (!rawParams.status) {
            rawParams.excludeStatus = 'DRAFT';
          }
        }
        // Los admins y staff pueden ver todos los torneos sin restricciones
      }
      
      // Validar y convertir parÃ¡metros usando el schema
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
  return withAdminMiddleware(async (req) => {
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
