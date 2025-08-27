import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';

import { z } from 'zod';

// Schema de validación para crear/actualizar categoría
const CategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  slug: z.string().min(1, 'El slug es requerido').max(100).regex(/^[a-z0-9-]+$/, 'El slug debe contener solo letras minúsculas, números y guiones'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'El color debe ser un código hexadecimal válido').optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
});

// GET - Obtener todas las categorías
export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva categoría
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CategorySchema.parse(body);

    // Verificar si el slug ya existe
    const existingCategory = await prisma.category.findUnique({
      where: { slug: validatedData.slug }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Ya existe una categoría con este slug' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: validatedData
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear categoría:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
