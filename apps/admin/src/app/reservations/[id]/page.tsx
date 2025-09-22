'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

type ReservationDetails = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  notes?: string;
  user?: { id: string; name?: string; email?: string };
  court?: { id: string; name?: string; center?: { id: string; name?: string } };
};

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const reservationId = params?.id as string;

  const [data, setData] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await adminApi.reservations.getById(reservationId);
        if (!isMounted) return;
        setData(res as any);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || 'Error cargando la reserva');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (reservationId) load();
    return () => { isMounted = false; };
  }, [reservationId]);

  if (!reservationId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Reserva</h1>
        <p className="mt-2 text-gray-600">ID de reserva no proporcionado.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Cargando reserva…</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Detalle de reserva</h1>
          <button onClick={() => router.push('/reservations')} className="text-sm text-blue-600 hover:text-blue-800">← Volver</button>
        </div>
        <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>
      </div>
    );
  }

  const start = data?.startTime ? new Date(data.startTime) : null;
  const end = data?.endTime ? new Date(data.endTime) : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Reserva #{reservationId}</h1>
        <button onClick={() => router.push('/reservations')} className="text-sm text-blue-600 hover:text-blue-800">← Volver</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Información</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <div><span className="font-medium">Estado:</span> {data?.status || '—'}</div>
            <div><span className="font-medium">Inicio:</span> {start ? start.toLocaleString('es-ES') : '—'}</div>
            <div><span className="font-medium">Fin:</span> {end ? end.toLocaleString('es-ES') : '—'}</div>
            <div><span className="font-medium">Notas:</span> {data?.notes || '—'}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Usuario y cancha</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <div><span className="font-medium">Usuario:</span> {data?.user?.name || data?.user?.email || '—'}</div>
            <div><span className="font-medium">Email:</span> {data?.user?.email || '—'}</div>
            <div><span className="font-medium">Cancha:</span> {data?.court?.name || '—'}</div>
            <div><span className="font-medium">Centro:</span> {data?.court?.center?.name || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}














































