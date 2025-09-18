/**
 * API Routes para gestión administrativa de membresías específicas
 * GET /api/admin/memberships/[id] - Obtener membresía específica
 * PUT /api/admin/memberships/[id] - Actualizar membresía específica
 * DELETE /api/admin/memberships/[id] - Eliminar membresía específica
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { MembershipService } from '../../../../../lib/services/membership.service';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';

const membershipService = new MembershipService();

/**
 * GET /api/admin/memberships/[id]
 * Obtener membresía específica por ID
 */
export async function GET(req: NextRequest) {
  return withAdminMiddleware(async () => {
    try {
      const id = req.nextUrl.pathname.split('/').pop() as string;
      if (!id) return ApiResponse.badRequest('ID requerido');

      // Intentar obtener como plan de membresía primero
      try {
        const plan = await membershipService.getMembershipPlanById(id);
        if (plan) {
          return ApiResponse.success(plan);
        }
      } catch (planError) {
        // Si no es un plan, intentar como membresía de usuario
      }

      // Intentar obtener como membresía de usuario
      const membership = await membershipService.getMembershipById(id);
      if (!membership) {
        return ApiResponse.notFound('Membresía no encontrado');
      }

      return ApiResponse.success(membership);

    } catch (error) {
      console.error('Error obteniendo membresía admin:', error);
      return ApiResponse.error(
        error instanceof Error ? error.message : 'Error interno del servidor',
        500
      );
    }
  })(req);
}

/**
 * PUT /api/admin/memberships/[id]
 * Actualizar membresía específica por ID
 */
export async function PUT(req: NextRequest) {
  return withAdminMiddleware(async () => {
    try {
      const id = req.nextUrl.pathname.split('/').pop() as string;
      if (!id) return ApiResponse.badRequest('ID requerido');

      const body = await req.json();

      // Determinar si es actualización de plan o membresía basado en los campos
      if (body.name && body.price !== undefined) {
        // Es actualización de plan de membresía
        const updatedPlan = await membershipService.updateMembershipPlan(id, body);
        return ApiResponse.success(updatedPlan);
      } else {
        // Es actualización de membresía de usuario
        const updatedMembership = await membershipService.updateMembership(id, body);
        return ApiResponse.success(updatedMembership);
      }

    } catch (error) {
      console.error('Error actualizando membresía admin:', error);
      
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
          return ApiResponse.notFound('Membresía no encontrado');
        }
        if (error.message.includes('Ya existe un plan con ese nombre')) {
          return ApiResponse.error(error.message, 409);
        }
      }
      
      return ApiResponse.error(
        error instanceof Error ? error.message : 'Error interno del servidor',
        500
      );
    }
  })(req);
}

/**
 * DELETE /api/admin/memberships/[id]
 * Eliminar membresía específica por ID
 */
export async function DELETE(req: NextRequest) {
  return withAdminMiddleware(async () => {
    try {
      const id = req.nextUrl.pathname.split('/').pop() as string;
      if (!id) return ApiResponse.badRequest('ID requerido');

      // Intentar eliminar como plan de membresía primero
      try {
        await membershipService.deleteMembershipPlan(id);
        return ApiResponse.success({ id, deleted: true });
      } catch (planError) {
        // Si no es un plan, intentar como membresía de usuario
      }

      // Intentar eliminar como membresía de usuario
      await membershipService.deleteMembership(id);
      return ApiResponse.success({ id, deleted: true });

    } catch (error) {
      console.error('Error eliminando membresía admin:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('no encontrado')) {
          return ApiResponse.notFound('Membresía no encontrado');
        }
        if (error.message.includes('tiene suscriptores activos')) {
          return ApiResponse.error(error.message, 409);
        }
      }
      
      return ApiResponse.error(
        error instanceof Error ? error.message : 'Error interno del servidor',
        500
      );
    }
  })(req);
}

/**
 * OPTIONS /api/admin/memberships/[id]
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

