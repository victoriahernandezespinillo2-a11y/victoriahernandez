import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';

import { z } from 'zod';

// Schema de validación para Hero
const internalPath = z.string().regex(/^\//);
const hashAnchor = z.string().regex(/^#/);

const HeroSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.union([z.string().url(), internalPath, z.literal('')]).optional(),
  ctaText: z.string().optional(),
  ctaLink: z.union([z.string().url(), internalPath, hashAnchor]).optional(),
  secondaryCtaText: z.string().optional(),
  secondaryCtaLink: z.union([z.string().url(), internalPath, hashAnchor]).optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

// GET - Obtener todos los hero slides
export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const heroes = await prisma.landingHero.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ heroes });
  } catch (error) {
    console.error('Error al obtener hero slides:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo hero slide
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = HeroSchema.parse(body);

    const hero = await prisma.landingHero.create({
      data: validatedData,
    });

    return NextResponse.json({ hero }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear hero slide:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


