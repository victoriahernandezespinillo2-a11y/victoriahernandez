import { NextRequest } from 'next/server';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { NotificationService } from '@/lib/services/notification.service';

const notificationService = new NotificationService();

export async function POST(request: NextRequest) {
  return withAuthMiddleware(async (_req, context) => {
    try {
      const user = (context as any)?.user;
      if (!user?.id) return ApiResponse.unauthorized('No autorizado');
      const result = await notificationService.markAllAsRead(user.id);
      return ApiResponse.success(result);
    } catch (error) {
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}





