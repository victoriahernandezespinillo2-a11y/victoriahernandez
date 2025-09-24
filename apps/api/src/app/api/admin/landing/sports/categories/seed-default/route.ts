import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@repo/auth';

const DEFAULT_CATEGORIES = [
  {
    name: 'Canchas Deportivas',
    slug: 'canchas-deportivas',
    icon: 'fas fa-futbol',
    color: 'from-emerald-500 to-blue-600',
    description: 'Fútbol, baloncesto, tenis y más. Espacios para entrenamiento y competición.',
    isActive: true,
    order: 0,
  },
  {
    name: 'Gimnasio & Fitness',
    slug: 'gimnasio-fitness',
    icon: 'fas fa-dumbbell',
    color: 'from-emerald-500 to-blue-600',
    description: 'Áreas equipadas con máquinas, peso libre y clases dirigidas.',
    isActive: true,
    order: 1,
  },
  {
    name: 'Deportes Acuáticos',
    slug: 'deportes-acuaticos',
    icon: 'fas fa-swimmer',
    color: 'from-emerald-500 to-blue-600',
    description: 'Piscinas para nado libre, aprendizaje y entrenamiento.',
    isActive: true,
    order: 2,
  },
  {
    name: 'Deportes Indoor',
    slug: 'deportes-indoor',
    icon: 'fas fa-table-tennis',
    color: 'from-emerald-500 to-blue-600',
    description: 'Actividades bajo techo: tenis de mesa, voleibol, bádminton y más.',
    isActive: true,
    order: 3,
  },
];

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const created: any[] = [];
    for (const cat of DEFAULT_CATEGORIES) {
      const exists = await prisma.landingSportCategory.findUnique({ where: { slug: cat.slug } });
      if (!exists) {
        const c = await prisma.landingSportCategory.create({ data: cat });
        created.push(c);
      }
    }

    return NextResponse.json({ ok: true, created: created.length, message: created.length ? 'Categorías creadas' : 'Ya existían todas' });
  } catch (error) {
    console.error('Seed categorías default:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

























