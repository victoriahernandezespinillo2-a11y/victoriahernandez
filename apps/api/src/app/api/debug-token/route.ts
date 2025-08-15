import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG TOKEN ENDPOINT ===');
    
    // Obtener cookies de la petición
    const cookieHeader = request.headers.get('cookie');
    console.log('🍪 Cookie header completo:', cookieHeader);
    
    // Parsear cookies manualmente
    const cookieStore = await cookies();
    console.log('🍪 Cookie store disponible');
    
    // Buscar específicamente el token de NextAuth
    let sessionToken = null;
    const cookieNames = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.session-token.0',
      'next-auth.session-token.1'
    ];
    
    for (const cookieName of cookieNames) {
      const cookie = await cookieStore.get(cookieName);
      if (cookie) {
        sessionToken = cookie.value;
        console.log(`✅ Token encontrado en cookie '${cookieName}':`, sessionToken?.substring(0, 50) + '...');
        console.log(`📏 Longitud del token:`, sessionToken?.length);
        console.log(`🔍 Primeros 100 caracteres:`, sessionToken?.substring(0, 100));
        break;
      }
    }
    
    if (!sessionToken) {
      console.log('❌ No se encontró token de sesión');
    }
    
    return NextResponse.json({
      success: true,
      cookieHeader,
      sessionToken: sessionToken ? {
        found: true,
        length: sessionToken.length,
        preview: sessionToken.substring(0, 100),
        isValidJWT: sessionToken.split('.').length === 3
      } : { found: false }
    });
    
  } catch (error) {
    console.error('Error en debug-token:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}