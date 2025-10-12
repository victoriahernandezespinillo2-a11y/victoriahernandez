import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    console.log('🧪 [TEST-ADMIN] POST request received');
    
    try {
      const body = await req.json();
      console.log('🧪 [TEST-ADMIN] Body:', body);
      
      const adminUser = (req as any).user;
      console.log('🧪 [TEST-ADMIN] Admin user:', adminUser);
      
      return ApiResponse.success({
        message: 'Test admin endpoint working',
        body,
        adminUser,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('🧪 [TEST-ADMIN] Error:', error);
      return ApiResponse.internalError('Test admin failed');
    }
  })(request);
}


