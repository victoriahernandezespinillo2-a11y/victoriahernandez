import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';
import { z } from 'zod';

// Esquema de validación para crear/actualizar categoría de deporte
const SportCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  slug: z.string().min(1, 'El slug es requerido').max(100).regex(/^[a-z0-9-]+$/i, 'El slug debe contener solo letras, números y guiones'),
  icon: z.string().min(1, 'El icono es requerido'),
  color: z.string().min(1, 'El color es requerido'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

// GET - Obtener todas las categorías de deportes
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const categories = await prisma.landingSportCategory.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { facilities: true } } },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error al obtener categorías de deportes:', error);
    // Fallback seguro para no romper el panel: devolver lista vacía
    return NextResponse.json([], { status: 200 });
  }
}

// POST - Crear nueva categoría de deporte
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = SportCategorySchema.parse(body);

    // Verificar si el slug ya existe
    const existingCategory = await prisma.landingSportCategory.findUnique({
      where: { slug: validatedData.slug },
    });
    if (existingCategory) {
      return NextResponse.json({ error: 'Ya existe una categoría con este slug' }, { status: 409 });
    }

    const category = await prisma.landingSportCategory.create({ data: validatedData });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    console.error('Error al crear categoría de deporte:', error);
    // Responder JSON siempre para evitar HTML de error
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
