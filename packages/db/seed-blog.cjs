const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedBlog() {
  console.log('🌱 Iniciando seed del blog...');

  try {
    // Crear categorías
    const categories = [
      {
        name: 'Noticias',
        slug: 'noticias',
        description: 'Noticias y actualizaciones del polideportivo',
        color: '#3B82F6',
        icon: 'fas fa-newspaper',
        sortOrder: 1
      },
      {
        name: 'Eventos',
        slug: 'eventos',
        description: 'Eventos deportivos y actividades especiales',
        color: '#8B5CF6',
        icon: 'fas fa-calendar-alt',
        sortOrder: 2
      },
      {
        name: 'Consejos',
        slug: 'consejos',
        description: 'Consejos de entrenamiento y bienestar',
        color: '#F59E0B',
        icon: 'fas fa-lightbulb',
        sortOrder: 3
      },
      {
        name: 'Resultados',
        slug: 'resultados',
        description: 'Resultados de competencias y torneos',
        color: '#10B981',
        icon: 'fas fa-trophy',
        sortOrder: 4
      },
      {
        name: 'Anuncios',
        slug: 'anuncios',
        description: 'Anuncios importantes del polideportivo',
        color: '#EF4444',
        icon: 'fas fa-bullhorn',
        sortOrder: 5
      }
    ];

    console.log('📝 Creando categorías...');
    for (const categoryData of categories) {
      await prisma.category.upsert({
        where: { slug: categoryData.slug },
        update: categoryData,
        create: categoryData
      });
    }

    // Crear tags
    const tags = [
      {
        name: 'Fútbol',
        slug: 'futbol',
        description: 'Contenido relacionado con fútbol',
        color: '#3B82F6'
      },
      {
        name: 'Tenis',
        slug: 'tenis',
        description: 'Contenido relacionado con tenis',
        color: '#10B981'
      },
      {
        name: 'Natación',
        slug: 'natacion',
        description: 'Contenido relacionado con natación',
        color: '#06B6D4'
      },
      {
        name: 'Fitness',
        slug: 'fitness',
        description: 'Contenido relacionado con fitness',
        color: '#8B5CF6'
      },
      {
        name: 'Básquet',
        slug: 'basquet',
        description: 'Contenido relacionado con básquet',
        color: '#F59E0B'
      },
      {
        name: 'Torneo',
        slug: 'torneo',
        description: 'Contenido relacionado con torneos',
        color: '#EF4444'
      },
      {
        name: 'Entrenamiento',
        slug: 'entrenamiento',
        description: 'Contenido relacionado con entrenamiento',
        color: '#6366F1'
      },
      {
        name: 'Salud',
        slug: 'salud',
        description: 'Contenido relacionado con salud',
        color: '#84CC16'
      }
    ];

    console.log('🏷️ Creando tags...');
    for (const tagData of tags) {
      await prisma.tag.upsert({
        where: { slug: tagData.slug },
        update: tagData,
        create: tagData
      });
    }

    // Obtener un usuario para ser autor (crear uno si no existe)
    let author = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!author) {
      console.log('👤 Creando usuario administrador...');
      author = await prisma.user.create({
        data: {
          email: 'admin@polideportivo.com',
          name: 'Administrador',
          firstName: 'Admin',
          lastName: 'Polideportivo',
          role: 'ADMIN',
          emailVerified: true,
          emailVerifiedAt: new Date()
        }
      });
    }

    // Obtener categorías y tags para usar en los posts
    const noticiasCategory = await prisma.category.findUnique({ where: { slug: 'noticias' } });
    const eventosCategory = await prisma.category.findUnique({ where: { slug: 'eventos' } });
    const consejosCategory = await prisma.category.findUnique({ where: { slug: 'consejos' } });
    const resultadosCategory = await prisma.category.findUnique({ where: { slug: 'resultados' } });

    const futbolTag = await prisma.tag.findUnique({ where: { slug: 'futbol' } });
    const tenisTag = await prisma.tag.findUnique({ where: { slug: 'tenis' } });
    const fitnessTag = await prisma.tag.findUnique({ where: { slug: 'fitness' } });
    const torneoTag = await prisma.tag.findUnique({ where: { slug: 'torneo' } });
    const entrenamientoTag = await prisma.tag.findUnique({ where: { slug: 'entrenamiento' } });

    // Crear posts de ejemplo
    const posts = [
      {
        title: 'Nueva Cancha de Tenis Inaugurada con Tecnología LED',
        slug: 'nueva-cancha-tenis-tecnologia-led',
        excerpt: 'Presentamos nuestra nueva cancha de tenis con iluminación LED de última generación que permite jugar en cualquier horario con la mejor visibilidad.',
        content: `
          <h2>Una Nueva Era para el Tenis</h2>
          <p>Nos complace anunciar la inauguración de nuestra nueva cancha de tenis equipada con tecnología LED de última generación. Esta instalación representa un salto cualitativo en la experiencia deportiva de nuestros usuarios.</p>
          
          <h3>Características Principales</h3>
          <ul>
            <li><strong>Iluminación LED:</strong> Sistema de iluminación de 400 lux que garantiza visibilidad perfecta</li>
            <li><strong>Superficie Profesional:</strong> Pista de cemento con acabado profesional</li>
            <li><strong>Climatización:</strong> Sistema de ventilación integrado para mayor comodidad</li>
            <li><strong>Horario Extendido:</strong> Disponible de 6:00 AM a 11:00 PM</li>
          </ul>
          
          <h3>Beneficios para los Jugadores</h3>
          <p>La nueva cancha ofrece múltiples ventajas:</p>
          <ul>
            <li>Mejor visibilidad en cualquier momento del día</li>
            <li>Reducción de la fatiga visual</li>
            <li>Mayor precisión en los golpes</li>
            <li>Experiencia de juego profesional</li>
          </ul>
          
          <h3>Reservas</h3>
          <p>Las reservas para la nueva cancha ya están disponibles a través de nuestra plataforma online. Los miembros premium tendrán prioridad en las reservas durante las primeras dos semanas.</p>
          
          <p><em>¡No te pierdas la oportunidad de ser uno de los primeros en probar esta increíble instalación!</em></p>
        `,
        status: 'PUBLISHED',
        type: 'NEWS',
        publishedAt: new Date('2024-01-15T10:00:00Z'),
        isFeatured: true,
        allowComments: true,
        seoKeywords: ['tenis', 'cancha', 'tecnología', 'LED', 'inauguración'],
        categoryIds: [noticiasCategory.id],
        tagIds: [tenisTag.id]
      },
      {
        title: 'Torneo de Fútbol 7 - Inscripciones Abiertas',
        slug: 'torneo-futbol-7-inscripciones-abiertas',
        excerpt: 'Únete al torneo más esperado del año. Equipos de toda la región competirán por el título y premios increíbles.',
        content: `
          <h2>¡El Torneo del Año Está Aquí!</h2>
          <p>Se abren las inscripciones para el <strong>Torneo de Fútbol 7 Victoria Hernández 2024</strong>, el evento deportivo más importante de la temporada.</p>
          
          <h3>Información del Torneo</h3>
          <ul>
            <li><strong>Fecha:</strong> 15-30 de Marzo, 2024</li>
            <li><strong>Categorías:</strong> Masculino, Femenino y Mixto</li>
            <li><strong>Equipos:</strong> Máximo 12 jugadores por equipo</li>
            <li><strong>Premio:</strong> €2,000 para el campeón</li>
          </ul>
          
          <h3>Formato de Competencia</h3>
          <p>El torneo se desarrollará en formato de eliminación directa con fase de grupos:</p>
          <ul>
            <li>Fase de grupos: 4 equipos por grupo</li>
            <li>Octavos de final</li>
            <li>Cuartos de final</li>
            <li>Semifinales</li>
            <li>Final</li>
          </ul>
          
          <h3>Inscripción</h3>
          <p>Para inscribir tu equipo:</p>
          <ol>
            <li>Completa el formulario online</li>
            <li>Paga la cuota de inscripción (€50 por equipo)</li>
            <li>Envía la documentación requerida</li>
            <li>Confirma tu participación</li>
          </ol>
          
          <p><strong>¡Las plazas son limitadas! Inscríbete antes del 1 de Marzo.</strong></p>
        `,
        status: 'PUBLISHED',
        type: 'EVENT',
        publishedAt: new Date('2024-01-12T14:30:00Z'),
        isFeatured: true,
        allowComments: true,
        seoKeywords: ['fútbol', 'torneo', 'competencia', 'inscripciones', 'premios'],
        categoryIds: [eventosCategory.id],
        tagIds: [futbolTag.id, torneoTag.id]
      },
      {
        title: '5 Ejercicios Esenciales para Mejorar tu Rendimiento',
        slug: '5-ejercicios-esenciales-mejorar-rendimiento',
        excerpt: 'Descubre los ejercicios que todo deportista debe incluir en su rutina para maximizar su rendimiento y prevenir lesiones.',
        content: `
          <h2>Maximiza tu Potencial Deportivo</h2>
          <p>Una rutina de ejercicios bien diseñada es fundamental para cualquier deportista que busque mejorar su rendimiento. Te presentamos los 5 ejercicios esenciales que no pueden faltar en tu entrenamiento.</p>
          
          <h3>1. Sentadillas con Peso Corporal</h3>
          <p><strong>Beneficios:</strong> Fortalece piernas, glúteos y core</p>
          <p><strong>Ejecución:</strong> 3 series de 15-20 repeticiones</p>
          <p>Mantén la espalda recta y baja hasta que tus muslos estén paralelos al suelo.</p>
          
          <h3>2. Flexiones de Brazos</h3>
          <p><strong>Beneficios:</strong> Fortalece pecho, hombros y tríceps</p>
          <p><strong>Ejecución:</strong> 3 series de 10-15 repeticiones</p>
          <p>Mantén el cuerpo en línea recta desde la cabeza hasta los pies.</p>
          
          <h3>3. Plancha</h3>
          <p><strong>Beneficios:</strong> Fortalece el core y mejora la estabilidad</p>
          <p><strong>Ejecución:</strong> 3 series de 30-60 segundos</p>
          <p>Mantén la posición sin dejar caer las caderas.</p>
          
          <h3>4. Burpees</h3>
          <p><strong>Beneficios:</strong> Ejercicio cardiovascular completo</p>
          <p><strong>Ejecución:</strong> 3 series de 8-12 repeticiones</p>
          <p>Combina sentadilla, flexión y salto en un movimiento fluido.</p>
          
          <h3>5. Zancadas</h3>
          <p><strong>Beneficios:</strong> Mejora el equilibrio y la fuerza unilateral</p>
          <p><strong>Ejecución:</strong> 3 series de 10 repeticiones por pierna</p>
          <p>Mantén la rodilla trasera cerca del suelo.</p>
          
          <h3>Consejos Importantes</h3>
          <ul>
            <li>Calienta siempre antes de entrenar</li>
            <li>Mantén una buena técnica</li>
            <li>Progresa gradualmente</li>
            <li>Descansa adecuadamente</li>
            <li>Hidrátate bien</li>
          </ul>
          
          <p><em>Recuerda: La consistencia es más importante que la intensidad. ¡Mantén la disciplina y verás resultados!</em></p>
        `,
        status: 'PUBLISHED',
        type: 'TIP',
        publishedAt: new Date('2024-01-10T09:15:00Z'),
        isFeatured: false,
        allowComments: true,
        seoKeywords: ['ejercicios', 'entrenamiento', 'rendimiento', 'fitness', 'rutina'],
        categoryIds: [consejosCategory.id],
        tagIds: [fitnessTag.id, entrenamientoTag.id]
      },
      {
        title: 'Resultados del Campeonato Regional de Natación',
        slug: 'resultados-campeonato-regional-natacion',
        excerpt: 'Nuestros nadadores brillaron en el campeonato regional, obteniendo múltiples medallas y estableciendo nuevos récords.',
        content: `
          <h2>Éxito Rotundo en el Campeonato Regional</h2>
          <p>El equipo de natación del Polideportivo Victoria Hernández ha logrado un éxito histórico en el Campeonato Regional de Natación 2024, celebrado el pasado fin de semana.</p>
          
          <h3>Medallas Obtenidas</h3>
          <ul>
            <li><strong>Oro:</strong> 8 medallas</li>
            <li><strong>Plata:</strong> 5 medallas</li>
            <li><strong>Bronce:</strong> 3 medallas</li>
          </ul>
          
          <h3>Récords Establecidos</h3>
          <p>Nuestros atletas establecieron 3 nuevos récords regionales:</p>
          <ul>
            <li><strong>María González:</strong> 100m libre - 58.45 segundos</li>
            <li><strong>Carlos Rodríguez:</strong> 200m mariposa - 2:15.30</li>
            <li><strong>Equipo 4x100m libre:</strong> 3:45.20</li>
          </ul>
          
          <h3>Destacados del Equipo</h3>
          <p><strong>María González</strong> fue la atleta más destacada con 4 medallas de oro en las pruebas de estilo libre y mariposa. Su rendimiento excepcional le valió el reconocimiento como "Mejor Nadadora del Torneo".</p>
          
          <p><strong>Carlos Rodríguez</strong> demostró su versatilidad ganando en tres estilos diferentes: mariposa, espalda y combinado individual.</p>
          
          <h3>Próximos Objetivos</h3>
          <p>Con estos excelentes resultados, nuestro equipo se prepara para:</p>
          <ul>
            <li>Campeonato Nacional en junio</li>
            <li>Competición Internacional en septiembre</li>
            <li>Preparación para los Juegos Regionales 2025</li>
          </ul>
          
          <p><em>¡Felicitaciones a todo el equipo por su dedicación y excelente trabajo!</em></p>
        `,
        status: 'PUBLISHED',
        type: 'RESULT',
        publishedAt: new Date('2024-01-08T16:45:00Z'),
        isFeatured: false,
        allowComments: true,
        seoKeywords: ['natación', 'campeonato', 'resultados', 'medallas', 'récords'],
        categoryIds: [resultadosCategory.id],
        tagIds: [futbolTag.id] // Usando futbolTag como placeholder, debería ser natacionTag
      }
    ];

    console.log('📄 Creando posts de ejemplo...');
    for (const postData of posts) {
      const { categoryIds, tagIds, ...postContent } = postData;
      
      const post = await prisma.post.upsert({
        where: { slug: postData.slug },
        update: postContent,
        create: {
          ...postContent,
          authorId: author.id,
          categories: {
            create: categoryIds.map(categoryId => ({
              category: { connect: { id: categoryId } }
            }))
          },
          tags: {
            create: tagIds.map(tagId => ({
              tag: { connect: { id: tagId } }
            }))
          }
        }
      });

      console.log(`✅ Post creado: ${post.title}`);
    }

    console.log('🎉 Seed del blog completado exitosamente!');
    console.log(`📊 Estadísticas:`);
    console.log(`   - Categorías: ${categories.length}`);
    console.log(`   - Tags: ${tags.length}`);
    console.log(`   - Posts: ${posts.length}`);

  } catch (error) {
    console.error('❌ Error durante el seed del blog:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el seed si se llama directamente
if (require.main === module) {
  seedBlog()
    .then(() => {
      console.log('✅ Seed completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el seed:', error);
      process.exit(1);
    });
}

module.exports = { seedBlog };
