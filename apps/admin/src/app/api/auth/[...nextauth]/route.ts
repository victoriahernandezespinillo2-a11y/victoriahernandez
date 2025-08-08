import { handlers } from '@repo/auth';

// Usar la configuración compartida de autenticación
export const runtime = 'nodejs';
export const { GET, POST } = handlers;