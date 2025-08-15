import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG SESSION ENDPOINT ===');
    
    // Obtener cookies de la petición del usuario
    const cookies = request.headers.get('cookie');
    console.log('🍪 Cookies del usuario:', cookies);
    
    if (!cookies) {
      return NextResponse.json({ 
        error: 'No hay cookies en la petición',
        message: 'El usuario no está autenticado o no hay sesión activa'
      }, { status: 400 });
    }
    
    // Hacer petición al endpoint de debug del API con las cookies del usuario
    console.log('📡 Enviando cookies al API debug endpoint...');
    const apiResponse = await fetch('http://localhost:3002/api/debug-token', {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Origin': 'http://localhost:3001',
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    console.log('📊 Respuesta del API:', apiResponse.status, apiResponse.statusText);
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log('✅ Datos de debug recibidos:', data);
      return NextResponse.json({ 
        message: 'Debug exitoso', 
        status: apiResponse.status,
        debugData: data,
        originalCookies: cookies
      });
    } else {
      const errorText = await apiResponse.text();
      console.log('❌ Error del API:', errorText);
      return NextResponse.json({ 
        message: 'Error en debug', 
        status: apiResponse.status,
        error: errorText,
        originalCookies: cookies
      }, { status: apiResponse.status });
    }
  } catch (error) {
    console.error('💥 Error en debug-session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Error en debug-session', details: errorMessage }, { status: 500 });
  }
}