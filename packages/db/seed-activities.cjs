const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de actividades...');

  // Datos de ejemplo para las actividades
  const activitiesData = [
    {
      title: "Clases Dirigidas",
      description: "Entrenamientos grupales con instructores certificados",
      icon: "fas fa-users",
      schedule: "Lun-Vie 6:00-22:00",
      color: "from-emerald-500 to-blue-600",
      order: 1
    },
    {
      title: "Torneos",
      description: "Competencias regulares en todas las disciplinas",
      icon: "fas fa-medal",
      schedule: "Fines de semana",
      color: "from-purple-500 to-pink-600",
      order: 2
    },
    {
      title: "Eventos Especiales",
      description: "Celebraciones deportivas y actividades familiares",
      icon: "fas fa-calendar-star",
      schedule: "Fechas especiales",
      color: "from-orange-500 to-red-600",
      order: 3
    },
    {
      title: "Escuelas Deportivas",
      description: "Formación deportiva para niños y jóvenes",
      icon: "fas fa-graduation-cap",
      schedule: "Lun-Sáb 15:00-18:00",
      color: "from-blue-500 to-indigo-600",
      order: 4
    }
  ];

  // Crear actividades
  for (const activityData of activitiesData) {
    try {
      await prisma.landingActivity.create({
        data: activityData,
      });
      console.log(`✅ Actividad "${activityData.title}" creada`);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`⚠️  Actividad "${activityData.title}" ya existe`);
      } else {
        console.error(`❌ Error creando actividad "${activityData.title}":`, error);
      }
    }
  }

  console.log('🎉 Seed de actividades completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
