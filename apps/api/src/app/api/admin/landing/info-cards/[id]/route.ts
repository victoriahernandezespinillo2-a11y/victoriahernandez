import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@repo/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validación para actualizar info card
const updateInfoCardSchema = z.object({
  title: z.string().min(1, 'El título es requerido').optional(),
  description: z.string().min(1, 'La descripción es requerida').optional(),
  icon: z.string().min(1, 'El icono es requerido').optional(),
  content: z.string().min(1, 'El contenido es requerido').optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Verificar autenticación y rol de admin
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener info card por ID
    const infoCard = await prisma.landingInfoCard.findUnique({
      where: { id },
    });

    if (!infoCard) {
      return NextResponse.json(
        { error: 'Info card no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(infoCard);
  } catch (error) {
    console.error('Error fetching info card:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Verificar autenticación y rol de admin
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que la info card existe
    const existingInfoCard = await prisma.landingInfoCard.findUnique({
      where: { id },
    });

    if (!existingInfoCard) {
      return NextResponse.json(
        { error: 'Info card no encontrada' },
        { status: 404 }
      );
    }

    // Validar datos de entrada
    const body = await request.json();
    const validatedData = updateInfoCardSchema.parse(body);

    // Actualizar info card
    const infoCard = await prisma.landingInfoCard.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(infoCard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating info card:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Verificar autenticación y rol de admin
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que la info card existe
    const existingInfoCard = await prisma.landingInfoCard.findUnique({
      where: { id },
    });

    if (!existingInfoCard) {
      return NextResponse.json(
        { error: 'Info card no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar info card
    await prisma.landingInfoCard.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Info card eliminada exitosamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting info card:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
