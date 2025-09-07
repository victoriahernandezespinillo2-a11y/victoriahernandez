import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';
import { z } from 'zod';

// Schema de validación para crear/actualizar instalación deportiva (único)
const SportFacilitySchema = z.object({
  categoryId: z.string().min(1, 'La categoría es requerida'),
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().min(1, 'La descripción es requerida'),
  imageUrl: z.string().url().optional(),
  price: z.string().min(1, 'El precio es requerido'),
  availability: z.string().min(1, 'La disponibilidad es requerida'),
  rating: z.number().min(0).max(5).default(0),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0)
});

// GET - Obtener todas las instalaciones deportivas
// GET - Obtener todas las instalaciones deportivas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};
    
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [facilities, total] = await Promise.all([
      prisma.landingSportFacility.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true
            }
          }
        },
        orderBy: [
          { order: 'asc' },
          { name: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.landingSportFacility.count({ where })
    ]);

    return NextResponse.json({
      facilities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener instalaciones deportivas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva instalación deportiva
// POST - Crear nueva instalación deportiva
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = SportFacilitySchema.parse(body);

    // Verificar que la categoría existe
    const category = await prisma.landingSportCategory.findUnique({
      where: { id: validatedData.categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'La categoría especificada no existe' },
        { status: 400 }
      );
    }

    const facility = await prisma.landingSportFacility.create({
      data: validatedData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true
          }
        }
      }
    });

    return NextResponse.json(facility, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear instalación deportiva:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


