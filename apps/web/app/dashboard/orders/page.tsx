'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api, { apiRequest } from '@/lib/api';
import Link from 'next/link';
import { 
  CalendarIcon, 
  CreditCardIcon, 
  WalletIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PAID':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Pagado',
          description: 'Pedido confirmado y listo'
        };
      case 'FULFILLED':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Completado',
          description: 'Pedido procesado exitosamente'
        };
      case 'PENDING':
        return {
          icon: ClockIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          label: 'Pendiente',
          description: 'Esperando confirmación'
        };
      case 'CANCELLED':
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'Cancelado',
          description: 'Pedido cancelado'
        };
      case 'REFUNDED':
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          label: 'Reembolsado',
          description: 'Pedido reembolsado'
        };
      case 'REDEEMED':
        return {
          icon: CheckCircleIcon,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          label: 'Canjeado',
          description: 'Pedido canjeado en tienda'
        };
      default:
        return {
          icon: ClockIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: status,
          description: 'Estado desconocido'
        };
    }
  };

  const getPaymentMethodInfo = (method: string) => {
    switch (method) {
      case 'CREDITS':
        return {
          icon: WalletIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          label: 'Créditos'
        };
      case 'CARD':
        return {
          icon: CreditCardIcon,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          label: 'Tarjeta'
        };
      default:
        return {
          icon: CreditCardIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: method
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Mis Pedidos</h1>
            <p className="text-gray-500 mt-1">Historial de compras en la tienda</p>
          </div>

          {/* Loading skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mis Pedidos</h1>
          <p className="text-gray-500 mt-1">Historial de compras en la tienda</p>
        </div>

        {/* Empty state */}
        {orders.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBagIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes pedidos aún</h3>
            <p className="text-gray-500 mb-6">Cuando hagas tu primera compra, aparecerá aquí</p>
            <button
              onClick={() => router.push('/dashboard/shop')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-green-700 transform hover:scale-105 transition-all duration-200"
            >
              Ir a la Tienda
            </button>
          </div>
        )}

        {/* Orders list */}
        {orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order: any) => {
              const statusInfo = getStatusInfo(order.status);
              const paymentInfo = getPaymentMethodInfo(order.paymentMethod);
              const StatusIcon = statusInfo.icon;
              const PaymentIcon = paymentInfo.icon;

              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Order header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${statusInfo.bgColor} rounded-full flex items-center justify-center`}>
                          <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Pedido #{order.id.slice(0, 8)}
                          </h3>
                          <p className="text-sm text-gray-500">{statusInfo.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          €{Number(order.totalEuro || 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.items?.length || 0} artículos
                        </div>
                      </div>
                    </div>

                    {/* Date and payment method */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{formatDate(order.createdAt)}</span>
                        <span>•</span>
                        <span>{formatTime(order.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 ${paymentInfo.bgColor} rounded-full flex items-center justify-center`}>
                          <PaymentIcon className={`w-3 h-3 ${paymentInfo.color}`} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{paymentInfo.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order items */}
                  <div className="p-4">
                    <div className="space-y-2">
                      {(order.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-2">
                          <span className="text-gray-700 font-medium">{item.product?.name || 'Producto'}</span>
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                            x{item.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order actions */}
                  {(order.status === 'PAID' || order.status === 'FULFILLED') && (
                    <div className="px-4 pb-4">
                      <Link
                        href={`/dashboard/orders/${order.id}/pass`}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-green-700 transform hover:scale-105 transition-all duration-200"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>Ver Pase de Retiro</span>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


