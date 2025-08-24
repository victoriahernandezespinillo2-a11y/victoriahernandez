import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [TEST-SIMPLE] Endpoint simple funcionando');
    return NextResponse.json({ 
      success: true, 
      message: 'Endpoint simple funcionando',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [TEST-SIMPLE] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno' 
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({ success: true });
}

