import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      
      // Variables de entorno críticas para NextAuth
      auth: {
        AUTH_SECRET: process.env.AUTH_SECRET ? 'set' : 'missing',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'missing',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
        JWT_SECRET: process.env.JWT_SECRET ? 'set' : 'missing',
      },
      
      // URLs y configuración
      urls: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'not set',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
      },
      
      // Firebase
      firebase: {
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'set' : 'missing',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'not set',
      },
      
      // Headers de la request
      headers: {
        host: request.headers.get('host'),
        'user-agent': request.headers.get('user-agent'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
      },
      
      // Cookies
      cookies: Object.fromEntries(
        request.cookies.getAll().map(cookie => [cookie.name, cookie.value.substring(0, 20) + '...'])
      ),
    };
    
    return NextResponse.json({
      success: true,
      data: debugInfo,
      message: 'Debug information retrieved successfully'
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve debug information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}