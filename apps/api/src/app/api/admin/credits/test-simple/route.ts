import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🧪 [TEST-SIMPLE] GET request received');
  return NextResponse.json({ 
    success: true, 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('🧪 [TEST-SIMPLE] POST request received');
  
  try {
    const body = await request.json();
    console.log('🧪 [TEST-SIMPLE] Body:', body);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test POST endpoint working',
      body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🧪 [TEST-SIMPLE] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Test POST failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}


