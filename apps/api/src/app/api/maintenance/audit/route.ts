import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const sp = req.nextUrl.searchParams;
      const centerId = sp.get('centerId') || undefined;
      const tz = sp.get('tz') || 'Europe/Madrid';
      const nowStr = sp.get('now');
      const includeNonIssues = sp.get('includeNonIssues') === 'true';
      const fromStr = sp.get('from') || undefined;
      const toStr = sp.get('to') || undefined;
      const now = nowStr ? new Date(nowStr) : new Date();

      const includeStatesParam = sp.get('includeStates');
      const includeStates = includeStatesParam
        ? includeStatesParam.split(',').map(s => s.trim()).filter(Boolean)
        : ['SCHEDULED'];

      const where: any = {};
      if (includeStates.length && !includeStates.includes('ALL')) {
        where.status = { in: includeStates as any };
      }
      if (centerId) where.court = { centerId };

      const whereDate: any = {};
      if (fromStr) whereDate.gte = new Date(fromStr);
      if (toStr) whereDate.lte = new Date(toStr);

      const items = await db.maintenanceSchedule.findMany({
        where,
        include: { court: { include: { center: true } } },
        orderBy: { scheduledAt: 'asc' },
        ...(fromStr || toStr ? { where: { ...where, scheduledAt: whereDate } } : {}),
      });

      const issues: any[] = [];
      for (const m of items) {
        const localTz = (m as any).court?.center?.timezone || ((m as any).court?.center?.settings as any)?.timezone || tz;
        const local = utcToZonedTime(m.scheduledAt, localTz);
        const weekday = local.getDay() === 0 ? 7 : local.getDay();
        const hhmm = formatInTimeZone(local, localTz, 'HH:mm');
        const ymd = formatInTimeZone(local, localTz, 'yyyy-MM-dd');

        const anomalies: string[] = [];
        if (m.estimatedDuration && (m.estimatedDuration < 15 || m.estimatedDuration > 600)) {
          anomalies.push(`duración fuera de rango: ${m.estimatedDuration} min`);
        }
        const isPast = m.scheduledAt < now;
        // Chequeo simple: fecha pasada pero status SCHEDULED
        if (isPast && m.status === 'SCHEDULED') {
          anomalies.push('programada en el pasado (posible vencida)');
        }

        if (anomalies.length || includeNonIssues) {
          issues.push({
            id: m.id,
            seriesId: (m as any).seriesId || null,
            court: (m as any).court?.name,
            dateLocal: `${ymd} ${hhmm}`,
            timezone: localTz,
            weekday,
            duration: m.estimatedDuration,
            isPast,
            anomalies,
          });
        }
      }

      return ApiResponse.success({
        totalChecked: items.length,
        issuesCount: issues.length,
        issues,
      });
    } catch (error) {
      console.error('Error en auditoría de mantenimiento:', error);
      return ApiResponse.internalError('Error auditando mantenimientos');
    }
  })(request);
}


