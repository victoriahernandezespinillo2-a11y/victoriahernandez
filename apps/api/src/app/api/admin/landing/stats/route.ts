import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';

import { z } from 'zod';

// Schema de validación para Stat
const StatSchema = z.object({
  value: z.string().min(1, 'El valor es requerido'),
  suffix: z.string().optional(),
  label: z.string().min(1, 'La etiqueta es requerida'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

// GET - Obtener todas las estadísticas
export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const stats = await prisma.landingStat.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva estadística
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = StatSchema.parse(body);

    const stat = await prisma.landingStat.create({
      data: validatedData,
    });

    return NextResponse.json({ stat }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear estadística:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
