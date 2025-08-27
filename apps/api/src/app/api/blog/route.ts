import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener posts públicos con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PUBLISHED';
    const type = searchParams.get('type');
    const categorySlug = searchParams.get('category');
    const tagSlug = searchParams.get('tag');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const featured = searchParams.get('featured') === 'true';

    // Construir filtros
    const where: any = {
      status: status as any,
      publishedAt: {
        lte: new Date()
      }
    };
    
    if (type) where.type = type;
    if (featured) where.isFeatured = true;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filtros de categoría y tag por slug
    if (categorySlug) {
      where.categories = {
        some: {
          category: {
            slug: categorySlug,
            isActive: true
          }
        }
      };
    }

    if (tagSlug) {
      where.tags = {
        some: {
          tag: {
            slug: tagSlug,
            isActive: true
          }
        }
      };
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
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
          _count: {
            select: {
              comments: {
                where: {
                  status: 'APPROVED'
                }
              }
            }
          }
        },
        orderBy: [
          { isFeatured: 'desc' },
          { publishedAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.post.count({ where })
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener posts públicos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
