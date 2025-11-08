import { NextRequest } from 'next/server';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { TariffEnrollmentService } from '@/lib/services/tariff-enrollment.service';

export const runtime = 'nodejs';

const enrollmentService = new TariffEnrollmentService();

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  return withAuthMiddleware(async (request) => {
    try {
      const user = (request as any).user;
      if (!user?.id) {
        return ApiResponse.unauthorized('Usuario no autenticado');
      }

      const enrollments = await enrollmentService.getUserEnrollments(user.id);
      return ApiResponse.success(enrollments);
    } catch (error) {
      console.error('Error obteniendo solicitudes de tarifa del usuario:', error);
      return ApiResponse.error(
        error instanceof Error ? error.message : 'Error interno del servidor',
        500
      );
    }
  })(req);
}

