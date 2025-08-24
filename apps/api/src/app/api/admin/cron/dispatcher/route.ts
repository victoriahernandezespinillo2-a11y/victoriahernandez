export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/middleware';

/**
 * Cron dispatcher que ejecuta múltiples tareas secuencialmente
 * - /api/admin/cron/reservations/cleanup-pending
 * - /api/admin/cron/reservations/reminders
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if ((process.env.CRON_SECRET || '') && secret !== process.env.CRON_SECRET) {
    return ApiResponse.unauthorized('No autorizado');
  }

  const origin = request.nextUrl.origin;

  async function runTask(path: string) {
    const url = `${origin}${path}${secret ? `?secret=${encodeURIComponent(secret)}` : ''}`;
    const startedAt = new Date();
    try {
      const res = await fetch(url, {
        // Identificador explícito para logs y diagnósticos
        headers: { 'user-agent': 'vercel-cron/dispatcher' },
        // No seguir redirects; Vercel Cron no las sigue
        redirect: 'manual',
      });
      let body: any = null;
      try { body = await res.json(); } catch {}
      return {
        path,
        ok: res.ok,
        status: res.status,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        body,
      };
    } catch (error: any) {
      return {
        path,
        ok: false,
        status: 500,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        error: { message: error?.message, name: error?.name },
      };
    }
  }

  // Ejecutar secuencialmente para evitar solapes de recursos
  const results: any[] = [];
  results.push(await runTask('/api/admin/cron/reservations/cleanup-pending'));
  results.push(await runTask('/api/admin/cron/reservations/reminders'));

  return ApiResponse.success({
    success: true,
    ran: results,
    timestamp: new Date().toISOString(),
  });
}