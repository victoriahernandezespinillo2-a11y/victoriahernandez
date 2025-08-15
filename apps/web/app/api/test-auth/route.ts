import { NextRequest, NextResponse } from 'next/server';

// Configurar para usar Node.js Runtime en lugar de Edge Runtime
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('=== TEST AUTH ENDPOINT LLAMADO ===');
  try {
    // Obtener cookies de la petición
    const cookies = request.headers.get('cookie');
    console.log('🍪 Cookies en la petición:', cookies);
    
    if (!cookies) {
      return NextResponse.json({ 
        error: 'No hay cookies en la petición',
        message: 'Para probar la autenticación, necesitas estar logueado en la aplicación web'
      }, { status: 400 });
    }
    
    // Hacer petición al puerto 3002 con las cookies (endpoint que requiere autenticación)
    console.log('📡 Haciendo petición autenticada a puerto 3002...');
    const apiResponse = await fetch('http://localhost:3002/api/users/profile', {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Origin': 'http://localhost:3001',
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    console.log('📊 Respuesta de API:', apiResponse.status, apiResponse.statusText);
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log('✅ Datos recibidos:', data);
      return NextResponse.json({ 
        message: 'Petición autenticada exitosa al puerto 3002', 
        status: apiResponse.status,
        data,
        cookies: cookies ? 'Presentes' : 'Ausentes'
      });
    } else {
      const errorText = await apiResponse.text();
      console.log('❌ Error de API:', errorText);
      return NextResponse.json({ 
        message: 'Error en petición autenticada al puerto 3002', 
        status: apiResponse.status,
        error: errorText,
        cookies: cookies ? 'Presentes' : 'Ausentes'
      }, { status: apiResponse.status });
    }
  } catch (error) {
    console.error('💥 Error en test auth endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Error en test auth', details: errorMessage }, { status: 500 });
  }
}