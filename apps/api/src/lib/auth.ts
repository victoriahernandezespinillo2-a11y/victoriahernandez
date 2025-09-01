import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@repo/db';
import AuthService from './services/auth.service';

const authService = new AuthService();

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  // 1. Intentar con JWT Bearer Token
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = await authService.getUserFromToken(token);
    if (user) return user;
  }

  // 2. Intentar con cookie de NextAuth
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (token && token.id) {
    const user = await db.user.findUnique({ where: { id: token.id as string } });
    if (user && user.isActive) return user;
  }

  return null;
}
