import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { TariffEnrollmentService } from '@/lib/services/tariff-enrollment.service';

export const runtime = 'nodejs';

const enrollmentService = new TariffEnrollmentService();

const idSchema = z.string().uuid().or(z.string().cuid());

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

/**
 * DELETE /api/admin/tariffs/enrollments/[id]
 * Eliminar una inscripción de tarifa
 * Acceso: Solo administradores
 */
export async function DELETE(req: NextRequest) {
  return withAdminMiddleware(async (request) => {
    try {
      const user = (request as any).user;
      const segments = request.nextUrl.pathname.split('/');
      const enrollmentId = segments[segments.length - 1] as string;

      // Validar que el ID es válido
      const validatedId = idSchema.parse(enrollmentId);

      // Verificar que la inscripción existe antes de intentar eliminarla
      const { db } = await import('@repo/db');
      const enrollment = await db.tariffEnrollment.findUnique({
        where: { id: validatedId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!enrollment) {
        return ApiResponse.notFound('Solicitud de tarifa no encontrada');
      }

      // Verificar si la inscripción está aprobada y tiene reservas futuras asociadas
      // Si está aprobada, podría estar siendo usada en reservas futuras
      if (enrollment.status === 'APPROVED') {
        const now = new Date();
        const futureReservations = await db.reservation.count({
          where: {
            userId: enrollment.userId,
            startTime: {
              gte: now, // Solo reservas futuras
            },
            status: {
              in: ['PENDING', 'PAID', 'IN_PROGRESS'] as any,
            },
          },
        });

        if (futureReservations > 0) {
          // No permitir eliminar si hay reservas futuras que podrían estar usando esta tarifa
          return ApiResponse.badRequest(
            `No se puede eliminar esta solicitud porque el usuario tiene ${futureReservations} reserva(s) futura(s) activa(s). Primero cancela o completa las reservas.`
          );
        }

        console.log(
          `[DELETE_ENROLLMENT] Eliminando inscripción aprobada ${validatedId} para usuario ${enrollment.userId}.`
        );
      }

      // Eliminar la inscripción usando el servicio
      await enrollmentService.deleteEnrollment({
        enrollmentId: validatedId,
        adminId: user.id,
      });

      return ApiResponse.success({
        message: 'Solicitud de tarifa eliminada correctamente',
        enrollmentId: validatedId,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }

      if (error instanceof Error) {
        // Mensajes de error específicos
        if (error.message.includes('no encontrada') || error.message.includes('no encontrado')) {
          return ApiResponse.notFound(error.message);
        }
        if (error.message.includes('en uso') || error.message.includes('referencias')) {
          return ApiResponse.badRequest(
            'No se puede eliminar la solicitud porque está siendo utilizada en reservas activas'
          );
        }
      }

      console.error('[DELETE_ENROLLMENT] Error eliminando inscripción:', error);
      return ApiResponse.error(
        error instanceof Error ? error.message : 'Error interno del servidor al eliminar la solicitud',
        500
      );
    }
  })(req);
}

