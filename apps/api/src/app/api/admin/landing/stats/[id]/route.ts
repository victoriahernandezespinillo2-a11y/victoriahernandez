import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';
import { z } from 'zod';

// Schema de validación para Stat
const StatUpdateSchema = z.object({
  value: z.string().min(1, 'El valor es requerido'),
  suffix: z.string().optional(),
  label: z.string().min(1, 'La etiqueta es requerida'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

// GET - Obtener una estadística específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const stat = await prisma.landingStat.findUnique({
      where: { id },
    });

    if (!stat) {
      return NextResponse.json({ error: 'Estadística no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ stat });
  } catch (error) {
    console.error('Error al obtener estadística:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una estadística
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = StatUpdateSchema.parse(body);

    const stat = await prisma.landingStat.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({ stat });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Estadística no encontrada' }, { status: 404 });
    }

    console.error('Error al actualizar estadística:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una estadística
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await prisma.landingStat.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Estadística eliminada correctamente' });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Estadística no encontrada' }, { status: 404 });
    }

    console.error('Error al eliminar estadística:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
