/**
 * API Route Proxy para recuperación de contraseña
 * Redirige las peticiones al backend API
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Hacer la petición al backend API
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    // Retornar la respuesta del backend con el mismo status
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Error en proxy de forgot-password:', error);
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