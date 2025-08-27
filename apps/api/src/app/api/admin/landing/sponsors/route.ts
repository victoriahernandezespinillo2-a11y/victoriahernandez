import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';

import { z } from 'zod';

// Schema de validación para Sponsor
const SponsorSchema = z.object({
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

// GET - Obtener todos los patrocinadores
export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sponsors = await prisma.landingSponsor.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ sponsors });
  } catch (error) {
    console.error('Error al obtener patrocinadores:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo patrocinador
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = SponsorSchema.parse(body);

    const sponsor = await prisma.landingSponsor.create({
      data: validatedData,
    });

    return NextResponse.json({ sponsor }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear patrocinador:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
