import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todos los datos de la landing page (público)
export async function GET() {
  try {
    // Obtener todos los datos en paralelo
    const [heroSlides, testimonials, sponsors, stats, faqs, sportsCategories, activities, infoCards] = await Promise.all([
      prisma.landingHero.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),
      prisma.landingTestimonial.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),
      prisma.landingSponsor.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),
      prisma.landingStat.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),
      prisma.landingFAQ.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),
      prisma.landingSportCategory.findMany({
        where: { isActive: true },
        include: {
          facilities: {
            where: { isActive: true },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: [
          { order: 'asc' },
          { name: 'asc' }
        ],
      }),
      prisma.landingActivity.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),
      prisma.landingInfoCard.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),
    ]);

    return NextResponse.json({
      hero: heroSlides,
      testimonials,
      sponsors,
      stats,
      faqs,
      sports: sportsCategories,
      activities,
      infoCards,
    });
  } catch (error) {
    console.error('Error al obtener datos de landing page:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
