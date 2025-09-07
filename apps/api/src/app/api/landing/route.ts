import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startedAt = Date.now();
  try {
    const [hero, stats, sponsors, testimonials, sportCategories, activities, infoCards, faqs, courts] = await Promise.all([
      prisma.landingHero.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
      prisma.landingStat.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
      prisma.landingSponsor.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
      prisma.landingTestimonial.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
      prisma.landingSportCategory.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        include: {
          facilities: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
          },
        },
      }),
      prisma.landingActivity.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
      prisma.landingInfoCard.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
      prisma.landingFAQ.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
      prisma.court.findMany({
        where: { isActive: true },
        select: { sportType: true, isMultiuse: true, allowedSports: true },
      }),
    ]);

    // Derivar lista de deportes reales desde canchas activas (sportType y allowedSports)
    const sportsSet = new Set<string>();
    for (const court of courts) {
      if (court.sportType) sportsSet.add(court.sportType);
      if (court.isMultiuse && Array.isArray(court.allowedSports)) {
        for (const s of court.allowedSports) if (s) sportsSet.add(s);
      }
    }
    const sportsList = Array.from(sportsSet).sort((a, b) => a.localeCompare(b, 'es'));

    const payload = {
      hero,
      stats,
      sponsors,
      testimonials,
      faqs,
      sports: sportCategories,
      sportsList,
      activities,
      infoCards,
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      },
    };

    const response = NextResponse.json(payload, { status: 200 });
    // Caching para edge/CDN; en dev no afecta
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    response.headers.set('Vary', 'Origin');
    return response;
  } catch (error: unknown) {
    console.error('[LANDING_GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: 'LANDING_FETCH_FAILED', message } },
      { status: 500 }
    );
  }
}

 
