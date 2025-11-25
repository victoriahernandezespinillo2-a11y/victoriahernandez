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
  promoCode?: string;
  promoDiscount?: number;
  creditsUsed?: number;
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
          
          // Validar que totalPrice existe y es válido
          if (!reservationData.totalPrice && reservationData.totalPrice !== 0) {
            console.warn('⚠️ [SUCCESS-PAGE] totalPrice no encontrado en la respuesta, intentando calcular desde pricing...');
            // Si no hay totalPrice, intentar obtenerlo del pricing si está disponible
            if (response?.pricing?.total) {
              reservationData.totalPrice = response.pricing.total;
            }
          }
          
          // Calcular duración en minutos y luego convertir a horas (redondeando correctamente)
          const startTime = new Date(reservationData.startTime);
          const endTime = new Date(reservationData.endTime);
          const durationInMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
          const durationInHours = durationInMinutes / 60; // Mantener decimales para mostrar correctamente (ej: 1.5 horas)
          
          setReservation({
            id: reservationData.id,
            courtName: reservationData.court?.name || 'Cancha no especificada',
            // El campo 'sport' está directamente en la reserva, no en court.sport
            sportName: reservationData.sport || reservationData.court?.sportType || 'Deporte no especificado',
            date: startTime.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            startTime: startTime.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            endTime: endTime.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            duration: durationInHours, // Usar horas con decimales (ej: 1.5)
            totalPrice: Number(reservationData.totalPrice || 0),
            paymentMethod: reservationData.paymentMethod || 'Tarjeta',
            status: reservationData.status || 'PAID',
            centerName: reservationData.court?.center?.name,
            promoCode: reservationData.promoCode,
            promoDiscount: Number(reservationData.promoDiscount || 0),
            creditsUsed: Number(reservationData.creditsUsed || 0)
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
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Determinar el tipo de mensaje según el método de pago
  const isOnSitePayment = reservation?.paymentMethod === 'ONSITE';
  const isPaid = reservation?.status === 'PAID';
  
  // Calcular el monto final pagado (considerando descuentos)
  const getFinalAmountPaid = () => {
    if (!reservation) return 0;
    
    // Si hay descuento promocional, restarlo del precio original
    if (reservation.promoDiscount && reservation.promoDiscount > 0) {
      return reservation.totalPrice - reservation.promoDiscount;
    }
    
    // Si se pagó con créditos, usar el totalPrice (que ya está en euros)
    // Los créditos usados son solo para mostrar información, no para calcular el monto
    if (reservation.paymentMethod === 'CREDITS') {
      return reservation.totalPrice; // totalPrice ya está en euros
    }
    
    // En otros casos, usar el precio total
    return reservation.totalPrice;
  };
  
  const finalAmountPaid = getFinalAmountPaid();
  const hasPromoDiscount = reservation?.promoDiscount && reservation.promoDiscount > 0;

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
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            isOnSitePayment ? 'bg-orange-100' : 'bg-green-100'
          }`}>
            <CheckCircle className={`h-10 w-10 ${isOnSitePayment ? 'text-orange-600' : 'text-green-600'}`} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isOnSitePayment ? '¡Reserva Creada!' : '¡Pago Exitoso!'}
          </h1>
          <p className="text-lg text-gray-600">
            {isOnSitePayment 
              ? 'Tu reserva ha sido creada. Debes pagar en el centro deportivo antes de usar la cancha.'
              : 'Tu reserva ha sido confirmada y el pago procesado correctamente'
            }
          </p>
          {isOnSitePayment && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>Importante:</strong> Presenta este comprobante en el centro deportivo para completar tu pago y acceder a la cancha.
              </p>
            </div>
          )}
        </div>

        {/* Reservation Details Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className={`px-6 py-4 border-b ${
            isOnSitePayment 
              ? 'bg-orange-50 border-orange-100' 
              : 'bg-green-50 border-green-100'
          }`}>
            <h2 className={`text-xl font-semibold ${
              isOnSitePayment ? 'text-orange-800' : 'text-green-800'
            }`}>
              Detalles de tu Reserva
            </h2>
            <p className={`text-sm mt-1 ${
              isOnSitePayment ? 'text-orange-600' : 'text-green-600'
            }`}>
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
                      Duración: {reservation.duration > 0 ? reservation.duration.toFixed(1).replace(/\.0$/, '') : '1'} hora{reservation.duration !== 1 ? 's' : ''}
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

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {/* Precio original (si hay descuento) */}
                  {hasPromoDiscount && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Precio Original</span>
                      <span className="text-gray-500 line-through">
                        {formatCurrency(reservation.totalPrice)}
                      </span>
                    </div>
                  )}
                  
                  {/* Descuento aplicado */}
                  {hasPromoDiscount && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        Descuento {reservation.promoCode && `(${reservation.promoCode})`}
                      </span>
                      <span className="text-red-600 font-medium">
                        -{formatCurrency(reservation.promoDiscount || 0)}
                      </span>
                    </div>
                  )}
                  
                  {/* Total final */}
                  <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                    <span className="text-sm font-medium text-gray-900">
                      {isOnSitePayment ? 'Total a Pagar' : 'Total Pagado'}
                    </span>
                    <span className={`text-lg font-bold ${
                      isOnSitePayment ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(finalAmountPaid)}
                    </span>
                  </div>
                  
                  {/* Información adicional para pagos con créditos */}
                  {reservation.paymentMethod === 'CREDITS' && reservation.creditsUsed && reservation.creditsUsed > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Pagado con {reservation.creditsUsed} crédito{reservation.creditsUsed !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    isOnSitePayment 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {isOnSitePayment ? '⏳ Pendiente de Pago' : '✓ Pagado'}
                  </div>
                  
                  {/* Badge de promoción aplicada */}
                  {hasPromoDiscount && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      🎁 Descuento Aplicado ({reservation.promoCode})
                    </div>
                  )}
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