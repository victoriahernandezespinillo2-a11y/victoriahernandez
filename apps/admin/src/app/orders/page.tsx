"use client";

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, EyeIcon, ArrowPathIcon, CurrencyEuroIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { Input } from '@repo/ui/input';
import { Badge } from '@repo/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@repo/ui/dialog';
import { Label } from '@repo/ui/label';
import { Textarea } from '@repo/ui/textarea';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  productId: string;
  qty: number;
  priceEuro: number;
  product: {
    name: string;
  };
}

interface Order {
  id: string;
  userId: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  totalEuro: number;
  creditsUsed: number;
  paymentMethod: 'CASH' | 'CARD' | 'CREDITS';
  createdAt: string;
  user: {
    id: string;
    email: string;
  };
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      const response = await fetch(`/api/admin/orders?${params}`);
      const data = await response.json();
      if (data.success) {
        setOrders(data.data.items);
        setTotalPages(data.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedOrder || !refundReason.trim()) return;
    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Reembolso procesado exitosamente');
        setIsRefundDialogOpen(false);
        setRefundReason('');
        setSelectedOrder(null);
        fetchOrders();
      } else {
        toast.error(data.message || 'Error procesando reembolso');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Error procesando reembolso');
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailDialogOpen(true);
  };

  const openRefundDialog = (order: Order) => {
    setSelectedOrder(order);
    setIsRefundDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'PAID':
        return <Badge variant="default">Pagado</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'REFUNDED':
        return <Badge variant="outline">Reembolsado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return <CurrencyEuroIcon className="h-4 w-4" />;
      case 'CARD':
        return <CreditCardIcon className="h-4 w-4" />;
      case 'CREDITS':
        return <CreditCardIcon className="h-4 w-4" />;
      default:
        return <CurrencyEuroIcon className="h-4 w-4" />;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Efectivo';
      case 'CARD':
        return 'Tarjeta';
      case 'CREDITS':
        return 'Créditos';
      default:
        return method;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
      </div>

      {/* Orders Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Cargando pedidos...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No se encontraron pedidos
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-1">
                        <span>€{order.totalEuro.toFixed(2)}</span>
                        {order.creditsUsed > 0 && (
                          <Badge variant="outline" className="text-xs">
                            +{order.creditsUsed} créditos
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getPaymentMethodIcon(order.paymentMethod)}
                        <span className="text-sm text-gray-900">
                          {getPaymentMethodText(order.paymentMethod)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openOrderDetail(order)}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        {order.status === 'PAID' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRefundDialog(order)}
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-700">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">ID del Pedido</Label>
                  <p className="text-sm text-gray-900">{selectedOrder.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Cliente</Label>
                  <p className="text-sm text-gray-900">{selectedOrder.user.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Estado</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Método de Pago</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getPaymentMethodIcon(selectedOrder.paymentMethod)}
                    <span className="text-sm text-gray-900">
                      {getPaymentMethodText(selectedOrder.paymentMethod)}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Total</Label>
                  <p className="text-sm text-gray-900">€{selectedOrder.totalEuro.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Créditos Usados</Label>
                  <p className="text-sm text-gray-900">{selectedOrder.creditsUsed}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Fecha</Label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Productos</Label>
                <div className="mt-2 space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                        <p className="text-xs text-gray-500">Cantidad: {item.qty}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        €{(item.priceEuro * item.qty).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Procesar Reembolso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedOrder && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Pedido:</strong> {selectedOrder.id.slice(0, 8)}...
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Total:</strong> €{selectedOrder.totalEuro.toFixed(2)}
                </p>
                {selectedOrder.creditsUsed > 0 && (
                  <p className="text-sm text-gray-600">
                    <strong>Créditos a reembolsar:</strong> {selectedOrder.creditsUsed}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="refundReason">Motivo del Reembolso</Label>
              <Textarea
                id="refundReason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Especifica el motivo del reembolso..."
                rows={3}
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> Este reembolso repondrá el stock de los productos y, si el pedido fue pagado con créditos, reabonará el monedero del cliente.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRefund}
              disabled={!refundReason.trim()}
              variant="destructive"
            >
              Procesar Reembolso
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}






