'use client';

import { useEffect, useState } from 'react';
import api, { apiRequest } from '@/lib/api';
import Link from 'next/link';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res: any = await apiRequest('/api/orders');
        const items = res?.items || res || [];
        setOrders(items);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Pedidos</h1>
        <p className="text-gray-500 mt-1">Historial de compras en la tienda</p>
      </div>

      {loading && <div className="text-gray-500">Cargando pedidos...</div>}

      {!loading && orders.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-gray-600">
          Aún no tienes pedidos.
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pago</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total €</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artículos</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((o: any) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2 text-sm text-gray-700">{new Date(o.createdAt).toLocaleString('es-ES')}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{o.status}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{o.paymentMethod}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{Number(o.totalEuro || 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {(o.items || []).map((it: any) => `${it.product?.name || 'Producto'} x${it.qty}`).join(', ')}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {o.status === 'PAID' && (
                        <Link href={`/dashboard/orders/${o.id}/pass`} className="text-blue-600 hover:underline text-sm">
                          Ver pase de retiro
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


