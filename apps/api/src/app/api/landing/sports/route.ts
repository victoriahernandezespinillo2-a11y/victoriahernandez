import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todas las instalaciones deportivas activas
export async function GET() {
  try {
    const categories = await prisma.landingSportCategory.findMany({
      where: {
        isActive: true
      },
      include: {
        facilities: {
          where: {
            isActive: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error al obtener instalaciones deportivas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


