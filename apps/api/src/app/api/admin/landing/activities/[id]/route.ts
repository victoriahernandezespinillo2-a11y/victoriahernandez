import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@repo/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validación para actualizar actividad
const updateActivitySchema = z.object({
  title: z.string().min(1, 'El título es requerido').optional(),
  description: z.string().min(1, 'La descripción es requerida').optional(),
  icon: z.string().min(1, 'El icono es requerido').optional(),
  schedule: z.string().min(1, 'El horario es requerido').optional(),
  color: z.string().optional(),
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

    // Obtener actividad por ID
    const activity = await prisma.landingActivity.findUnique({
      where: { id },
    });

    if (!activity) {
      return NextResponse.json(
        { error: 'Actividad no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error);
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

    // Verificar que la actividad existe
    const existingActivity = await prisma.landingActivity.findUnique({
      where: { id },
    });

    if (!existingActivity) {
      return NextResponse.json(
        { error: 'Actividad no encontrada' },
        { status: 404 }
      );
    }

    // Validar datos de entrada
    const body = await request.json();
    const validatedData = updateActivitySchema.parse(body);

    // Actualizar actividad
    const activity = await prisma.landingActivity.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(activity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating activity:', error);
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

    // Verificar que la actividad existe
    const existingActivity = await prisma.landingActivity.findUnique({
      where: { id },
    });

    if (!existingActivity) {
      return NextResponse.json(
        { error: 'Actividad no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar actividad
    await prisma.landingActivity.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Actividad eliminada exitosamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
