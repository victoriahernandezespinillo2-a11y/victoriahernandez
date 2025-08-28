import { NextRequest } from 'next/server';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  return withAuthMiddleware(async (req: NextRequest, context: any) => {
    try {
      const user = (context as any)?.user;
      
      console.log('🔍 [DEBUG-SESSION] Context completo:', context);
      console.log('🔍 [DEBUG-SESSION] Usuario:', user);
      
      if (!user) {
        return ApiResponse.unauthorized('Usuario no autenticado');
      }
      
      return ApiResponse.success({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          centerId: user.centerId,
        },
        sessionInfo: {
          hasValidSession: !!user.id,
          roleLevel: user.role === 'ADMIN' ? 2 : user.role === 'STAFF' ? 1 : 0,
          canAccessAdmin: user.role === 'ADMIN',
          canAccessStaff: ['ADMIN', 'STAFF'].includes(user.role),
        }
      });
    } catch (error) {
      console.error('Error en debug-session:', error);
      return ApiResponse.internalError('Error verificando sesión');
    }
  })(request);
}






