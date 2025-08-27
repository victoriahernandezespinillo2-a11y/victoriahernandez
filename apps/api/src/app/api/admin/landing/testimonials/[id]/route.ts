import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Schema de validación para Testimonial
const TestimonialUpdateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  role: z.string().optional(),
  company: z.string().optional(),
  content: z.string().min(1, 'El contenido es requerido'),
  rating: z.number().int().min(1).max(5).default(5),
  imageUrl: z.string().url().optional().or(z.literal('')),
  sport: z.string().optional(),
  experience: z.string().optional(),
  highlight: z.string().optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

// GET - Obtener un testimonio específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const testimonial = await prisma.landingTestimonial.findUnique({
      where: { id },
    });

    if (!testimonial) {
      return NextResponse.json({ error: 'Testimonio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ testimonial });
  } catch (error) {
    console.error('Error al obtener testimonio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un testimonio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = TestimonialUpdateSchema.parse(body);

    const testimonial = await prisma.landingTestimonial.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({ testimonial });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Testimonio no encontrado' }, { status: 404 });
    }

    console.error('Error al actualizar testimonio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un testimonio
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await prisma.landingTestimonial.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Testimonio eliminado correctamente' });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Testimonio no encontrado' }, { status: 404 });
    }

    console.error('Error al eliminar testimonio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
