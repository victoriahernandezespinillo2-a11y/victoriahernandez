// Re-exportar db de @repo/db para mantener compatibilidad
// Esto asegura que todos usen la misma instancia de PrismaClient
// con la configuración correcta de URL (sin Data Proxy)
import { db } from '@repo/db';

export const prisma = db;
