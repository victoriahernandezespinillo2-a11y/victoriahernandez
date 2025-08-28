import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@repo/auth';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validación para crear info card
const createInfoCardSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  icon: z.string().min(1, 'El icono es requerido'),
  content: z.string().min(1, 'El contenido es requerido'),
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

    // Obtener info cards
    const infoCards = await prisma.landingInfoCard.findMany({
      where,
      orderBy: {
        [orderBy]: orderDirection,
      },
    });

    return NextResponse.json(infoCards);
  } catch (error) {
    console.error('Error fetching info cards:', error);
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
    const validatedData = createInfoCardSchema.parse(body);

    // Crear info card
    const infoCard = await prisma.landingInfoCard.create({
      data: validatedData,
    });

    return NextResponse.json(infoCard, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating info card:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


