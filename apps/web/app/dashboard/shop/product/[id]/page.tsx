'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [product, setProduct] = useState<any | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const userCredits = useMemo(() => (session?.user as any)?.creditsBalance ?? 0, [session]);

  useEffect(() => {
    (async () => {
      try {
        const id = (params?.id as string) || '';
        const res = await api.shop.detail(id);
        setProduct(res);
      } catch {
        setProduct(null);
      }
    })();
  }, [params?.id]);

  const handleBuyWithCredits = async () => {
    if (!product) return;
    try {
      setLoading(true);
      const idem = crypto.randomUUID();
      await api.cart.checkout({ items: [{ productId: product.id, qty }], paymentMethod: 'credits' }, idem);
      router.push('/dashboard/orders');
    } catch (e: any) {
      alert(e?.message || 'No se pudo completar la compra con créditos');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyWithCard = async () => {
    if (!product) return;
    try {
      setLoading(true);
      const idem = crypto.randomUUID();
      const res: any = await api.cart.checkout({ items: [{ productId: product.id, qty }], paymentMethod: 'card' }, idem);
      const clientSecret = res?.clientSecret;
      if (!clientSecret) {
        alert('No se pudo iniciar el pago con tarjeta.');
        return;
      }
      // Redirige a una página de confirmación/pasarela si implementas stripe.js client-side; de momento dejamos el pedido en PENDING hasta webhook
      alert('Pedido creado. Completa el pago en la pasarela.');
      router.push('/dashboard/orders');
    } catch (e: any) {
      alert(e?.message || 'No se pudo iniciar el pago con tarjeta');
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return <div className="text-gray-500">Cargando producto...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
        <p className="text-gray-500 mt-1">{product.category}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="aspect-video bg-gray-100 rounded overflow-hidden">
            {Array.isArray(product.media) && product.media.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.media[0]?.url || ''} alt={product.name} className="w-full h-full object-cover" />
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <div className="text-sm text-gray-500">Precio</div>
            <div className="text-3xl font-bold text-gray-900">€{Number(product.priceEuro || 0).toFixed(2)}</div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Cantidad</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="w-32 border rounded px-3 py-2" />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleBuyWithCredits} disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded disabled:opacity-50">
              {loading ? 'Procesando...' : 'Comprar con créditos'}
            </button>
            <button onClick={handleBuyWithCard} disabled={loading} className="px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded disabled:opacity-50">
              {loading ? 'Procesando...' : 'Comprar con tarjeta'}
            </button>
          </div>

          <div className="text-xs text-gray-500">Saldo actual: {userCredits} créditos</div>
        </div>
      </div>
    </div>
  );
}



