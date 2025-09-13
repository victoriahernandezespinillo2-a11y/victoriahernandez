/**
 * API Routes para gestión administrativa de membresías
 * GET /api/admin/memberships - Obtener todas las membresías y planes
 * POST /api/admin/memberships - Crear nueva membresía (admin)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { MembershipService } from '../../../../lib/services/membership.service';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';

const membershipService = new MembershipService();

/**
 * GET /api/admin/memberships
 * Obtener todas las membresías y planes para administradores
 */
export async function GET(req: NextRequest) {
  return withAdminMiddleware(async () => {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const type = searchParams.get('type') || undefined;
      const status = searchParams.get('status') || undefined;

      // Obtener planes de membresía
      const membershipPlans = await membershipService.getMembershipTypes();
      
      // Obtener membresías activas
      const memberships = await membershipService.getMemberships({
        page,
        limit,
        type: type as any,
        status: status as any,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      // Calcular estadísticas
      const stats = {
        totalPlans: membershipPlans.length,
        totalMemberships: memberships.pagination.total,
        activeMemberships: memberships.memberships.filter(m => m.status === 'active').length,
        totalRevenue: memberships.memberships
          .filter(m => m.status === 'active')
          .reduce((sum, m) => sum + (m.price || 0), 0),
        averagePrice: membershipPlans.length > 0 
          ? membershipPlans.reduce((sum, p) => sum + p.monthlyPrice, 0) / membershipPlans.length 
          : 0
      };

      // Mapear planes para el admin
      const adminPlans = membershipPlans.map(plan => ({
        id: plan.id,
        name: plan.name,
        type: plan.type.toLowerCase(),
        price: plan.monthlyPrice,
        duration: 1, // Por defecto 1 mes
        benefits: plan.benefits || [],
        maxReservations: (plan.benefits as any)?.maxReservations || -1,
        discountPercentage: (plan.benefits as any)?.discountPercentage || 0,
        status: 'active', // Los planes están activos
        subscribersCount: memberships.memberships.filter(m => 
          m.planId === plan.id && m.status === 'active'
        ).length,
        createdAt: new Date().toISOString(),
        isPopular: plan.popular || false,
        description: plan.description
      }));

      return ApiResponse.success({
        membershipPlans: adminPlans,
        memberships: memberships.memberships,
        stats,
        pagination: memberships.pagination
      });

    } catch (error) {
      console.error('Error obteniendo membresías admin:', error);
      
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      return ApiResponse.error(
        error instanceof Error ? error.message : 'Error interno del servidor',
        500
      );
    }
  })(req);
}

/**
 * POST /api/admin/memberships
 * Crear nueva membresía (solo administradores)
 */
export async function POST(req: NextRequest) {
  return withAdminMiddleware(async () => {
    try {
      const body = await req.json();
      
      // Determinar si es creación de plan o membresía basado en los campos
      if (body.type && body.benefits && body.price !== undefined) {
        // Es creación de plan de membresía
        const membershipPlan = await membershipService.createMembershipPlan(body);
        return ApiResponse.success(membershipPlan, 201);
      } else {
        // Es creación de membresía de usuario
        const membership = await membershipService.createMembership(body);
        return ApiResponse.success(membership, 201);
      }
    } catch (error) {
      console.error('Error creando membresía/plan admin:', error);
      
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      if (error instanceof Error) {
        if (error.message.includes('Usuario no encontrado')) {
          return ApiResponse.notFound('Usuario');
        }
        if (error.message.includes('ya tiene una membresía activa')) {
          return ApiResponse.error(error.message, 409);
        }
        if (error.message.includes('Ya existe un plan con ese nombre')) {
          return ApiResponse.error(error.message, 409);
        }
        if (error.message.includes('Error al procesar el pago')) {
          return ApiResponse.error(error.message, 402);
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
 * OPTIONS /api/admin/memberships
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
