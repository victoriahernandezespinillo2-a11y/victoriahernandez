import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';

import { z } from 'zod';

// Schema de validación para crear/actualizar post
const PostSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200),
  slug: z.string().min(1, 'El slug es requerido').max(200).regex(/^[a-z0-9-]+$/, 'El slug debe contener solo letras minúsculas, números y guiones'),
  excerpt: z.string().optional(),
  content: z.string().min(1, 'El contenido es requerido'),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  type: z.enum(['NEWS', 'EVENT', 'TIP', 'RESULT', 'ANNOUNCEMENT']).default('NEWS'),
  publishedAt: z.string().datetime().optional(),
  isFeatured: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  seoKeywords: z.array(z.string()).default([]),
  seoDescription: z.string().optional(),
  featuredImage: z.string().url().optional(),
  categoryIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([])
});

// GET - Obtener todos los posts con filtros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const categoryId = searchParams.get('categoryId');
    const tagId = searchParams.get('tagId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};
    
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filtros de categoría y tag
    if (categoryId) {
      where.categories = {
        some: {
          categoryId: categoryId
        }
      };
    }

    if (tagId) {
      where.tags = {
        some: {
          tagId: tagId
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
              name: true,
              email: true
            }
          },
          categories: {
            include: {
              category: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          _count: {
            select: {
              comments: true
            }
          }
        },
        orderBy: [
          { isFeatured: 'desc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' }
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
    console.error('Error al obtener posts:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = PostSchema.parse(body);

    // Verificar si el slug ya existe
    const existingPost = await prisma.post.findUnique({
      where: { slug: validatedData.slug }
    });

    if (existingPost) {
      return NextResponse.json(
        { error: 'Ya existe un post con este slug' },
        { status: 400 }
      );
    }

    // Verificar que las categorías y tags existan
    if (validatedData.categoryIds.length > 0) {
      const categories = await prisma.category.findMany({
        where: { id: { in: validatedData.categoryIds } }
      });
      if (categories.length !== validatedData.categoryIds.length) {
        return NextResponse.json(
          { error: 'Una o más categorías no existen' },
          { status: 400 }
        );
      }
    }

    if (validatedData.tagIds.length > 0) {
      const tags = await prisma.tag.findMany({
        where: { id: { in: validatedData.tagIds } }
      });
      if (tags.length !== validatedData.tagIds.length) {
        return NextResponse.json(
          { error: 'Uno o más tags no existen' },
          { status: 400 }
        );
      }
    }

    // Preparar datos del post
    const { categoryIds, tagIds, publishedAt, ...postData } = validatedData;
    
    // Preparar datos para Prisma
    const prismaData = {
      ...postData,
      ...(publishedAt && { publishedAt: new Date(publishedAt) })
    };

    const post = await prisma.post.create({
      data: {
        ...prismaData,
        authorId: session.user.id,
        categories: {
          create: categoryIds.map(categoryId => ({
            category: { connect: { id: categoryId } }
          }))
        },
        tags: {
          create: tagIds.map(tagId => ({
            tag: { connect: { id: tagId } }
          }))
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        categories: {
          include: {
            category: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear post:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
