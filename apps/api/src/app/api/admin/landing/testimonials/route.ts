import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';

import { z } from 'zod';

// Schema de validación para Testimonial
const TestimonialSchema = z.object({
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

// GET - Obtener todos los testimonios
export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const testimonials = await prisma.landingTestimonial.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ testimonials });
  } catch (error) {
    console.error('Error al obtener testimonios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo testimonio
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = TestimonialSchema.parse(body);

    const testimonial = await prisma.landingTestimonial.create({
      data: validatedData,
    });

    return NextResponse.json({ testimonial }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear testimonio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
