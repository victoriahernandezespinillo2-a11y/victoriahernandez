'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/contexts/CartContext';
import { 
  TrashIcon, 
  PlusIcon, 
  MinusIcon, 
  ShoppingBagIcon,
  ArrowLeftIcon,
  CreditCardIcon,
  WalletIcon
} from '@heroicons/react/24/outline';
import { useUserProfile } from '@/lib/hooks';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function CartPage() {
  const router = useRouter();
  const { state, updateQuantity, removeFromCart, clearCart } = useCart();
  const { profile, getProfile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'card'>('credits');

  const { items, total, itemCount } = state;
  const userCredits = Number(profile?.creditsBalance ?? 0);

  // Asegurar que el perfil esté cargado (para obtener creditsBalance real)
  useEffect(() => {
    getProfile();
  }, [getProfile]);

  // Verificar si el usuario tiene suficientes créditos
  const hasEnoughCredits = userCredits >= total;
  const canPayWithCredits = paymentMethod === 'credits' && hasEnoughCredits;

  const handleQuantityChange = (productId: string, newQty: number) => {
    if (newQty > 0) {
      updateQuantity(productId, newQty);
    }
  };

  const handleRemoveItem = (productId: string) => {
    removeFromCart(productId);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    try {
      setLoading(true);
      const idem = crypto.randomUUID();
      
      const result = await api.cart.checkout({
        items: items.map(item => ({
          productId: item.productId,
          qty: item.qty
        })),
        paymentMethod
      }, idem);

      if (paymentMethod === 'credits') {
        // Redirigir a página de éxito
        router.push(`/dashboard/shop/success?orderId=${result?.order?.id || 'unknown'}&method=credits&total=${total}&items=${itemCount}`);
      } else {
        // Redirigir a Redsys para pago con tarjeta
        const redirectUrl = result?.redirectUrl;
        if (redirectUrl) {
          // Guardar datos del pedido
          sessionStorage.setItem('pendingOrder', JSON.stringify({
            method: 'card',
            total,
            items: itemCount,
            productNames: items.map(item => item.name).join(', ')
          }));
          
          window.location.href = redirectUrl;
          return;
        }
      }
    } catch (error: any) {
      alert(error?.message || 'Error al procesar el pedido');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/dashboard/shop')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Volver a la Tienda</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Carrito de Compras</h1>
          </div>

          {/* Empty cart state */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBagIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Tu carrito está vacío</h3>
            <p className="text-gray-500 mb-8">Agrega productos desde la tienda para comenzar a comprar</p>
            <button
              onClick={() => router.push('/dashboard/shop')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Ir a la Tienda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/shop')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Volver a la Tienda</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Carrito de Compras</h1>
          <p className="text-gray-500 mt-1">{itemCount} artículos en tu carrito</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de productos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Productos ({items.length})</h2>
              </div>
              
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="p-6">
                    <div className="flex items-center space-x-4">
                      {/* Imagen del producto */}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBagIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Información del producto */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{item.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{item.category}</p>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                        <p className="text-lg font-bold text-gray-900">€{item.price.toFixed(2)}</p>
                      </div>

                      {/* Controles de cantidad */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.qty - 1)}
                          disabled={item.qty <= 1}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </button>
                        
                        <span className="w-12 text-center font-semibold text-gray-900">
                          {item.qty}
                        </span>
                        
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.qty + 1)}
                          disabled={item.qty >= item.stockQty}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Subtotal y botón eliminar */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          €{(item.price * item.qty).toFixed(2)}
                        </p>
                        <button
                          onClick={() => handleRemoveItem(item.productId)}
                          className="mt-2 text-red-600 hover:text-red-800 text-sm flex items-center space-x-1"
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón limpiar carrito */}
              <div className="p-6 border-t border-gray-100">
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-800 text-sm flex items-center space-x-1"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Limpiar carrito</span>
                </button>
              </div>
            </div>
          </div>

          {/* Resumen del pedido */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Pedido</h2>
              
              {/* Método de pago */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Método de Pago
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="credits"
                      checked={paymentMethod === 'credits'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'credits' | 'card')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2">
                      <WalletIcon className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">Créditos</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'credits' | 'card')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2">
                      <CreditCardIcon className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium">Tarjeta</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Saldo de créditos */}
              {paymentMethod === 'credits' && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-700">Saldo disponible:</span>
                    <span className="font-semibold text-blue-900">{userCredits} créditos</span>
                  </div>
                  {!hasEnoughCredits && (
                    <p className="text-red-600 text-xs mt-1">
                      Saldo insuficiente. Necesitas {total - userCredits} créditos más.
                    </p>
                  )}
                </div>
              )}

              {/* Desglose de precios */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal ({itemCount} artículos)</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Envío</span>
                  <span className="text-green-600">Gratis</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>€{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Botón de checkout */}
              <button
                onClick={handleCheckout}
                disabled={loading || (paymentMethod === 'credits' && !hasEnoughCredits)}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  'Procesando...'
                ) : (
                  <>
                    {paymentMethod === 'credits' ? 'Pagar con Créditos' : 'Pagar con Tarjeta'}
                    <span className="block text-sm font-normal mt-1">
                      €{total.toFixed(2)}
                    </span>
                  </>
                )}
              </button>

              {/* Información adicional */}
              <div className="mt-4 text-xs text-gray-500 text-center">
                <p>Al completar tu pedido, aceptas nuestros términos y condiciones</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

