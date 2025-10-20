import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🧪 [TEST-NO-MIDDLEWARE] POST request received');
  
  try {
    const body = await request.json();
    console.log('🧪 [TEST-NO-MIDDLEWARE] Body:', body);
    
    // Simular el mismo procesamiento que el endpoint real
    const responseData = {
      success: true,
      message: 'Test endpoint without middleware working',
      body,
      timestamp: new Date().toISOString()
    };
    
    console.log('🧪 [TEST-NO-MIDDLEWARE] Response:', responseData);
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('🧪 [TEST-NO-MIDDLEWARE] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}




