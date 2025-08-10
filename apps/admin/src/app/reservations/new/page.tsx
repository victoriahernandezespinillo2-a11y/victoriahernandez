"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAdminCourts, useAdminCenters } from '@/lib/hooks';

export default function AdminNewReservationPage() {
  const { courts, getCourts } = useAdminCourts();
  const { centers, getCenters } = useAdminCenters();
  const [centerId, setCenterId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCenters({ page: 1, limit: 100 }).catch(() => {});
    getCourts({ includeStats: false, page: 1, limit: 500 }).catch(() => {});
  }, [getCenters, getCourts]);

  const filteredCourts = useMemo(() => {
    const list = Array.isArray(courts) ? courts : [];
    return centerId ? list.filter((c: any) => c.centerId === centerId) : list;
  }, [courts, centerId]);

  const handleCreate = async () => {
    try {
      setError(null);
      if (!courtId || !date || !time) {
        setError('Selecciona cancha, fecha y hora');
        return;
      }
      const [hour, minute] = time.split(':').map(Number);
      const start = new Date(date + 'T00:00:00');
      start.setHours(hour, minute, 0, 0);

      setIsSubmitting(true);
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courtId, startTime: start.toISOString(), duration, notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (Array.isArray(body?.details) && body.details.length > 0) {
          const first = body.details[0];
          throw new Error(`${body.error}: ${first.field} - ${first.message}`);
        }
        if (body?.stack) {
          throw new Error(`${body?.error}`);
        }
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      window.location.href = '/reservations';
    } catch (e: any) {
      setError(e?.message || 'Error creando la reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nueva Reserva (Manual)</h1>
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded">{error}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Centro</label>
          <select value={centerId} onChange={(e) => setCenterId(e.target.value)} className="w-full border rounded px-3 py-2">
            <option value="">Todos</option>
            {(Array.isArray(centers) ? centers : []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Cancha</label>
          <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className="w-full border rounded px-3 py-2">
            <option value="">Selecciona</option>
            {filteredCourts.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Fecha</label>
          <input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Hora</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Duración</label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full border rounded px-3 py-2">
            <option value={60}>1 hora</option>
            <option value={90}>1.5 horas</option>
            <option value={120}>2 horas</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700 mb-1">Notas</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => (window.location.href = '/reservations')} className="px-4 py-2 border rounded">Cancelar</button>
        <button onClick={handleCreate} disabled={isSubmitting || !courtId || !date || !time} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {isSubmitting ? 'Creando...' : 'Crear Reserva'}
        </button>
      </div>
    </div>
  );
}


