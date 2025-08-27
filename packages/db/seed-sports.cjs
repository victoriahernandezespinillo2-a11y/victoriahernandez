const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedSportsData() {
  try {
    console.log('🌱 Sembrando datos de instalaciones deportivas...');

    // Crear categorías de deportes
    const categories = await Promise.all([
      prisma.landingSportCategory.upsert({
        where: { slug: 'canchas' },
        update: {},
        create: {
          name: 'Canchas Deportivas',
          slug: 'canchas',
          icon: 'fas fa-futbol',
          color: 'from-green-500 to-emerald-600',
          description: 'Canchas profesionales para diferentes deportes',
          isActive: true,
          order: 0
        }
      }),
      prisma.landingSportCategory.upsert({
        where: { slug: 'gimnasio' },
        update: {},
        create: {
          name: 'Gimnasio & Fitness',
          slug: 'gimnasio',
          icon: 'fas fa-dumbbell',
          color: 'from-blue-500 to-indigo-600',
          description: 'Equipamiento completo para fitness y entrenamiento',
          isActive: true,
          order: 1
        }
      }),
      prisma.landingSportCategory.upsert({
        where: { slug: 'acuaticos' },
        update: {},
        create: {
          name: 'Deportes Acuáticos',
          slug: 'acuaticos',
          icon: 'fas fa-swimmer',
          color: 'from-cyan-500 to-blue-600',
          description: 'Piscinas y actividades acuáticas',
          isActive: true,
          order: 2
        }
      }),
      prisma.landingSportCategory.upsert({
        where: { slug: 'indoor' },
        update: {},
        create: {
          name: 'Deportes Indoor',
          slug: 'indoor',
          icon: 'fas fa-table-tennis',
          color: 'from-purple-500 to-pink-600',
          description: 'Deportes de interior y actividades especializadas',
          isActive: true,
          order: 3
        }
      })
    ]);

    console.log('✅ Categorías de deportes creadas:', categories.length);

    // Obtener las categorías para usar sus IDs
    const canchasCategory = await prisma.landingSportCategory.findUnique({ where: { slug: 'canchas' } });
    const gimnasioCategory = await prisma.landingSportCategory.findUnique({ where: { slug: 'gimnasio' } });
    const acuaticosCategory = await prisma.landingSportCategory.findUnique({ where: { slug: 'acuaticos' } });
    const indoorCategory = await prisma.landingSportCategory.findUnique({ where: { slug: 'indoor' } });

    // Crear instalaciones deportivas
    const facilities = await Promise.all([
      // Canchas Deportivas
      prisma.landingSportFacility.create({
        data: {
          categoryId: canchasCategory.id,
          name: 'Fútbol 11',
          description: 'Cancha de césped sintético de última generación con iluminación LED profesional.',
          imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          price: '$80.000/hora',
          availability: 'Disponible',
          rating: 4.9,
          features: ['Césped sintético premium', 'Iluminación LED', 'Gradas para 200 personas', 'Vestuarios equipados'],
          isActive: true,
          order: 0
        }
      }),
      prisma.landingSportFacility.create({
        data: {
          categoryId: canchasCategory.id,
          name: 'Fútbol 7',
          description: 'Perfecta para partidos más dinámicos con amigos o entrenamientos técnicos.',
          imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          price: '$50.000/hora',
          availability: 'Disponible',
          rating: 4.8,
          features: ['Superficie antideslizante', 'Portería reglamentaria', 'Iluminación nocturna', 'Área de descanso'],
          isActive: true,
          order: 1
        }
      }),
      prisma.landingSportFacility.create({
        data: {
          categoryId: canchasCategory.id,
          name: 'Básquetbol',
          description: 'Cancha reglamentaria con tableros profesionales y superficie de alto rendimiento.',
          imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          price: '$45.000/hora',
          availability: 'Ocupado hasta 18:00',
          rating: 4.7,
          features: ['Tableros profesionales', 'Superficie deportiva', 'Marcador electrónico', 'Gradas laterales'],
          isActive: true,
          order: 2
        }
      }),

      // Gimnasio & Fitness
      prisma.landingSportFacility.create({
        data: {
          categoryId: gimnasioCategory.id,
          name: 'Sala de Pesas',
          description: 'Equipamiento completo con máquinas de última tecnología y pesas libres.',
          imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          price: '$25.000/día',
          availability: 'Disponible',
          rating: 4.9,
          features: ['Equipos Technogym', 'Aire acondicionado', 'Música ambiental', 'Entrenador disponible'],
          isActive: true,
          order: 0
        }
      }),
      prisma.landingSportFacility.create({
        data: {
          categoryId: gimnasioCategory.id,
          name: 'Sala Cardio',
          description: 'Zona especializada en ejercicio cardiovascular con equipos de alta gama.',
          imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          price: '$20.000/día',
          availability: 'Disponible',
          rating: 4.8,
          features: ['Caminadoras premium', 'Bicicletas estáticas', 'Elípticas', 'Monitores cardíacos'],
          isActive: true,
          order: 1
        }
      }),
      prisma.landingSportFacility.create({
        data: {
          categoryId: gimnasioCategory.id,
          name: 'Clases Grupales',
          description: 'Espacio amplio para yoga, pilates, aeróbicos y entrenamientos funcionales.',
          imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          price: '$15.000/clase',
          availability: 'Próxima clase: 19:00',
          rating: 4.9,
          features: ['Espejos profesionales', 'Sistema de sonido', 'Colchonetas incluidas', 'Instructor certificado'],
          isActive: true,
          order: 2
        }
      }),

      // Deportes Acuáticos
      prisma.landingSportFacility.create({
        data: {
          categoryId: acuaticosCategory.id,
          name: 'Piscina Olímpica',
          description: 'Piscina de 50 metros con 8 carriles para natación profesional y recreativa.',
          imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          price: '$30.000/hora',
          availability: 'Disponible',
          rating: 4.8,
          features: ['50m x 8 carriles', 'Sistema de filtrado', 'Cronómetro digital', 'Salvavidas certificado'],
          isActive: true,
          order: 0
        }
      }),
      prisma.landingSportFacility.create({
        data: {
          categoryId: acuaticosCategory.id,
          name: 'Piscina Recreativa',
          description: 'Ideal para familias y actividades acuáticas recreativas.',
          imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          price: '$20.000/día',
          availability: 'Disponible',
          rating: 4.7,
          features: ['Área infantil', 'Tobogán', 'Zona de descanso', 'Bar acuático'],
          isActive: true,
          order: 1
        }
      }),

      // Deportes Indoor
      prisma.landingSportFacility.create({
        data: {
          categoryId: indoorCategory.id,
          name: 'Tenis de Mesa',
          description: 'Mesas profesionales en ambiente climatizado para competencias y recreación.',
          imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          price: '$25.000/hora',
          availability: 'Disponible',
          rating: 4.6,
          features: ['Mesas reglamentarias', 'Iluminación óptima', 'Raquetas disponibles', 'Área de espectadores'],
          isActive: true,
          order: 0
        }
      }),
      prisma.landingSportFacility.create({
        data: {
          categoryId: indoorCategory.id,
          name: 'Squash',
          description: 'Cancha profesional de squash con paredes de cristal templado.',
          imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          price: '$35.000/hora',
          availability: 'Disponible',
          rating: 4.8,
          features: ['Paredes de cristal', 'Suelo profesional', 'Raquetas incluidas', 'Sistema de ventilación'],
          isActive: true,
          order: 1
        }
      })
    ]);

    console.log('✅ Instalaciones deportivas creadas:', facilities.length);
    console.log('🎉 Datos de instalaciones deportivas sembrados exitosamente!');

  } catch (error) {
    console.error('❌ Error sembrando datos de instalaciones deportivas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSportsData();
