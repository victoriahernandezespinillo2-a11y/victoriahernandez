/**
 * Endpoint legacy /api/auth
 * Se mantiene only para compatibilidad pero se marca como obsoleto.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Este endpoint ha sido reemplazado por /api/auth/signup. Actualiza el cliente.',
    },
    { status: 410 }
  );
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 204 });
}
