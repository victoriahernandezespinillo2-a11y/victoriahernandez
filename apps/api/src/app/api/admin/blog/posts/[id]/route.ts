import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';
import { z } from 'zod';

// Schema de validación para actualizar post
const UpdatePostSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200).optional(),
  slug: z.string().min(1, 'El slug es requerido').max(200).regex(/^[a-z0-9-]+$/, 'El slug debe contener solo letras minúsculas, números y guiones').optional(),
  excerpt: z.string().optional(),
  content: z.string().min(1, 'El contenido es requerido').optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).optional(),
  type: z.enum(['NEWS', 'EVENT', 'TIP', 'RESULT', 'ANNOUNCEMENT']).optional(),
  publishedAt: z.string().datetime().optional(),
  isFeatured: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  seoKeywords: z.array(z.string()).optional(),
  seoDescription: z.string().optional(),
  featuredImage: z.string().url().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional()
});

// GET - Obtener post por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const post = await prisma.post.findUnique({
      where: { id },
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
        comments: {
          include: {
            replies: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            comments: true
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

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error al obtener post:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = UpdatePostSchema.parse(body);

    // Verificar si el post existe
    const existingPost = await prisma.post.findUnique({
      where: { id }
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post no encontrado' },
        { status: 404 }
      );
    }

    // Si se está actualizando el slug, verificar que no exista otro con el mismo slug
    if (validatedData.slug && validatedData.slug !== existingPost.slug) {
      const slugExists = await prisma.post.findUnique({
        where: { slug: validatedData.slug }
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'Ya existe un post con este slug' },
          { status: 400 }
        );
      }
    }

    // Verificar que las categorías y tags existan si se están actualizando
    if (validatedData.categoryIds && validatedData.categoryIds.length > 0) {
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

    if (validatedData.tagIds && validatedData.tagIds.length > 0) {
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

    // Actualizar el post y sus relaciones
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        ...prismaData,
        // Actualizar categorías si se proporcionan
        ...(categoryIds && {
          categories: {
            deleteMany: {},
            create: categoryIds.map(categoryId => ({
              category: { connect: { id: categoryId } }
            }))
          }
        }),
        // Actualizar tags si se proporcionan
        ...(tagIds && {
          tags: {
            deleteMany: {},
            create: tagIds.map(tagId => ({
              tag: { connect: { id: tagId } }
            }))
          }
        })
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

    return NextResponse.json(updatedPost);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al actualizar post:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si el post existe
    const existingPost = await prisma.post.findUnique({
      where: { id }
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar el post (las relaciones se eliminan automáticamente por CASCADE)
    await prisma.post.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Post eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar post:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
