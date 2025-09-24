'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSession } from 'next-auth/react';

interface ReservationDetails {
  id: string;
  status: string;
  paymentStatus: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  notes?: string;
  user?: { id: string; name?: string; email?: string };
  court?: { 
    id: string; 
    name: string; 
    center?: { 
      id: string; 
      name: string; 
    } 
  };
}

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionResult = useSession();
  const session = sessionResult?.data || null;
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
        
        // Verificar que tenemos session o al menos un ID de reserva válido
        if (!reservationId) {
          throw new Error('ID de reserva no proporcionado');
        }
        
        console.log('🔄 Cargando reserva:', reservationId);
        const res = await api.reservations.getById(reservationId);
        
        if (!isMounted) return;
        
        if (!res) {
          throw new Error('Reserva no encontrada');
        }
        
        console.log('✅ Reserva cargada exitosamente:', res);
        setData(res as any);
      } catch (e: any) {
        console.error('❌ Error cargando reserva:', e);
        if (!isMounted) return;
        setError(e?.message || 'Error cargando la reserva');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    if (reservationId) {
      // Pequeño delay para asegurar que la sesión esté cargada
      const timer = setTimeout(load, 100);
      return () => {
        clearTimeout(timer);
        isMounted = false;
      };
    }
    
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
          <button 
            onClick={() => router.push('/dashboard/reservations')} 
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Volver a Mis Reservas
          </button>
        </div>
        <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>
      </div>
    );
  }

  const start = data?.startTime ? new Date(data.startTime) : null;
  const end = data?.endTime ? new Date(data.endTime) : null;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Detalle de Reserva</h1>
        <button 
          onClick={() => router.push('/dashboard/reservations')} 
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← Volver a Mis Reservas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Información de la Reserva</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <div><span className="font-medium">ID:</span> {data?.id || '—'}</div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Estado:</span> 
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(data?.status || '')}`}>
                {data?.status || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Pago:</span> 
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(data?.paymentStatus || '')}`}>
                {data?.paymentStatus || '—'}
              </span>
            </div>
            <div><span className="font-medium">Inicio:</span> {start ? start.toLocaleString('es-ES') : '—'}</div>
            <div><span className="font-medium">Fin:</span> {end ? end.toLocaleString('es-ES') : '—'}</div>
            <div><span className="font-medium">Precio:</span> €{data?.totalPrice || '—'}</div>
            <div><span className="font-medium">Notas:</span> {data?.notes || '—'}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Detalles del Centro</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <div><span className="font-medium">Centro:</span> {data?.court?.center?.name || '—'}</div>
            <div><span className="font-medium">Cancha:</span> {data?.court?.name || '—'}</div>
            <div><span className="font-medium">Usuario:</span> {data?.user?.name || data?.user?.email || '—'}</div>
            <div><span className="font-medium">Email:</span> {data?.user?.email || '—'}</div>
          </div>
        </div>
      </div>

      {/* Acciones adicionales */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Acciones</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/dashboard/reservations')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Ver Todas las Reservas
          </button>
          
          {data?.status === 'PAID' && (
            <button
              onClick={() => router.push(`/dashboard/reservations/${reservationId}/pass`)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Ver Pase Digital
            </button>
          )}
          
          {data?.status === 'IN_PROGRESS' && (
            <div className="flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
              Reserva en curso
            </div>
          )}
          
          {data?.status === 'COMPLETED' && (
            <div className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-md">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Reserva completada
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
