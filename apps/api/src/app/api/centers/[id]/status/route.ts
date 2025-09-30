import { NextRequest } from 'next/server';
import { ApiResponse, withCors } from '@/lib/middleware';
import { db } from '@repo/db';

/**
 * GET /api/centers/[id]/status
 * Devuelve si el centro está abierto/cerrado según operatingHours y timezone
 * { open: boolean, status: 'OPEN'|'CLOSED', nowLocal: string, nextChangeAt?: string }
 */
export async function GET(request: NextRequest) {
  return withCors(async (req) => {
    try {
      const segments = req.nextUrl.pathname.split('/');
      const idx = segments.findIndex((s) => s === 'centers');
      const id = idx !== -1 && segments[idx + 1] ? segments[idx + 1] : '';
      if (!id) return ApiResponse.badRequest('ID de centro requerido');

      const center = await db.center.findUnique({ where: { id }, select: { timezone: true, settings: true } });
      if (!center) return ApiResponse.notFound('Centro no encontrado');

      const tz = (center.timezone as string) || (center.settings as any)?.timezone || 'Europe/Madrid';
      const settings: any = (center.settings as any) || {};
      const operatingHours: any = settings.operatingHours || settings.business_hours;

      const now = new Date();
      // Obtener partes locales con Intl API (sin dependencias)
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      }).formatToParts(now).map(p => [p.type, p.value]));
      const weekday = new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`).getUTCDay();
      const dayMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
      const key = dayMap[weekday];

      let isOpen = false;
      let nextChangeAt: string | undefined;

      if (operatingHours && key && (operatingHours as any)[key]) {
        const cfg = (operatingHours as any)[key] as { open?: string; close?: string; closed?: boolean };
        if (!cfg.closed && typeof cfg.open === 'string' && typeof cfg.close === 'string') {
          // Construir timestamps locales comparables usando Intl (sin mutar TZ real)
          const toUtc = (hhmm: string) => {
            const [hh, mm] = hhmm.split(':').map((n: string) => Number(n));
            const localIso = `${parts.year}-${parts.month}-${parts.day}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`;
            // Interpretar como hora en tz y convertir a UTC ISO string para comparación
            const date = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(localIso)));
            // Fallback simple: crear Date a partir de localIso y ajustar por offset aproximado
            return new Date(`${localIso}:00Z`);
          };

          const openUTC = toUtc(cfg.open);
          const closeUTC = toUtc(cfg.close);
          const nowUTC = now;
          isOpen = nowUTC >= openUTC && nowUTC < closeUTC;
          nextChangeAt = (isOpen ? closeUTC : openUTC).toISOString();
        }
      }

      return ApiResponse.success({
        open: isOpen,
        status: isOpen ? 'OPEN' : 'CLOSED',
        nowLocal: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`,
        timezone: tz,
        nextChangeAt,
      });
    } catch (error) {
      console.error('Error calculando estado de centro:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }


