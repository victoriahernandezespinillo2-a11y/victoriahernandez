'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircleIcon, ShoppingBagIcon, CreditCardIcon } from '@heroicons/react/24/outline';

export default function ShopSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);

  // Obtener parámetros de la URL
  const orderId = searchParams.get('orderId');
  const paymentMethod = searchParams.get('method');
  const total = searchParams.get('total');
  const items = searchParams.get('items');

  useEffect(() => {
    // Countdown automático para redirigir a pedidos
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/dashboard/orders');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleGoToOrders = () => {
    router.push('/dashboard/orders');
  };

  const handleContinueShopping = () => {
    router.push('/dashboard/shop');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header con icono de éxito */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Compra Exitosa!</h1>
          <p className="text-gray-600">Tu pedido ha sido procesado correctamente</p>
        </div>

        {/* Tarjeta principal */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Información del pedido */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center mb-4">
              <ShoppingBagIcon className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Detalles del Pedido</h2>
            </div>
            
            {orderId && (
              <div className="mb-3">
                <span className="text-sm text-gray-500">Número de pedido:</span>
                <span className="ml-2 font-mono text-sm font-semibold text-gray-900">
                  #{orderId.slice(0, 8)}
                </span>
              </div>
            )}

            {total && (
              <div className="mb-3">
                <span className="text-sm text-gray-500">Total pagado:</span>
                <span className="ml-2 text-lg font-bold text-green-600">€{total}</span>
              </div>
            )}

            {paymentMethod && (
              <div className="flex items-center">
                <CreditCardIcon className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-500">Método de pago:</span>
                <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                  {paymentMethod === 'credits' ? 'Créditos' : 'Tarjeta'}
                </span>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="p-6 space-y-3">
            <button
              onClick={handleGoToOrders}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Ver Mis Pedidos
            </button>
            
            <button
              onClick={handleContinueShopping}
              className="w-full px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Seguir Comprando
            </button>
          </div>
        </div>

        {/* Footer con countdown */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Redirigiendo a pedidos en <span className="font-semibold text-blue-600">{countdown}</span> segundos
          </p>
          <p className="text-xs text-gray-400 mt-2">
            O haz clic en "Ver Mis Pedidos" para ir ahora
          </p>
        </div>
      </div>
    </div>
  );
}




































