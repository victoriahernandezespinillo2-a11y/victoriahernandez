import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';

import { z } from 'zod';

// Schema de validación para FAQ
const FAQSchema = z.object({
  question: z.string().min(1, 'La pregunta es requerida'),
  answer: z.string().min(1, 'La respuesta es requerida'),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

// GET - Obtener todas las FAQ
export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const faqs = await prisma.landingFAQ.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ faqs });
  } catch (error) {
    console.error('Error al obtener FAQ:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva FAQ
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = FAQSchema.parse(body);

    const faq = await prisma.landingFAQ.create({
      data: validatedData,
    });

    return NextResponse.json({ faq }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear FAQ:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


