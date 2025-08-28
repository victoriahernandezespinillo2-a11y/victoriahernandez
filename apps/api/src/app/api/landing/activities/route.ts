import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const orderBy = searchParams.get('orderBy') || 'order';
    const orderDirection = searchParams.get('orderDirection') || 'asc';

    // Construir opciones de consulta
    const options: any = {
      where: {
        isActive: true,
      },
      orderBy: {
        [orderBy]: orderDirection,
      },
    };

    // Aplicar límite si se especifica
    if (limit) {
      options.take = parseInt(limit);
    }

    // Obtener actividades activas
    const activities = await prisma.landingActivity.findMany(options);

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


