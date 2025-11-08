"use client";

import { useEffect, useMemo, useState } from 'react';
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

interface PricingSummary {
  basePrice?: number;
  discount?: number;
  total?: number;
  breakdown?: {
    description: string;
    amount: number;
  }[];
  appliedRules?: string[];
}

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
  pricingDetails?: PricingSummary;
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
  pricingDetails,
  } = props;
  
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>('CARD');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'summary' | 'payment' | 'processing' | 'success'>('summary');
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [loadingCredits, setLoadingCredits] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const baseAmount = useMemo(() => {
    const rawTotal = pricingDetails?.total ?? amount;
    const numeric = typeof rawTotal === 'number' ? rawTotal : Number(rawTotal ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }, [pricingDetails?.total, amount]);
  const basePriceBeforeDiscount = useMemo(() => {
    if (typeof pricingDetails?.basePrice === 'number') {
      return pricingDetails.basePrice;
    }
    return baseAmount;
  }, [pricingDetails?.basePrice, baseAmount]);
  const discountAmount = useMemo(() => {
    if (typeof pricingDetails?.discount === 'number') {
      return pricingDetails.discount;
    }
    if (typeof pricingDetails?.basePrice === 'number') {
      return pricingDetails.basePrice - baseAmount;
    }
    return 0;
  }, [pricingDetails?.discount, pricingDetails?.basePrice, baseAmount]);
  const pricingBreakdown = useMemo(
    () => (pricingDetails?.breakdown ? [...pricingDetails.breakdown] : []),
    [pricingDetails?.breakdown]
  );
  const effectiveAmount = useMemo(() => {
    const promoAmount = appliedPromo?.finalAmount;
    if (typeof promoAmount === 'number' && Number.isFinite(promoAmount)) {
      return promoAmount;
    }
    return baseAmount;
  }, [appliedPromo?.finalAmount, baseAmount]);
  
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
  
  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  };
  
  const handlePay = async () => {
    setError(null);
    
    if (method === 'CREDITS') {
      setIsSubmitting(true);
      setStep('processing');
      try {
        const finalAmount = effectiveAmount;

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

        const creditsUsed = typeof data.creditsUsed === 'number' ? data.creditsUsed : finalAmount;
        setCreditsBalance(prev => {
          if (typeof data.balanceAfter === 'number') {
            return data.balanceAfter;
          }
          return prev - creditsUsed;
        });
        
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
    const finalAmount = effectiveAmount;
    if (finalAmount <= 0) {
      setIsSubmitting(true);
      setStep('processing');
      try {
        const requestData = {
          paymentMethod: 'FREE',
          amount: 0,
          appliedPromo: appliedPromo
            ? {
                code: appliedPromo.code,
                finalAmount: appliedPromo.finalAmount,
                savings: appliedPromo.savings,
                rewardAmount: appliedPromo.reward?.amount || appliedPromo.savings,
              }
            : undefined,
        };

        const data = await apiRequest(`/api/reservations/${reservationId}/pay`, {
          method: 'POST',
          body: JSON.stringify(requestData),
        });

        if (!data.success) {
          throw new Error(data.message || 'No se pudo procesar el pago.');
        }

        onClose();
        router.push(`/dashboard/reservations/success?reservationId=${reservationId}`);
      } catch (e: any) {
        setError(e?.message || 'No se pudo procesar el pago.');
        setStep('payment');
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    setStep('processing');
    try {
      const bizumFlag = method === 'BIZUM' ? '&bizum=1' : '';
      const promoFlag = appliedPromo
        ? `&promo=${encodeURIComponent(appliedPromo.code)}&finalAmount=${finalAmount}`
        : '';
      const url = `/api/payments/redsys/redirect?rid=${encodeURIComponent(
        reservationId
      )}${bizumFlag}${promoFlag}`;
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
              <div className="bg-green-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-green-900">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatAmount(basePriceBeforeDiscount)}</span>
                </div>
                {pricingBreakdown.length > 0 && (
                  <div className="space-y-1 text-xs">
                    {pricingBreakdown.map((item, idx) => (
                      <div
                        key={`${item.description}-${idx}`}
                        className={`flex items-center justify-between ${
                          item.amount < 0 ? 'text-green-700' : 'text-gray-600'
                        }`}
                      >
                        <span>{item.description}</span>
                        <span className="font-semibold">{formatAmount(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {discountAmount !== 0 && (
                  <div className="flex items-center justify-between text-sm text-green-700">
                    <span>Descuentos aplicados</span>
                    <span className="font-semibold">
                      {formatAmount(-Math.abs(discountAmount))}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-green-800 font-semibold">Total a pagar:</span>
                  <span className="text-2xl font-bold text-green-900">
                    {formatAmount(appliedPromo ? effectiveAmount : baseAmount)}
                  </span>
                </div>
                {appliedPromo && appliedPromo.savings > 0 && (
                  <p className="text-xs text-green-600 text-right">
                    ¡Ahorraste {appliedPromo.savings.toFixed(2)}€!
                  </p>
                )}
                {pricingDetails?.appliedRules && pricingDetails.appliedRules.length > 0 && (
                  <div className="text-[11px] text-gray-500">
                    <span className="font-medium text-gray-600">Reglas activas:</span>{' '}
                    {pricingDetails.appliedRules.join(', ')}
                  </div>
                )}
              </div>

              {/* Código Promocional */}
              <div className="bg-white rounded-xl p-2 border border-gray-200">
                <PromoCodeInput
                  amount={baseAmount}
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