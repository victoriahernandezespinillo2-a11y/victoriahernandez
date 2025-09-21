'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useUserProfile } from '@/lib/hooks';
import { useCart } from '@/lib/contexts/CartContext';
import {
  ShoppingCart,
  CreditCard,
  Star,
  Shield,
  CheckCircle,
  Plus,
  Minus,
  ArrowLeft,
  Heart,
  Share2,
  Truck,
  RotateCcw,
  Award,
  Euro,
  Zap
} from 'lucide-react';

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando producto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header con navegación */}
      <div className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Volver</span>
          </button>
          
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Heart className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Share2 className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="px-4 py-6 space-y-6">
        {/* Imagen del producto */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative">
            {Array.isArray(product.media) && product.media.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={product.media[0]?.url || ''} 
                alt={product.name} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400">Sin imagen</p>
                </div>
              </div>
            )}
            
            {/* Badge de categoría */}
            <div className="absolute top-4 left-4">
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                {product.category}
              </span>
            </div>
          </div>
        </div>

        {/* Información del producto */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-gray-600">{product.description || 'Descripción no disponible'}</p>
            </div>

            {/* Precio destacado */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Precio</p>
                  <div className="text-3xl font-bold text-gray-900">
                    €{Number(product.priceEuro || 0).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-medium">Excelente</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Calidad garantizada</p>
                </div>
              </div>
            </div>

            {/* Selector de cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Cantidad</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="px-4 py-3 bg-white min-w-[60px] text-center">
                    <span className="text-lg font-semibold">{qty}</span>
                  </div>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="flex-1">
                  <div className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-gray-900">
                      €{(Number(product.priceEuro || 0) * qty).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mensaje de producto agregado */}
            {showAddedMessage && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">¡Producto agregado al carrito!</span>
                </div>
              </div>
            )}

            {/* Información del carrito */}
            {isProductInCart && cartItem && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-blue-800 font-medium">En tu carrito</span>
                  <span className="bg-blue-600 text-white px-2 py-1 rounded-lg text-sm font-semibold">
                    {cartItem.qty} unidades
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push('/dashboard/shop/cart')}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Ver Carrito
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/shop/cart')}
                    className="flex-1 bg-white border border-blue-600 text-blue-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                  >
                    Finalizar Compra
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción principales */}
        <div className="space-y-3">
          <button 
            onClick={handleAddToCart} 
            disabled={loading} 
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart className="h-5 w-5" />
            {isProductInCart ? 'Actualizar Carrito' : 'Agregar al Carrito'}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleBuyWithCredits} 
              disabled={loading || userCredits < (Number(product.priceEuro || 0) * qty)} 
              className="bg-gray-900 text-white py-3 px-4 rounded-xl font-medium disabled:opacity-50 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              <span>Créditos</span>
            </button>
            
            <button 
              onClick={handleBuyWithCard} 
              disabled={loading} 
              className="bg-white border-2 border-gray-200 text-gray-900 py-3 px-4 rounded-xl font-medium disabled:opacity-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              <span>Tarjeta</span>
            </button>
          </div>

          {/* Saldo actual */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Saldo actual:</span>
              <span className="font-semibold text-gray-900">
                {profileLoading ? '…' : userCredits} créditos
              </span>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Información del producto</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Truck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Entrega inmediata</p>
                <p className="text-sm text-gray-600">Disponible en el polideportivo</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RotateCcw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Garantía de calidad</p>
                <p className="text-sm text-gray-600">Productos frescos y de calidad</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Marca oficial</p>
                <p className="text-sm text-gray-600">Productos seleccionados</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



