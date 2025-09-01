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

  if (loading) return <div className="text-gray-500">Generando pase...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Pase de retiro</h1>
      <p className="text-sm text-gray-500 mb-4">Pedido #{data.orderId.slice(0, 8)}</p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.qrCodeDataUrl} alt="QR de retiro" className="mx-auto w-48 h-48 rounded-md border" />

      <div className="text-xs text-gray-500 mt-3">Vence: {new Date(data.expiresAt).toLocaleString('es-ES')}</div>

      <div className="mt-4 text-left">
        <div className="text-sm font-medium text-gray-900 mb-2">Artículos</div>
        <ul className="text-sm text-gray-700 list-disc pl-5">
          {(data.items || []).map((it: any, idx: number) => (
            <li key={idx}>{it.name} x{it.qty}</li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => router.push('/dashboard/orders')}
        className="mt-6 px-4 py-2 bg-gray-900 text-white rounded-md"
      >
        Volver a pedidos
      </button>
    </div>
  );
}


