import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';
import { z } from 'zod';

// Schema de validación para Sponsor
const SponsorUpdateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  category: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  partnership: z.string().optional(),
  since: z.string().optional(),
  tier: z.enum(['PLATINUM', 'GOLD', 'SILVER', 'BRONZE']).default('SILVER'),
  benefits: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

// GET - Obtener un patrocinador específico
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

    const sponsor = await prisma.landingSponsor.findUnique({
      where: { id },
    });

    if (!sponsor) {
      return NextResponse.json({ error: 'Patrocinador no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ sponsor });
  } catch (error) {
    console.error('Error al obtener patrocinador:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un patrocinador
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
    const validatedData = SponsorUpdateSchema.parse(body);

    const sponsor = await prisma.landingSponsor.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({ sponsor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Patrocinador no encontrado' }, { status: 404 });
    }

    console.error('Error al actualizar patrocinador:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un patrocinador
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

    await prisma.landingSponsor.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Patrocinador eliminado correctamente' });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Patrocinador no encontrado' }, { status: 404 });
    }

    console.error('Error al eliminar patrocinador:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
