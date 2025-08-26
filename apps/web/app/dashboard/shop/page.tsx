'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ShopPage() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.shop.list({ page: 1, limit: 24 });
        setProducts(res.items || []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tienda</h1>
        <p className="text-gray-500 mt-1">Compra bebidas, snacks y merchandising</p>
      </div>

      {loading && (
        <div className="text-gray-500">Cargando productos...</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <Link key={p.id} href={`/dashboard/shop/product/${p.id}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="aspect-video bg-gray-100 rounded mb-3 overflow-hidden">
              {/* Imagen principal si existe */}
              {Array.isArray(p.media) && p.media.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.media[0]?.url || ''} alt={p.name} className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">{p.category}</div>
                <div className="text-base font-semibold text-gray-900">{p.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">€{Number(p.priceEuro || 0).toFixed(2)}</div>
              </div>
            </div>
          </Link>
        ))}
        {!loading && products.length === 0 && (
          <div className="text-gray-500">No hay productos disponibles</div>
        )}
      </div>
    </div>
  );
}





