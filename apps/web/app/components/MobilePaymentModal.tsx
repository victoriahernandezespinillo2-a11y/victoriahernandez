"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import {
  X,
  CreditCard,
  MapPin,
  Calendar,
  Clock,
  Check,
  ArrowLeft,
  Building2,
} from 'lucide-react';

interface MobilePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  amount: number;
  currency?: string;
  courtName: string;
  dateLabel: string;
  timeLabel: string;
  onSuccess: () => void;
}

type PaymentMethod = 'CARD' | 'BIZUM' | 'ONSITE' | 'CREDITS';

export default function MobilePaymentModal(props: MobilePaymentModalProps) {
  const {
    isOpen,
    onClose,
    reservationId,
    amount,
    currency = 'EUR',
    courtName,
    dateLabel,
    timeLabel,
    onSuccess,
  } = props;
  
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>('CARD');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'summary' | 'payment' | 'processing' | 'success'>('summary');
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [loadingCredits, setLoadingCredits] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  
  // Gestos táctiles para cerrar
  const [touchStart, setTouchStart] = useState<{ y: number; time: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Cargar saldo de créditos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadCreditsBalance();
    }
  }, [isOpen]);

  const loadCreditsBalance = async () => {
    setLoadingCredits(true);
    try {
      // Usar el cliente API que maneja la autenticación automáticamente
      const response = await apiRequest('/api/credits/balance');
      
      // El endpoint devuelve directamente {balance, currency, userId}
      if (response && typeof response.balance === 'number') {
        setCreditsBalance(response.balance);
      } else if (response && response.success && response.data) {
        // Fallback: si tiene estructura {success, data}
        setCreditsBalance(response.data.balance || 0);
      } else {
        console.error('Respuesta inválida:', response);
        setCreditsBalance(0);
      }
    } catch (error) {
      console.error('Error loading credits balance:', error);
      setCreditsBalance(0);
    } finally {
      setLoadingCredits(false);
    }
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setTouchStart({ y: touch.clientY, time: Date.now() });
    setIsDragging(false);
    setDragOffset(0);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || isSubmitting) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    const deltaY = touch.clientY - touchStart.y;
    
    if (deltaY > 0) {
      setIsDragging(true);
      setDragOffset(Math.min(deltaY, 200));
    }
  };
  
  const handleTouchEnd = () => {
    if (!touchStart) return;
    
    if (isDragging && dragOffset > 100) {
      onClose();
    }
    
    setTouchStart(null);
    setIsDragging(false);
    setDragOffset(0);
  };
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  const handlePay = async () => {
    setError(null);
    
    if (method === 'CREDITS') {
      setIsSubmitting(true);
      setStep('processing');
      try {
        // 🎁 CORREGIDO: Usar finalAmount con descuento aplicado
        const finalAmount = appliedPromo ? appliedPromo.finalAmount : amount;
        
        // Verificar saldo antes del pago
        if (creditsBalance < finalAmount) {
          throw new Error('Saldo insuficiente para realizar el pago');
        }

        console.log('💰 [MOBILE-PAYMENT] Monto para créditos:', {
          originalAmount: amount,
          finalAmount: finalAmount,
          appliedPromo: appliedPromo?.code,
          discount: appliedPromo?.savings
        });

        // Procesar pago con créditos
        const data = await apiRequest(`/api/reservations/${reservationId}/pay`, {
          method: 'POST',
          body: JSON.stringify({
            paymentMethod: 'CREDITS',
            amount: finalAmount,
            ...(appliedPromo && { 
              appliedPromo: {
                code: appliedPromo.code,
                finalAmount: appliedPromo.finalAmount,
                savings: appliedPromo.savings,
                rewardAmount: appliedPromo.reward?.amount || appliedPromo.savings
              }
            })
          }),
        });

        if (!data.success) {
          throw new Error(data.message || 'No se pudo procesar el pago con créditos');
        }

        // Actualizar saldo local con el monto final
        setCreditsBalance(prev => prev - finalAmount);
        
        console.log('🎉 [MOBILE-PAYMENT-MODAL] Pago con créditos exitoso, redirigiendo a página de éxito...');
        console.log('🎯 [MOBILE-PAYMENT-MODAL] reservationId para redirección:', reservationId);
        
        // Cerrar modal y redirigir a página de éxito (igual que tarjeta)
        onClose();
        const redirectUrl = `/dashboard/reservations/success?reservationId=${reservationId}`;
        console.log('🎯 [MOBILE-PAYMENT-MODAL] URL de redirección:', redirectUrl);
        router.push(redirectUrl);
        console.log('✅ [MOBILE-PAYMENT-MODAL] Redirección a página de éxito completada');
      } catch (e: any) {
        setError(e?.message || 'No se pudo procesar el pago con créditos.');
        setStep('payment');
        setIsSubmitting(false);
      }
      return;
    }
    
    if (method === 'ONSITE') {
      // Confirmar reserva sin pago en línea
      onSuccess();
      onClose();
      router.push(`/dashboard/reservations/success?reservationId=${reservationId}`);
      return;
    }
    setIsSubmitting(true);
    setStep('processing');
    try {
      const bizumFlag = method === 'BIZUM' ? '&bizum=1' : '';
      const url = `/api/payments/redsys/redirect?rid=${encodeURIComponent(reservationId)}${bizumFlag}`;
      window.location.href = url;
    } catch (e: any) {
      setError(e?.message || 'No se pudo iniciar el pago.');
      setStep('payment');
      setIsSubmitting(false);
    }
  };
  
  // Función para detectar si la reserva es para hoy
  const isReservationToday = () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Comparar fechas normalizadas
    const todayNormalized = todayStr.toLowerCase().trim();
    const dateLabelNormalized = dateLabel.toLowerCase().trim();
    
    return dateLabelNormalized === todayNormalized;
  };

  const resetForm = () => {
    setStep('summary');
    setMethod('CARD');
    setError(null);
    setIsSubmitting(false);
  };
  
  useEffect(() => {
    console.log('🔄 [MOBILE-PAYMENT-MODAL] useEffect isOpen changed:', isOpen);
    if (isOpen) {
      console.log('✅ [MOBILE-PAYMENT-MODAL] Modal abierto, reseteando formulario...');
      resetForm();
      document.body.style.overflow = 'hidden';
      console.log('🎯 [MOBILE-PAYMENT-MODAL] Modal listo para usar');
    } else {
      console.log('❌ [MOBILE-PAYMENT-MODAL] Modal cerrado');
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  if (!isOpen) {
    console.log('🚫 [MOBILE-PAYMENT-MODAL] Modal no está abierto, no renderizando');
    return null;
  }
  
  console.log('🎨 [MOBILE-PAYMENT-MODAL] Renderizando modal con props:', {
    reservationId,
    amount,
    currency,
    courtName,
    dateLabel,
    timeLabel
  });
  
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${dragOffset}px)`,
          opacity: isDragging ? Math.max(0.5, 1 - dragOffset / 200) : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle para arrastrar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={step === 'summary' ? onClose : () => setStep('summary')}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {step === 'summary' ? <X className="h-6 w-6" /> : <ArrowLeft className="h-6 w-6" />}
          </button>
          <h2 className="text-base font-semibold text-gray-900">
            {step === 'summary' && 'Confirmar Reserva'}
            {step === 'payment' && 'Método de Pago'}
            {step === 'processing' && 'Redirigiendo al pago...'}
            {step === 'success' && '¡Reserva Confirmada!'}
          </h2>
          <div className="w-10" />
        </div>
        
        {/* Content */}
        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
          {step === 'summary' && (
            <div className="space-y-3">
              {/* Resumen de la reserva */}
              <div className="bg-blue-50 rounded-xl p-2">
                <h3 className="font-semibold text-blue-900 mb-1 text-sm">Detalles de la Reserva</h3>
                <div className="space-y-1">
                  <div className="flex items-center text-blue-800">
                    <Building2 className="h-5 w-5 mr-3" />
                    <span className="font-medium">{courtName}</span>
                  </div>
                  <div className="flex items-center text-blue-800">
                    <Calendar className="h-5 w-5 mr-3" />
                    <span>{dateLabel}</span>
                  </div>
                  <div className="flex items-center text-blue-800">
                    <Clock className="h-5 w-5 mr-3" />
                    <span>{timeLabel}</span>
                  </div>
                </div>
              </div>
              
              {/* Total */}
              <div className="bg-green-50 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-green-800 font-medium">Total a pagar:</span>
                  <span className="text-2xl font-bold text-green-900">
                    {formatAmount(amount)}
                  </span>
                </div>
              </div>

              {/* Código Promocional */}
              <div className="bg-white rounded-xl p-2 border border-gray-200">
                <PromoCodeInput
                  amount={amount}
                  type="RESERVATION"
                  onPromoApplied={(promo) => {
                    console.log('🎁 [MOBILE-PAYMENT] Promoción aplicada:', promo);
                    setAppliedPromo(promo);
                  }}
                  onPromoRemoved={() => {
                    console.log('🗑️ [MOBILE-PAYMENT] Promoción removida');
                    setAppliedPromo(null);
                  }}
                />
              </div>

              {/* Total Final con Descuento */}
              {appliedPromo && appliedPromo.savings > 0 && (
                <div className="bg-green-50 rounded-xl p-2 border-2 border-green-300">
                  <div className="flex justify-between items-center">
                    <span className="text-green-800 font-medium">Total final:</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-green-900">
                        {appliedPromo.finalAmount.toFixed(2)}€
                      </span>
                      <p className="text-xs text-green-600">
                        ¡Ahorraste {appliedPromo.savings.toFixed(2)}€!
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Botón continuar */}
              <button
                onClick={() => setStep('payment')}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-base hover:bg-blue-700 transition-colors active:scale-95"
              >
                Continuar al Pago
              </button>
            </div>
          )}
          
          {step === 'payment' && (
            <div className="space-y-3">
              {/* Selector método */}
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 mb-3">Método de pago</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod('CARD')}
                    className={`p-4 rounded-xl border text-sm font-medium transition-all duration-200 ${method === 'CARD' ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md scale-105' : 'border-gray-300 text-gray-700'}`}
                  >
                    💳 Tarjeta
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('BIZUM')}
                    className={`p-4 rounded-xl border text-sm font-medium transition-all duration-200 ${method === 'BIZUM' ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md scale-105' : 'border-gray-300 text-gray-700'}`}
                  >
                    🤳 Bizum
                  </button>
                  {/* Botón de pago en sede - solo visible para reservas de hoy */}
                  {isReservationToday() && (
                    <button
                      type="button"
                      onClick={() => setMethod('ONSITE')}
                      className={`p-4 rounded-xl border text-sm font-medium transition-all duration-200 ${method === 'ONSITE' ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md scale-105' : 'border-gray-300 text-gray-700'}`}
                    >
                      🏢 Pago en sede
                    </button>
                  )}
                  
                  {/* Botón de pago con créditos */}
                  <button
                    type="button"
                    onClick={() => setMethod('CREDITS')}
                    disabled={creditsBalance < amount || loadingCredits}
                    className={`p-4 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      method === 'CREDITS' 
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md scale-105' 
                        : creditsBalance < amount || loadingCredits
                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    {loadingCredits ? (
                      '🔄 Cargando...'
                    ) : (
                      <div className="flex flex-col items-center">
                        <span>💰 Monedero</span>
                        <span className="text-xs text-gray-500">
                          {creditsBalance.toFixed(2)} créditos
                        </span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
              
              {/* Total y botón de pago */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-700 font-medium">Total:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatAmount(amount)}
                  </span>
                </div>
                
                <button
                  onClick={handlePay}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-green-700 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Procesando...' : 
                   method === 'ONSITE' ? 'Confirmar (pagar en sede)' : 
                   method === 'CREDITS' ? 'Pagar con créditos' :
                   method === 'BIZUM' ? 'Pagar con Bizum' : 'Pagar ahora'}
                </button>
              </div>
            </div>
          )}
          
          {step === 'processing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Redirigiendo a la pasarela de pago...
              </h3>
              <p className="text-gray-600">
                Por favor espera un instante
              </p>
            </div>
          )}
          
          {step === 'success' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¡Pago exitoso!
              </h3>
              <p className="text-gray-600">
                Tu reserva ha sido confirmada. Te redirigiremos en un momento...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}