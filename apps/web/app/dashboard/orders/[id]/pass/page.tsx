'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

export default function OrderPassPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const id = (params?.id as string) || '';
        if (!id) {
          setError('ID de pedido inválido');
          setLoading(false);
          return;
        }
        const res: any = await apiRequest(`/api/orders/${id}/pass`);
        setData(res);
      } catch (e: any) {
        setError(e?.message || 'No se pudo generar el pase');
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Generando pase de retiro...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al generar el pase</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard/orders')}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Volver a pedidos
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header con logo y título */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pase de Retiro</h1>
          <p className="text-gray-600 font-medium">Pedido #{data.orderId.slice(0, 8)}</p>
        </div>

        {/* Tarjeta principal */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* QR Code con diseño mejorado */}
          <div className="p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border-4 border-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={data.qrCodeDataUrl} 
                alt="Código QR para retiro" 
                className="w-48 h-48 rounded-xl"
              />
            </div>
            
            {/* Información de vencimiento */}
            <div className="mt-6">
              <div className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Vence: {new Date(data.expiresAt).toLocaleString('es-ES')}
              </div>
            </div>
          </div>

          {/* Lista de artículos */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Artículos del Pedido</h3>
            </div>
            
            <div className="space-y-3">
              {(data.items || []).map((it: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-800 font-medium">{it.name}</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    x{it.qty}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Botón de acción */}
          <div className="p-6 bg-gray-50 border-t border-gray-100">
            <button
              onClick={() => router.push('/dashboard/orders')}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Volver a Pedidos
            </button>
          </div>
        </div>

        {/* Footer informativo */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Muestra este código QR al personal para retirar tu pedido
          </p>
        </div>
      </div>
    </div>
  );
}



