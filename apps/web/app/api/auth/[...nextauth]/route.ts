import NextAuth from 'next-auth';
import { webAuthConfig } from '@repo/auth';

// Inicializar NextAuth con la configuración específica de la app Web
const nextAuth = NextAuth(webAuthConfig);

// Extraer los handlers GET y POST generados
export const { GET, POST } = nextAuth.handlers as any;