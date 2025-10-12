/**
 * Component: ReservationPaymentModal
 * Modal para procesar pagos de reservas con créditos o tarjeta
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui/dialog';
import { Button } from '@repo/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { Badge } from '@repo/ui/badge';
import { Loader2, CreditCard, Coins, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentMethod {
  method: 'CREDITS' | 'CARD';
  name: string;
  description: string;
  available: boolean;
  icon: string;
  redirectRequired: boolean;
  creditsAvailable?: number;
  creditsNeeded?: number;
  balanceAfter?: number;
  disabledReason?: string;
}

interface ReservationPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  reservation: {
    id: string;
    courtName: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
  };
  onPaymentSuccess?: () => void;
}

export function ReservationPaymentModal({
  isOpen,
  onClose,
  reservationId,
  reservation,
  onPaymentSuccess
}: ReservationPaymentModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<'CREDITS' | 'CARD' | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Cargar métodos de pago disponibles
  useEffect(() => {
    if (isOpen && reservationId) {
      loadPaymentMethods();
    }
  }, [isOpen, reservationId]);

  const loadPaymentMethods = async () => {
    setLoadingMethods(true);
    try {
      const response = await fetch(`/api/reservations/${reservationId}/payment-methods`);
      const data = await response.json();

      if (data.success) {
        setPaymentMethods(data.data.paymentMethods);
      } else {
        toast.error(data.message || 'Error cargando métodos de pago');
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast.error('Error cargando métodos de pago');
    } finally {
      setLoadingMethods(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/reservations/${reservationId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod: selectedMethod,
          amount: reservation.totalPrice
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (selectedMethod === 'CREDITS') {
          toast.success(`Pago procesado exitosamente con créditos`);
          onPaymentSuccess?.();
          onClose();
        } else if (selectedMethod === 'CARD' && data.data.redirectUrl) {
          // Redirigir a Redsys
          window.location.href = data.data.redirectUrl;
        }
      } else {
        toast.error(data.message || 'Error procesando el pago');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Error procesando el pago');
    } finally {
      setProcessing(false);
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    if (method.method === 'CREDITS') {
      return <Coins className="h-5 w-5 text-yellow-600" />;
    } else {
      return <CreditCard className="h-5 w-5 text-blue-600" />;
    }
  };

  const getMethodStatus = (method: PaymentMethod) => {
    if (!method.available) {
      return <Badge variant="destructive">No disponible</Badge>;
    }
    return <Badge variant="secondary">Disponible</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pagar Reserva</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la reserva */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles de la Reserva</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cancha:</span>
                <span className="font-medium">{reservation.courtName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fecha y hora:</span>
                <span className="font-medium">
                  {new Date(reservation.startTime).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Duración:</span>
                <span className="font-medium">
                  {Math.round((new Date(reservation.endTime).getTime() - new Date(reservation.startTime).getTime()) / (1000 * 60))} minutos
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-semibold">Total a pagar:</span>
                <span className="text-lg font-bold text-green-600">
                  €{reservation.totalPrice.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Métodos de pago */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Métodos de Pago</CardTitle>
              <CardDescription>
                Selecciona cómo deseas pagar tu reserva
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMethods ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Cargando métodos de pago...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.method}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedMethod === method.method
                          ? 'border-blue-500 bg-blue-50'
                          : method.available
                          ? 'border-gray-200 hover:border-gray-300'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                      onClick={() => method.available && setSelectedMethod(method.method)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getMethodIcon(method)}
                          <div>
                            <div className="font-medium">{method.name}</div>
                            <div className="text-sm text-gray-600">
                              {method.description}
                            </div>
                            {method.method === 'CREDITS' && method.creditsAvailable !== undefined && (
                              <div className="text-xs text-gray-500 mt-1">
                                Disponible: {method.creditsAvailable} créditos
                                {method.balanceAfter !== undefined && (
                                  <span> • Después: {method.balanceAfter} créditos</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getMethodStatus(method)}
                          {selectedMethod === method.method && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                      {!method.available && method.disabledReason === 'SALDO_INSUFICIENTE' && (
                        <div className="mt-2 flex items-center text-sm text-red-600">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Saldo insuficiente para pagar con créditos
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePayment}
              disabled={!selectedMethod || processing || loadingMethods}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  {selectedMethod === 'CREDITS' ? 'Pagar con Créditos' : 'Pagar con Tarjeta'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
