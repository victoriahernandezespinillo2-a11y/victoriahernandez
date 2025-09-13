/**
 * DELETE /api/users/delete
 * EliminaciÃ³n (soft delete) de la cuenta del usuario autenticado (GDPR)
 */

import { NextRequest } from 'next/server';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { UserService } from '../../../../lib/services/user.service';

const userService = new UserService();

export async function DELETE(req: NextRequest) {
  return withAuthMiddleware(async (_request: NextRequest) => {
    try {
      const { user } = (req as any);
      const result = await userService.deleteUser(user.id);
      return ApiResponse.success(result, 200);
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('reservas activas')) {
        return ApiResponse.conflict(error.message);
      }
      console.error('Error eliminando usuario:', error);
      return ApiResponse.internalError('No se pudo eliminar la cuenta');
    }
  })(req);
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}































