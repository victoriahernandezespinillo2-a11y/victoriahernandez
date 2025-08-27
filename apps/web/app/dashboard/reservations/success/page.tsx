'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Calendar, Clock, MapPin, CreditCard, Download, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

interface ReservationDetails {
  id: string;
  courtName: string;
  sportName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalPrice: number;
  paymentMethod: string;
  status: string;
  centerName?: string;
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('reservationId');
  
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservationId) {
      setError('ID de reserva no encontrado');
      setLoading(false);
      return;
    }

    const fetchReservationDetails = async () => {
      try {
        const response = await api.reservations.getById(reservationId);
        console.log('API Response:', response); // Debug log
        
        // La respuesta puede venir como { reservation: {...} } o directamente como {...}
        const reservationData = response?.reservation || response;
        
        if (reservationData) {
          // Validar que tenemos los campos necesarios
          if (!reservationData.id || !reservationData.startTime) {
            throw new Error('Datos de reserva incompletos');
          }
          
          setReservation({
            id: reservationData.id,
            courtName: reservationData.court?.name || 'Cancha no especificada',
            sportName: reservationData.court?.sport || 'Deporte no especificado',
            date: new Date(reservationData.startTime).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            startTime: new Date(reservationData.startTime).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            endTime: new Date(reservationData.endTime).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            duration: Math.round((new Date(reservationData.endTime).getTime() - new Date(reservationData.startTime).getTime()) / (1000 * 60 * 60)),
            totalPrice: Number(reservationData.totalPrice || 0),
            paymentMethod: reservationData.paymentMethod || 'Tarjeta',
            status: reservationData.status || 'PAID',
            centerName: reservationData.court?.center?.name
          });
        } else {
          throw new Error('No se encontraron datos de la reserva');
        }
      } catch (err) {
        console.error('Error fetching reservation:', err);
        setError(`No se pudieron cargar los detalles de la reserva: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchReservationDetails();
  }, [reservationId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <CheckCircle className="h-16 w-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/dashboard/reservations"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Volver a Reservas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Pago Exitoso!
          </h1>
          <p className="text-lg text-gray-600">
            Tu reserva ha sido confirmada y el pago procesado correctamente
          </p>
        </div>

        {/* Reservation Details Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="bg-green-50 px-6 py-4 border-b border-green-100">
            <h2 className="text-xl font-semibold text-green-800">
              Detalles de tu Reserva
            </h2>
            <p className="text-sm text-green-600 mt-1">
              ID: {reservation.id}
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Court and Sport */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {reservation.courtName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {reservation.sportName}
                    </p>
                    {reservation.centerName && (
                      <p className="text-xs text-gray-400">
                        {reservation.centerName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {reservation.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {reservation.startTime} - {reservation.endTime}
                    </p>
                    <p className="text-sm text-gray-500">
                      Duración: {reservation.duration} hora{reservation.duration !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Método de Pago
                    </p>
                    <p className="text-sm text-gray-500">
                      {reservation.paymentMethod}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">
                      Total Pagado
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(reservation.totalPrice)}
                    </span>
                  </div>
                </div>

                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Pagado
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Próximos Pasos
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <span>Recibirás un email de confirmación con todos los detalles</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <span>Llega 10 minutos antes de tu horario reservado</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <span>Presenta tu ID de reserva en recepción</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard/reservations"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Ver Mis Reservas
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          
          <Link
            href="/dashboard/reservations/new"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium"
          >
            Nueva Reserva
          </Link>
          
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            <Download className="mr-2 h-4 w-4" />
            Descargar Comprobante
          </button>
        </div>

        {/* Fin contenido principal */}
      </div>
    </div>
  );
}