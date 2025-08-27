import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';
import { z } from 'zod';

// Schema de validación para actualizar categoría de deporte
const UpdateSportCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100).optional(),
  slug: z.string().min(1, 'El slug es requerido').max(100).regex(/^[a-z0-9-]+$/, 'El slug debe contener solo letras minúsculas, números y guiones').optional(),
  icon: z.string().min(1, 'El icono es requerido').optional(),
  color: z.string().min(1, 'El color es requerido').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional()
});

// GET - Obtener categoría de deporte por ID
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

    const category = await prisma.landingSportCategory.findUnique({
      where: { id },
      include: {
        facilities: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error al obtener categoría de deporte:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar categoría de deporte
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
    const validatedData = UpdateSportCategorySchema.parse(body);

    // Verificar si la categoría existe
    const existingCategory = await prisma.landingSportCategory.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Si se está actualizando el slug, verificar que no exista otro con el mismo slug
    if (validatedData.slug && validatedData.slug !== existingCategory.slug) {
      const slugExists = await prisma.landingSportCategory.findUnique({
        where: { slug: validatedData.slug }
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'Ya existe una categoría con este slug' },
          { status: 400 }
        );
      }
    }

    const updatedCategory = await prisma.landingSportCategory.update({
      where: { id },
      data: validatedData
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al actualizar categoría de deporte:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar categoría de deporte
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

    // Verificar si la categoría existe y tiene instalaciones asociadas
    const existingCategory = await prisma.landingSportCategory.findUnique({
      where: { id },
      include: {
        facilities: true
      }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si hay instalaciones asociadas
    if (existingCategory.facilities.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar la categoría porque tiene instalaciones asociadas' },
        { status: 400 }
      );
    }

    await prisma.landingSportCategory.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Categoría eliminada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar categoría de deporte:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
