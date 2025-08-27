const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de info cards...');

  // Datos de ejemplo para las info cards
  const infoCardsData = [
    {
      title: "Sobre Nosotros",
      description: "Más de 10 años brindando experiencias deportivas excepcionales",
      icon: "fas fa-building",
      content: "Somos el centro deportivo líder en Victoria Hernandez, comprometidos con la excelencia y el bienestar de nuestra comunidad.",
      order: 1
    },
    {
      title: "Horarios",
      description: "Abierto todos los días para tu comodidad",
      icon: "fas fa-clock",
      content: "Lunes a Viernes: 5:00 - 23:00\nSábados y Domingos: 6:00 - 22:00\nFeriados: 8:00 - 20:00",
      order: 2
    },
    {
      title: "Ubicación",
      description: "Fácil acceso y amplio estacionamiento",
      icon: "fas fa-map-marker-alt",
      content: "Av. Principal #123, Victoria Hernandez, Andalucía, España\nZona deportiva central con transporte público",
      order: 3
    },
    {
      title: "Contacto",
      description: "Estamos aquí para ayudarte",
      icon: "fas fa-phone",
      content: "Teléfono: +34 123 456 789\nWhatsApp: +34 123 456 789\nEmail: info@polideportivovictoriahernandez.es",
      order: 4
    }
  ];

  // Crear info cards
  for (const cardData of infoCardsData) {
    try {
      await prisma.landingInfoCard.create({
        data: cardData,
      });
      console.log(`✅ Info Card "${cardData.title}" creada`);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`⚠️  Info Card "${cardData.title}" ya existe`);
      } else {
        console.error(`❌ Error creando info card "${cardData.title}":`, error);
      }
    }
  }

  console.log('🎉 Seed de info cards completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
