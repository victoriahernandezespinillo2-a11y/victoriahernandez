import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  console.log('🔄 [SIMPLE-DELETE] Endpoint simple DELETE llamado');
  console.log('🔄 [SIMPLE-DELETE] Request URL:', request.url);
  
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    console.log('🔄 [SIMPLE-DELETE] ID extraído:', id);
    
    return NextResponse.json({
      success: true,
      message: 'Test DELETE simple exitoso',
      receivedId: id,
      url: request.url
    });
    
  } catch (error) {
    console.error('❌ [SIMPLE-DELETE] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en test DELETE simple',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}




