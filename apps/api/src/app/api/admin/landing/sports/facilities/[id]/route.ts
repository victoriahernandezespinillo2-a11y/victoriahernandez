import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Schema de validación para actualizar instalación deportiva
const UpdateSportFacilitySchema = z.object({
  categoryId: z.string().min(1, 'La categoría es requerida').optional(),
  name: z.string().min(1, 'El nombre es requerido').max(200).optional(),
  description: z.string().min(1, 'La descripción es requerida').optional(),
  imageUrl: z.string().url().optional(),
  price: z.string().min(1, 'El precio es requerido').optional(),
  availability: z.string().min(1, 'La disponibilidad es requerida').optional(),
  rating: z.number().min(0).max(5).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional()
});

// GET - Obtener instalación deportiva por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const facility = await prisma.landingSportFacility.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true
          }
        }
      }
    });

    if (!facility) {
      return NextResponse.json(
        { error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(facility);
  } catch (error) {
    console.error('Error al obtener instalación deportiva:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar instalación deportiva
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = UpdateSportFacilitySchema.parse(body);

    // Verificar si la instalación existe
    const existingFacility = await prisma.landingSportFacility.findUnique({
      where: { id }
    });

    if (!existingFacility) {
      return NextResponse.json(
        { error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    // Si se está actualizando la categoría, verificar que existe
    if (validatedData.categoryId) {
      const category = await prisma.landingSportCategory.findUnique({
        where: { id: validatedData.categoryId }
      });

      if (!category) {
        return NextResponse.json(
          { error: 'La categoría especificada no existe' },
          { status: 400 }
        );
      }
    }

    const updatedFacility = await prisma.landingSportFacility.update({
      where: { id },
      data: validatedData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true
          }
        }
      }
    });

    return NextResponse.json(updatedFacility);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al actualizar instalación deportiva:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar instalación deportiva
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si la instalación existe
    const existingFacility = await prisma.landingSportFacility.findUnique({
      where: { id }
    });

    if (!existingFacility) {
      return NextResponse.json(
        { error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    await prisma.landingSportFacility.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Instalación eliminada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar instalación deportiva:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
