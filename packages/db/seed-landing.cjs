const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedLandingData() {
  try {
    console.log('🌱 Iniciando seed de datos de landing page...');

    // Limpiar datos existentes
    await prisma.landingHero.deleteMany();
    await prisma.landingTestimonial.deleteMany();
    await prisma.landingSponsor.deleteMany();
    await prisma.landingStat.deleteMany();
    await prisma.landingFAQ.deleteMany();

    console.log('🧹 Datos existentes eliminados');

    // Crear Hero Slides
    const heroSlides = await Promise.all([
      prisma.landingHero.create({
        data: {
          title: "Polideportivo Victoria Hernandez",
          subtitle: "Centro Deportivo Premium",
          description: "Vive la pasión del deporte en nuestras instalaciones de clase mundial. Reserva, entrena y compite en el mejor ambiente deportivo de la región.",
          imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
          ctaText: "Reservar Ahora",
          ctaLink: "/dashboard/reservations/new",
          secondaryCtaText: "Explorar Instalaciones",
          secondaryCtaLink: "#instalaciones",
          isActive: true,
          order: 0,
        },
      }),
      prisma.landingHero.create({
        data: {
          title: "Instalaciones Modernas",
          subtitle: "Tecnología de Vanguardia",
          description: "Canchas sintéticas, iluminación LED, sistemas de climatización y la mejor tecnología para una experiencia deportiva incomparable.",
          imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
          ctaText: "Ver Instalaciones",
          ctaLink: "#instalaciones",
          secondaryCtaText: "Conocer Más",
          secondaryCtaLink: "#info",
          isActive: true,
          order: 1,
        },
      }),
      prisma.landingHero.create({
        data: {
          title: "Comunidad Deportiva",
          subtitle: "Únete a Nosotros",
          description: "Más de 5,000 deportistas confían en nosotros. Torneos, clases dirigidas, entrenamiento personal y eventos que transforman vidas.",
          imageUrl: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2068&q=80",
          ctaText: "Unirse Ahora",
          ctaLink: "/auth/signin",
          secondaryCtaText: "Ver Eventos",
          secondaryCtaLink: "#actividades",
          isActive: true,
          order: 2,
        },
      }),
    ]);

    console.log('✅ Hero slides creados:', heroSlides.length);

    // Crear Testimonios
    const testimonials = await Promise.all([
      prisma.landingTestimonial.create({
        data: {
          name: "María González",
          role: "Entrenadora Personal",
          company: "Fitness Pro",
          content: "Las instalaciones de Polideportivo Victoria Hernandez superaron todas mis expectativas. La calidad del equipamiento y la atención al cliente son excepcionales. Mis clientes siempre salen satisfechos de cada sesión.",
          rating: 5,
          imageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
          sport: "Fitness & Entrenamiento",
          experience: "3 años como usuario",
          highlight: "Equipamiento de última generación",
          isActive: true,
          order: 0,
        },
      }),
      prisma.landingTestimonial.create({
        data: {
          name: "Carlos Rodríguez",
          role: "Capitán de Equipo",
          company: "Club Deportivo Los Leones",
          content: "Llevamos entrenando aquí desde hace 2 años y la diferencia es notable. Las canchas están siempre en perfecto estado y el sistema de reservas es muy eficiente. Recomendado al 100%.",
          rating: 5,
          imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
          sport: "Fútbol",
          experience: "2 años como usuario",
          highlight: "Canchas en perfecto estado",
          isActive: true,
          order: 1,
        },
      }),
      prisma.landingTestimonial.create({
        data: {
          name: "Ana Martínez",
          role: "Nadadora Profesional",
          company: "Equipo Nacional",
          content: "La piscina olímpica es de clase mundial. He entrenado en muchas instalaciones y esta definitivamente está entre las mejores. El ambiente es profesional y motivador.",
          rating: 5,
          imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
          sport: "Natación",
          experience: "1 año como usuario",
          highlight: "Instalaciones de clase mundial",
          isActive: true,
          order: 2,
        },
      }),
      prisma.landingTestimonial.create({
        data: {
          name: "Roberto Silva",
          role: "Empresario",
          company: "Silva & Asociados",
          content: "Perfecto para desestresarme después del trabajo. Las clases grupales son excelentes y el personal siempre está dispuesto a ayudar. Es mi escape diario del estrés laboral.",
          rating: 5,
          imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
          sport: "Clases Grupales",
          experience: "6 meses como usuario",
          highlight: "Excelente para el bienestar",
          isActive: true,
          order: 3,
        },
      }),
      prisma.landingTestimonial.create({
        data: {
          name: "Laura Fernández",
          role: "Estudiante Universitaria",
          company: "Universidad Nacional",
          content: "Los precios son muy accesibles para estudiantes y la calidad es increíble. He mejorado mucho mi condición física desde que empecé a venir. ¡Totalmente recomendado!",
          rating: 5,
          imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=764&q=80",
          sport: "Gimnasio",
          experience: "8 meses como usuario",
          highlight: "Excelente relación calidad-precio",
          isActive: true,
          order: 4,
        },
      }),
      prisma.landingTestimonial.create({
        data: {
          name: "Diego Morales",
          role: "Entrenador de Básquet",
          company: "Academia Deportiva Elite",
          content: "Las canchas de básquet son espectaculares. El sonido, la iluminación, todo está pensado para brindar la mejor experiencia. Mis jugadores han mejorado notablemente.",
          rating: 5,
          imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
          sport: "Básquetbol",
          experience: "4 años como usuario",
          highlight: "Instalaciones profesionales",
          isActive: true,
          order: 5,
        },
      }),
    ]);

    console.log('✅ Testimonios creados:', testimonials.length);

    // Crear Patrocinadores
    const sponsors = await Promise.all([
      prisma.landingSponsor.create({
        data: {
          name: "Nike Sports",
          category: "Equipamiento Deportivo",
          logoUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
          description: "Proveedor oficial de equipamiento deportivo premium para nuestras instalaciones.",
          website: "https://nike.com",
          partnership: "Patrocinador Principal",
          since: "2020",
          tier: "PLATINUM",
          benefits: ["Equipamiento exclusivo", "Eventos especiales", "Descuentos para miembros"],
          isActive: true,
          order: 0,
        },
      }),
      prisma.landingSponsor.create({
        data: {
          name: "Gatorade",
          category: "Nutrición Deportiva",
          logoUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
          description: "Bebidas energéticas y suplementos nutricionales para deportistas de alto rendimiento.",
          website: "https://gatorade.com",
          partnership: "Socio Estratégico",
          since: "2019",
          tier: "GOLD",
          benefits: ["Estaciones de hidratación", "Productos especializados", "Asesoría nutricional"],
          isActive: true,
          order: 1,
        },
      }),
      prisma.landingSponsor.create({
        data: {
          name: "TechnoGym",
          category: "Tecnología Fitness",
          logoUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
          description: "Equipos de gimnasio de última generación y tecnología fitness innovadora.",
          website: "https://technogym.com",
          partnership: "Proveedor Tecnológico",
          since: "2021",
          tier: "PLATINUM",
          benefits: ["Equipos premium", "Mantenimiento especializado", "Actualizaciones tecnológicas"],
          isActive: true,
          order: 2,
        },
      }),
      prisma.landingSponsor.create({
        data: {
          name: "Coca-Cola",
          category: "Bebidas Refrescantes",
          logoUrl: "https://images.unsplash.com/photo-1554866585-aa948724c0d5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
          description: "Refrescos y bebidas para el disfrute de nuestros visitantes en eventos especiales.",
          website: "https://coca-cola.com",
          partnership: "Sponsor Oficial",
          since: "2018",
          tier: "GOLD",
          benefits: ["Máquinas expendedoras", "Eventos corporativos", "Promociones especiales"],
          isActive: true,
          order: 3,
        },
      }),
      prisma.landingSponsor.create({
        data: {
          name: "Under Armour",
          category: "Ropa Deportiva",
          logoUrl: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
          description: "Indumentaria deportiva de alta calidad para atletas y entusiastas del fitness.",
          website: "https://underarmour.com",
          partnership: "Patrocinador Textil",
          since: "2022",
          tier: "SILVER",
          benefits: ["Uniformes oficiales", "Colecciones exclusivas", "Descuentos corporativos"],
          isActive: true,
          order: 4,
        },
      }),
    ]);

    console.log('✅ Patrocinadores creados:', sponsors.length);

    // Crear Estadísticas
    const stats = await Promise.all([
      prisma.landingStat.create({
        data: {
          value: "5000",
          suffix: "+",
          label: "Usuarios Activos",
          description: "Deportistas confían en nosotros",
          icon: "fas fa-users",
          color: "from-blue-500 to-indigo-600",
          isActive: true,
          order: 0,
        },
      }),
      prisma.landingStat.create({
        data: {
          value: "25000",
          suffix: "+",
          label: "Reservas Completadas",
          description: "Experiencias deportivas exitosas",
          icon: "fas fa-calendar-check",
          color: "from-emerald-500 to-green-600",
          isActive: true,
          order: 1,
        },
      }),
      prisma.landingStat.create({
        data: {
          value: "15",
          suffix: "",
          label: "Instalaciones Premium",
          description: "Espacios deportivos de alta calidad",
          icon: "fas fa-building",
          color: "from-purple-500 to-pink-600",
          isActive: true,
          order: 2,
        },
      }),
      prisma.landingStat.create({
        data: {
          value: "98",
          suffix: "%",
          label: "Satisfacción Cliente",
          description: "Índice de satisfacción promedio",
          icon: "fas fa-star",
          color: "from-orange-500 to-red-600",
          isActive: true,
          order: 3,
        },
      }),
    ]);

    console.log('✅ Estadísticas creadas:', stats.length);

    // Crear FAQ
    const faqs = await Promise.all([
      prisma.landingFAQ.create({
        data: {
          question: "¿Necesito membresía para usar las instalaciones?",
          answer: "Ofrecemos tanto pases diarios como membresías mensuales y anuales. Las membresías incluyen beneficios adicionales como descuentos en clases y eventos.",
          isActive: true,
          order: 0,
        },
      }),
      prisma.landingFAQ.create({
        data: {
          question: "¿Qué incluye la membresía?",
          answer: "Acceso ilimitado a todas las instalaciones, descuentos en clases dirigidas, prioridad en reservas y acceso a eventos exclusivos para miembros.",
          isActive: true,
          order: 1,
        },
      }),
      prisma.landingFAQ.create({
        data: {
          question: "¿Hay estacionamiento disponible?",
          answer: "Sí, contamos con amplio estacionamiento gratuito para todos nuestros usuarios, con espacios cubiertos y al aire libre.",
          isActive: true,
          order: 2,
        },
      }),
      prisma.landingFAQ.create({
        data: {
          question: "¿Ofrecen clases para principiantes?",
          answer: "Absolutamente. Tenemos programas especiales para principiantes en todas las disciplinas, con instructores especializados en enseñanza básica.",
          isActive: true,
          order: 3,
        },
      }),
    ]);

    console.log('✅ FAQ creadas:', faqs.length);

    console.log('🎉 Seed de landing page completado exitosamente!');
    console.log('📊 Resumen:');
    console.log(`   - Hero Slides: ${heroSlides.length}`);
    console.log(`   - Testimonios: ${testimonials.length}`);
    console.log(`   - Patrocinadores: ${sponsors.length}`);
    console.log(`   - Estadísticas: ${stats.length}`);
    console.log(`   - FAQ: ${faqs.length}`);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el seed si se llama directamente
if (require.main === module) {
  seedLandingData()
    .then(() => {
      console.log('✅ Seed completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el seed:', error);
      process.exit(1);
    });
}

module.exports = { seedLandingData };
