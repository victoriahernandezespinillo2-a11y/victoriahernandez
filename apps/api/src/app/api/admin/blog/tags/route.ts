import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';

import { z } from 'zod';

// Schema de validación para crear/actualizar tag
const TagSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  slug: z.string().min(1, 'El slug es requerido').max(100).regex(/^[a-z0-9-]+$/, 'El slug debe contener solo letras minúsculas, números y guiones'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'El color debe ser un código hexadecimal válido').optional(),
  isActive: z.boolean().default(true)
});

// GET - Obtener todos los tags
export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tags = await prisma.tag.findMany({
      orderBy: [
        { name: 'asc' }
      ]
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error al obtener tags:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo tag
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = TagSchema.parse(body);

    // Verificar si el slug ya existe
    const existingTag = await prisma.tag.findUnique({
      where: { slug: validatedData.slug }
    });

    if (existingTag) {
      return NextResponse.json(
        { error: 'Ya existe un tag con este slug' },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.create({
      data: validatedData
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear tag:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


