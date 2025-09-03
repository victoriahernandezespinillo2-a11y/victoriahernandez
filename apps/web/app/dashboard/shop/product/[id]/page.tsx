'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useUserProfile } from '@/lib/hooks';
import { useCart } from '@/lib/contexts/CartContext';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: profileLoading, getProfile } = useUserProfile();
  const { addToCart, isInCart, getCartItem } = useCart();
  const [product, setProduct] = useState<any | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [showAddedMessage, setShowAddedMessage] = useState(false);

  const userCredits = useMemo(() => Number(profile?.creditsBalance ?? 0), [profile]);
  
  // Verificar si el producto está en el carrito
  const cartItem = product ? getCartItem(product.id) : null;
  const isProductInCart = product ? isInCart(product.id) : false;

  useEffect(() => {
    (async () => {
      try {
        // Asegurar que el perfil esté cargado para mostrar saldo correcto
        getProfile().catch(() => {});
        const id = (params?.id as string) || '';
        const res = await api.shop.detail(id);
        setProduct(res);
      } catch {
        setProduct(null);
      }
    })();
  }, [params?.id, getProfile]);

  const handleAddToCart = () => {
    if (!product) return;
    
    addToCart(product, qty);
    setShowAddedMessage(true);
    
    // Ocultar mensaje después de 3 segundos
    setTimeout(() => setShowAddedMessage(false), 3000);
  };

  const handleBuyWithCredits = async () => {
    if (!product) return;
    try {
      setLoading(true);
      const idem = crypto.randomUUID();
      const result = await api.cart.checkout({ items: [{ productId: product.id, qty }], paymentMethod: 'credits' }, idem);
      
      // Redirigir a la página de éxito con los datos del pedido
      const total = (Number(product.priceEuro || 0) * qty).toFixed(2);
      const orderId = result?.order?.id || 'unknown';
      
      router.push(`/dashboard/shop/success?orderId=${orderId}&method=credits&total=${total}&items=${qty}`);
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
      const redirectUrl = res?.redirectUrl;
      const clientSecret = res?.clientSecret;
      
      if (redirectUrl) {
        // Flujo Redsys: redirigir a la URL que auto-postea a la pasarela
        // Guardar datos del pedido en sessionStorage para mostrar en la página de éxito
        const total = (Number(product.priceEuro || 0) * qty).toFixed(2);
        sessionStorage.setItem('pendingOrder', JSON.stringify({
          method: 'card',
          total,
          items: qty,
          productName: product.name
        }));
        
        window.location.href = redirectUrl as string;
        return;
      }
      
      if (!clientSecret) {
        alert('No se pudo iniciar el pago con tarjeta.');
        return;
      }
      
      // Flujo Stripe (si en el futuro se usa)
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

          {/* Mensaje de producto agregado */}
          {showAddedMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-200 rounded-lg text-green-800 text-sm text-center">
              ✅ Producto agregado al carrito
            </div>
          )}

          {/* Información del carrito */}
          {isProductInCart && cartItem && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">En tu carrito:</span>
                <span className="font-semibold text-blue-900">{cartItem.qty} unidades</span>
              </div>
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={() => router.push('/dashboard/shop/cart')}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  Ver Carrito
                </button>
                <button
                  onClick={() => router.push('/dashboard/shop/cart')}
                  className="px-3 py-1 bg-white border border-blue-600 text-blue-600 text-xs rounded hover:bg-blue-50 transition-colors"
                >
                  Finalizar Compra
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button 
              onClick={handleAddToCart} 
              disabled={loading} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isProductInCart ? 'Actualizar Carrito' : 'Agregar al Carrito'}
            </button>
            <button onClick={handleBuyWithCredits} disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded disabled:opacity-50 hover:bg-gray-800 transition-colors">
              {loading ? 'Procesando...' : 'Comprar con créditos'}
            </button>
            <button onClick={handleBuyWithCard} disabled={loading} className="px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded disabled:opacity-50 hover:border-gray-400 transition-colors">
              {loading ? 'Procesando...' : 'Comprar con tarjeta'}
            </button>
          </div>

          <div className="text-xs text-gray-500">Saldo actual: {profileLoading ? '…' : userCredits} créditos</div>
        </div>
      </div>
    </div>
  );
}



