import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@repo/auth';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validación para crear actividad
const createActivitySchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  icon: z.string().min(1, 'El icono es requerido'),
  schedule: z.string().min(1, 'El horario es requerido'),
  color: z.string().optional().default('from-emerald-500 to-blue-600'),
  isActive: z.boolean().optional().default(true),
  order: z.number().int().min(0).optional().default(0),
});

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol de admin
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const orderBy = searchParams.get('orderBy') || 'order';
    const orderDirection = searchParams.get('orderDirection') || 'asc';

    // Construir filtros
    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Obtener actividades
    const activities = await prisma.landingActivity.findMany({
      where,
      orderBy: {
        [orderBy]: orderDirection,
      },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y rol de admin
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Validar datos de entrada
    const body = await request.json();
    const validatedData = createActivitySchema.parse(body);

    // Crear actividad
    const activity = await prisma.landingActivity.create({
      data: validatedData,
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
