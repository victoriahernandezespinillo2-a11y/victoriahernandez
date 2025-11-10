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
    startTimeIso?: string;
    endTimeIso?: string;
    duration?: number;
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
        credentials: 'include',
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
        } else if (selectedMethod === 'CARD') {
          const redirectUrl =
            data?.data?.redirectUrl ||
            data?.redirectUrl ||
            data?.data?.url ||
            data?.url;

          if (redirectUrl) {
            window.location.href = redirectUrl;
          } else {
            toast.error('No se recibió la URL de redirección para Redsys. Intenta nuevamente.');
          }
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

  const startDate = reservation.startTimeIso
    ? new Date(reservation.startTimeIso)
    : new Date(reservation.startTime);
  const endDate = reservation.endTimeIso
    ? new Date(reservation.endTimeIso)
    : reservation.endTime
    ? new Date(reservation.endTime)
    : new Date(startDate.getTime() + (reservation.duration || 0) * 60000);

  const formattedDate = startDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTimeRange = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const formattedDuration = Number.isFinite(reservation.duration)
    ? `${reservation.duration} minutos`
    : `${Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000))} minutos`;

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
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle>Pagar Reserva</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalles de la Reserva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Cancha:</span>
                  <span className="font-medium text-gray-900">{reservation.courtName}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Fecha:</span>
                  <span className="font-medium text-gray-900 capitalize">{formattedDate}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Horario:</span>
                  <span className="font-medium text-gray-900">{formattedTimeRange}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Duración:</span>
                  <span className="font-medium text-gray-900">{formattedDuration}</span>
                </div>
                <div className="flex justify-between border-t pt-3 text-sm font-semibold">
                  <span>Total a pagar:</span>
                  <span className="text-lg font-bold text-green-600">€{reservation.totalPrice.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Métodos de Pago</CardTitle>
                <CardDescription>Selecciona cómo deseas pagar tu reserva</CardDescription>
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
                      <button
                        key={method.method}
                        type="button"
                        className={`w-full text-left border rounded-lg p-4 transition-all ${
                          selectedMethod === method.method
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : method.available
                            ? 'border-gray-200 hover:border-gray-300'
                            : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        }`}
                        onClick={() => method.available && setSelectedMethod(method.method)}
                        disabled={!method.available}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getMethodIcon(method)}
                            <div>
                              <div className="font-medium text-gray-900">{method.name}</div>
                              <div className="text-sm text-gray-600">{method.description}</div>
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
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={processing}
                className="sm:min-w-[140px]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePayment}
                disabled={!selectedMethod || processing || loadingMethods}
                className="sm:min-w-[180px]"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Procesando...
                  </>
                ) : selectedMethod === 'CREDITS' ? (
                  'Pagar con Créditos'
                ) : (
                  'Pagar con Tarjeta'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
