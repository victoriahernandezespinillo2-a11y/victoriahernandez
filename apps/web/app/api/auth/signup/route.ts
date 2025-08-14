/**
 * API Route Proxy para registro de usuarios
 * Redirige las peticiones al backend API
 */

import { NextRequest, NextResponse } from 'next/server';

// Usar la misma variable pública que el resto de la app y caer a API_BASE_URL para compat
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:3002').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Hacer la petición al backend API (endpoint correcto /api/auth/signup)
    const response = await fetch(`${API_BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Intentar parsear JSON; si falla, devolver texto/plain
    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      const text = await response.text().catch(() => '');
      payload = text ? { success: false, error: text } : null;
    }

    // Retornar la respuesta del backend con el mismo status
    return NextResponse.json(payload ?? { success: response.ok }, { status: response.status });
    
  } catch (error) {
    console.error('Error en proxy de signup:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error de conexión con el servidor' 
      }, 
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}