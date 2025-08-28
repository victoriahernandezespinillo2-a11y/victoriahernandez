import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todos los tags activos
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      where: {
        isActive: true
      },
      include: {
        _count: {
          select: {
            posts: {
              where: {
                post: {
                  status: 'PUBLISHED',
                  publishedAt: {
                    lte: new Date()
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error al obtener tags públicos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


