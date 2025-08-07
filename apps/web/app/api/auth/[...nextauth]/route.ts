import { handlers } from '@repo/auth';

// Configurar para usar Node.js Runtime en lugar de Edge Runtime
export const runtime = 'nodejs';

export const { GET, POST } = handlers;