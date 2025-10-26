"use client";

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';

interface WeekCalendarProps {
  courtId: string;
  weekStartISO: string; // YYYY-MM-DD (lunes)
  slotMinutes?: number; // 30/60
  durationMinutes: number; // duración deseada
  onSelect: (dateISO: string, timeHHMM: string) => void;
}

type DaySlots = { dateISO: string; slots: Array<{ label: string; available: boolean }> };

export default function WeekCalendar({ courtId, weekStartISO, slotMinutes = 60, durationMinutes, onSelect }: WeekCalendarProps) {
  // Añadimos soporte de selección externa (opcional)
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  useEffect(() => {
    // escuchar evento custom para sincronizar selección externa
    const handler = (e: any) => {
      if (e?.detail?.type === 'SELECT_SLOT') {
        setSelectedDateISO(e.detail.dateISO);
        setSelectedTime(e.detail.timeLabel);
      }
    };
    window.addEventListener('admin-reservation-slot', handler as any);
    return () => window.removeEventListener('admin-reservation-slot', handler as any);
  }, []);

  const [data, setData] = useState<DaySlots[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    const start = new Date((weekStartISO || '') + 'T00:00:00');
    const arr: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d.toISOString().split('T')[0] || '');
    }
    return arr;
  }, [weekStartISO]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!courtId) { setData([]); return; }
        setLoading(true);
        setError(null);
        const results: DaySlots[] = [];
        await Promise.all(days.map(async (iso) => {
          try {
            const avail: any = await adminApi.courts.getAvailability(courtId, iso);
            const slots = (avail?.slots || []).map((s: any) => ({
              label: new Date(s.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
              available: !!s.available,
            }));
            results.push({ dateISO: iso, slots });
          } catch {
            results.push({ dateISO: iso, slots: [] });
          }
        }));
        // ordenar por día en orden
        const ordered = results.sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
        setData(ordered);
      } catch (err) {
        setError('No se pudo cargar la disponibilidad semanal');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courtId, days]);

  const timeAxis = useMemo(() => {
    // construir eje horario uniendo etiquetas de cualquier día
    const labels = new Set<string>();
    data.forEach((d) => d.slots.forEach((s) => labels.add(s.label)));
    return Array.from(labels).sort((a, b) => (a < b ? -1 : 1));
  }, [data]);

  if (!courtId) return null;
  if (loading) return <div className="text-sm text-black">Cargando semana…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="border rounded overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left text-black">Hora</th>
            {data.map((d) => (
              <th key={d.dateISO} className="p-2 text-left text-black">
                {new Date(d.dateISO + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeAxis.map((label) => (
            <tr key={label} className="border-t">
              <td className="p-2 font-medium text-black">{label}</td>
              {data.map((d) => {
                const slot = d.slots.find((s) => s.label === label);
                const available = !!slot?.available;
                return (
                  <td key={d.dateISO + label} className="p-1">
                    <button
                      type="button"
                      disabled={!available}
                      onClick={() => onSelect(d.dateISO, label)}
                      className={`w-full rounded px-2 py-1 border ${
                        // Si está seleccionado externamente, destacar con azul
                        selectedDateISO === d.dateISO && selectedTime === label
                          ? 'bg-blue-200 text-blue-900 border-blue-400 ring-2 ring-blue-300'
                          : available 
                            ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' 
                            : 'bg-red-100 text-red-600 border-red-200 cursor-not-allowed'
                      }`}
                    >
                      {available ? 'Libre' : 'Ocupado'}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}






