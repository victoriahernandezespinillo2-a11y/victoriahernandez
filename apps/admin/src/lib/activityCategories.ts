// Configuración de categorías por tipo de actividad
export const ACTIVITY_CATEGORIES = {
  MAINTENANCE: {
    label: 'Tipo de Mantenimiento',
    options: [
      { value: 'CLEANING', label: 'Limpieza' },
      { value: 'REPAIR', label: 'Reparación' },
      { value: 'INSPECTION', label: 'Inspección' },
      { value: 'RENOVATION', label: 'Renovación' },
    ]
  },
  TRAINING: {
    label: 'Tipo de Entrenamiento',
    options: [
      { value: 'FOOTBALL', label: 'Fútbol' },
      { value: 'BASKETBALL', label: 'Baloncesto' },
      { value: 'TENNIS', label: 'Tenis' },
      { value: 'VOLLEYBALL', label: 'Voleibol' },
      { value: 'SWIMMING', label: 'Natación' },
      { value: 'ATHLETICS', label: 'Atletismo' },
      { value: 'GYM', label: 'Gimnasio' },
      { value: 'OTHER', label: 'Otro' },
    ]
  },
  CLASS: {
    label: 'Tipo de Clase',
    options: [
      { value: 'YOGA', label: 'Yoga' },
      { value: 'PILATES', label: 'Pilates' },
      { value: 'ZUMBA', label: 'Zumba' },
      { value: 'AEROBICS', label: 'Aeróbicos' },
      { value: 'DANCE', label: 'Baile' },
      { value: 'MARTIAL_ARTS', label: 'Artes Marciales' },
      { value: 'FITNESS', label: 'Fitness' },
      { value: 'OTHER', label: 'Otro' },
    ]
  },
  WARMUP: {
    label: 'Tipo de Calentamiento',
    options: [
      { value: 'GENERAL', label: 'General' },
      { value: 'SPECIFIC', label: 'Específico' },
      { value: 'DYNAMIC', label: 'Dinámico' },
      { value: 'STATIC', label: 'Estático' },
      { value: 'OTHER', label: 'Otro' },
    ]
  },
  EVENT: {
    label: 'Tipo de Evento',
    options: [
      { value: 'TOURNAMENT', label: 'Torneo' },
      { value: 'COMPETITION', label: 'Competición' },
      { value: 'EXHIBITION', label: 'Exhibición' },
      { value: 'FESTIVAL', label: 'Festival' },
      { value: 'CEREMONY', label: 'Ceremonia' },
      { value: 'OTHER', label: 'Otro' },
    ]
  },
  MEETING: {
    label: 'Tipo de Reunión',
    options: [
      { value: 'STAFF', label: 'Personal' },
      { value: 'BOARD', label: 'Directiva' },
      { value: 'TRAINING', label: 'Capacitación' },
      { value: 'PLANNING', label: 'Planificación' },
      { value: 'OTHER', label: 'Otro' },
    ]
  },
  OTHER: {
    label: 'Categoría Específica',
    options: [
      { value: 'CUSTOM', label: 'Personalizada' },
    ]
  }
} as const;

// Función para obtener las categorías de un tipo de actividad
export const getActivityCategories = (activityType: string) => {
  return ACTIVITY_CATEGORIES[activityType as keyof typeof ACTIVITY_CATEGORIES] || ACTIVITY_CATEGORIES.OTHER;
};

// Función para obtener el label del campo de categoría
export const getCategoryFieldLabel = (activityType: string) => {
  return getActivityCategories(activityType).label;
};

// Función para obtener las opciones de categoría
export const getCategoryOptions = (activityType: string) => {
  return getActivityCategories(activityType).options;
};







