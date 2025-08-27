import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener post público por slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const post = await prisma.post.findUnique({
      where: { 
        slug,
        status: 'PUBLISHED',
        publishedAt: {
          lte: new Date()
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true
          }
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
                icon: true
              }
            }
          }
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true
              }
            }
          }
        },
        comments: {
          where: {
            status: 'APPROVED',
            parentId: null // Solo comentarios principales
          },
          include: {
            replies: {
              where: {
                status: 'APPROVED'
              },
              orderBy: {
                createdAt: 'asc'
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            comments: {
              where: {
                status: 'APPROVED'
              }
            }
          }
        }
      }
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post no encontrado' },
        { status: 404 }
      );
    }

    // Incrementar el contador de vistas
    await prisma.post.update({
      where: { id: post.id },
      data: {
        viewCount: {
          increment: 1
        }
      }
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error al obtener post público:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
