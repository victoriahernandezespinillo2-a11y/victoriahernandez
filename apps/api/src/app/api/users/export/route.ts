/**
 * GET /api/users/export
 * Exportación completa de datos del usuario autenticado (GDPR)
 */

import { NextRequest } from 'next/server';
import { withAuthMiddleware, ApiResponse } from '../../../../lib/middleware';
import { db } from '@repo/db';

export async function GET(req: NextRequest) {
  return withAuthMiddleware(async (_request: NextRequest, context: any) => {
    try {
      const { user } = (context as any);

      // Cargar datos relacionados del usuario
      const me = await db.user.findUnique({
        where: { id: user.id },
        include: {
          memberships: true,
          reservations: true,
          tournamentUsers: true,
          waitingLists: true,
          // No incluimos tokens sensibles
        },
      });

      if (!me) {
        return ApiResponse.notFound('Usuario');
      }

      // Cargar métodos de pago (solo metadatos)
      const paymentMethods = await db.paymentMethod.findMany({ where: { userId: user.id } });

      const exportPayload = {
        generatedAt: new Date().toISOString(),
        user: me,
        paymentMethods,
      };

      return ApiResponse.success(exportPayload, 200);
    } catch (error) {
      console.error('Error exportando datos de usuario:', error);
      return ApiResponse.internalError('No se pudo exportar la información');
    }
  })(req);
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}


