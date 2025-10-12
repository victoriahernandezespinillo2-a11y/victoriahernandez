'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function PaymentErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [countdown, setCountdown] = useState(10);
  const [errorDetails, setErrorDetails] = useState<{
    code?: string;
    message?: string;
    orderId?: string;
  }>({});

  useEffect(() => {
    // Obtener parámetros de error de Redsys
    const code = searchParams.get('Ds_Response');
    const orderId = searchParams.get('Ds_Order');
    const message = searchParams.get('Ds_Response_Msg');
    
    setErrorDetails({
      code: code || undefined,
      message: message || undefined,
      orderId: orderId || undefined,
    });

    // Countdown para redirigir automáticamente
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/dashboard/reservations');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, searchParams]);

  const handleRetryPayment = () => {
    router.push('/dashboard/reservations');
  };

  const handleGoToReservations = () => {
    router.push('/dashboard/reservations');
  };

  const getErrorMessage = (code?: string) => {
    const errorMessages: Record<string, string> = {
      '101': 'Tarjeta caducada',
      '102': 'Tarjeta en excepción transitoria o bajo sospecha de fraude',
      '104': 'Operación no permitida para ese tipo de tarjeta',
      '116': 'Disponible insuficiente',
      '118': 'Tarjeta no registrada',
      '129': 'Código de seguridad (CVV2/CVC2) incorrecto',
      '180': 'Tarjeta ajena',
      '184': 'Error en la autenticación del titular',
      '190': 'Denegación sin especificar Motivo',
      '191': 'Fecha de caducidad errónea',
      '202': 'Tarjeta en excepción transitoria o bajo sospecha de fraude',
      '912': 'Emisor no disponible',
    };
    
    return errorMessages[code || ''] || 'Error en el procesamiento del pago';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        
        {/* Icono de error */}
        <div className="mx-auto mb-6 w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <XCircle className="h-12 w-12 text-red-600" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Pago No Procesado!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Lo sentimos, hubo un problema al procesar tu pago.
        </p>

        {/* Detalles del error */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800 mb-1">
                Detalles del error:
              </h3>
              <p className="text-sm text-red-700 mb-2">
                {getErrorMessage(errorDetails.code)}
              </p>
              {errorDetails.code && (
                <p className="text-xs text-red-600">
                  Código: {errorDetails.code}
                </p>
              )}
              {errorDetails.orderId && (
                <p className="text-xs text-red-600">
                  Orden: {errorDetails.orderId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Opciones */}
        <div className="space-y-3">
          <button
            onClick={handleRetryPayment}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Intentar Nuevo Pago
          </button>
          
          <button
            onClick={handleGoToReservations}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver a Mis Reservas
          </button>
        </div>

        {/* Redirección automática */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Serás redirigido automáticamente en {countdown} segundos
          </p>
        </div>

        {/* Información de contacto */}
        <div className="mt-6 text-xs text-gray-400">
          <p>
            ¿Necesitas ayuda?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700">
              Contáctanos
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}















