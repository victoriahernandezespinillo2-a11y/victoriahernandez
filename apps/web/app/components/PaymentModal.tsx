"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';
import { PromoCodeInput } from '@/components/PromoCodeInput';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  amount: number; // en la moneda local mostrada por la app
  currency?: string; // sólo para UI, no se usa en demo
  courtName: string;
  dateLabel: string; // texto ya formateado
  timeLabel: string; // texto ya formateado
  onSuccess: () => void; // navegar/listar tras pago
}

type PaymentMethod = 'CARD' | 'BIZUM' | 'ONSITE' | 'CREDITS';

export default function PaymentModal(props: PaymentModalProps) {
  const { isOpen, onClose, reservationId, amount, currency = 'EUR', courtName, dateLabel, timeLabel, onSuccess } = props;
  const router = useRouter();

  // Función para verificar si la reserva es para hoy
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

  const [method, setMethod] = useState<PaymentMethod>('CARD');
  const [holder, setHolder] = useState<string>('');
  const [card, setCard] = useState<string>('');
  const [expiry, setExpiry] = useState<string>('');
  const [cvc, setCvc] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [loadingCredits, setLoadingCredits] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  
  // 🚀 GESTOS TÁCTILES PARA MÓVIL
  const [touchStart, setTouchStart] = useState<{ y: number; time: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  // 🚀 MANEJO DE GESTOS TÁCTILES
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
    
    // Solo permitir swipe hacia abajo
    if (deltaY > 0) {
      setIsDragging(true);
      setDragOffset(Math.min(deltaY, 150));
      e.preventDefault();
    }
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !isDragging || isSubmitting) {
      setTouchStart(null);
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    
    const swipeDistance = dragOffset;
    const swipeTime = Date.now() - touchStart.time;
    const swipeVelocity = swipeDistance / swipeTime;
    
    // Cerrar modal si el swipe es suficiente
    if (swipeDistance > 80 || swipeVelocity > 0.4) {
      handleClose();
    }
    
    // Reset states
    setTouchStart(null);
    setIsDragging(false);
    setDragOffset(0);
  };

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

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
        console.error('Respuesta inválida del endpoint de créditos:', response);
        setCreditsBalance(0);
      }
    } catch (error) {
      console.error('Error loading credits balance:', error);
      setCreditsBalance(0);
    } finally {
      setLoadingCredits(false);
    }
  };

  // Enfoque inicial y cierre con ESC
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  // Evitar scroll de fondo
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  const formattedAmount = useMemo(() => {
    try {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
    } catch {
      return `${amount}`;
    }
  }, [amount, currency]);

  // El flujo demo se elimina; sólo redirigimos a Redsys para tarjeta
  const handlePay = async () => {
    console.log('🚀 [PAYMENT-MODAL] Iniciando proceso de pago...');
    console.log('🚀 [PAYMENT-MODAL] Método seleccionado:', method);
    console.log('🚀 [PAYMENT-MODAL] Reservation ID:', reservationId);
    console.log('🚀 [PAYMENT-MODAL] Amount:', amount);
    console.log('🚀 [PAYMENT-MODAL] Credits balance:', creditsBalance);
    
    setError(null);
    
    if (method === 'CREDITS') {
      console.log('💰 [PAYMENT-MODAL] Procesando pago con créditos...');
      setIsSubmitting(true);
      try {
        // 🎁 CORREGIDO: Verificar saldo con el monto final (con descuento)
        const finalAmount = appliedPromo ? appliedPromo.finalAmount : amount;
        if (creditsBalance < finalAmount) {
          console.error('❌ [PAYMENT-MODAL] Saldo insuficiente:', creditsBalance, '<', finalAmount);
          throw new Error('Saldo insuficiente para realizar el pago');
        }

        console.log('✅ [PAYMENT-MODAL] Saldo suficiente, enviando request...');
        
        // 🎁 CORREGIDO: Usar finalAmount con descuento aplicado (ya declarado arriba)
        console.log('💰 [PAYMENT-MODAL] Monto para créditos:', {
          originalAmount: amount,
          finalAmount: finalAmount,
          appliedPromo: appliedPromo?.code,
          discount: appliedPromo?.savings
        });

        // Procesar pago con créditos
        const requestData = {
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
        };
        console.log('📤 [PAYMENT-MODAL] Enviando datos:', requestData);
        
        const data = await apiRequest(`/api/reservations/${reservationId}/pay`, {
          method: 'POST',
          body: JSON.stringify(requestData),
        });

        console.log('📥 [PAYMENT-MODAL] Respuesta recibida:', data);

        if (!data.success) {
          console.error('❌ [PAYMENT-MODAL] Error en respuesta:', data);
          throw new Error(data.message || 'No se pudo procesar el pago con créditos');
        }

        console.log('✅ [PAYMENT-MODAL] Pago exitoso, actualizando saldo local...');
        console.log('🎯 [PAYMENT-MODAL] data.success:', data.success);
        console.log('🎯 [PAYMENT-MODAL] data:', JSON.stringify(data, null, 2));
        // Actualizar saldo local con el monto final
        setCreditsBalance(prev => {
          const newBalance = prev - finalAmount;
          console.log('💰 [PAYMENT-MODAL] Balance actualizado:', prev, '->', newBalance);
          return newBalance;
        });
        
        console.log('🎉 [PAYMENT-MODAL] Pago con créditos exitoso, redirigiendo a página de éxito...');
        console.log('🎯 [PAYMENT-MODAL] reservationId para redirección:', reservationId);
        
        // Cerrar modal y redirigir a página de éxito (igual que tarjeta)
        onClose();
        const redirectUrl = `/dashboard/reservations/success?reservationId=${reservationId}`;
        console.log('🎯 [PAYMENT-MODAL] URL de redirección:', redirectUrl);
        router.push(redirectUrl);
        console.log('✅ [PAYMENT-MODAL] Redirección a página de éxito completada');
      } catch (e: any) {
        console.error('💥 [PAYMENT-MODAL] Error en proceso de pago:', e);
        setError(e?.message || 'No se pudo procesar el pago con créditos.');
        setIsSubmitting(false);
      }
      return;
    }
    
    if (method === 'ONSITE') {
      setIsSubmitting(true);
      try {
        // Actualizar la reserva con el método de pago ONSITE
        const data = await apiRequest(`/api/reservations/${reservationId}/payment-method`, {
          method: 'PUT',
          body: JSON.stringify({
            paymentMethod: 'ONSITE'
          }),
        });

        if (!data.success) {
          throw new Error('No se pudo actualizar el método de pago');
        }

        onClose();
        router.push(`/dashboard/reservations/success?reservationId=${reservationId}`);
      } catch (e: any) {
        setError(e?.message || 'No se pudo procesar la reserva.');
        setIsSubmitting(false);
      }
      return;
    }
    // 🎯 LÓGICA INTELIGENTE: Verificar si el monto final es 0 después del descuento
    const finalAmount = appliedPromo ? appliedPromo.finalAmount : amount;
    console.log('💰 [PAYMENT-MODAL] Monto final después de descuento:', finalAmount);
    console.log('🎁 [PAYMENT-MODAL] Promoción aplicada:', appliedPromo);
    
    // Si el monto final es 0, procesar como pago gratis (no enviar a Redsys)
    if (finalAmount <= 0) {
      console.log('🎉 [PAYMENT-MODAL] Monto final es 0, procesando como pago gratis...');
      setIsSubmitting(true);
      try {
        // Procesar pago gratis directamente
        const requestData = {
          paymentMethod: 'FREE', // Nuevo método para pagos gratis
          amount: 0,
          appliedPromo: appliedPromo ? {
            code: appliedPromo.code,
            finalAmount: appliedPromo.finalAmount,
            savings: appliedPromo.savings,
            rewardAmount: appliedPromo.reward?.amount || appliedPromo.savings
          } : undefined
        };
        
        console.log('📤 [PAYMENT-MODAL] Enviando datos de pago gratis:', requestData);
        
        const data = await apiRequest(`/api/reservations/${reservationId}/pay`, {
          method: 'POST',
          body: JSON.stringify(requestData),
        });

        if (!data.success) {
          throw new Error(data.message || 'No se pudo procesar el pago gratis');
        }

        console.log('✅ [PAYMENT-MODAL] Pago gratis exitoso, redirigiendo...');
        onClose();
        router.push(`/dashboard/reservations/success?reservationId=${reservationId}`);
      } catch (e: any) {
        console.error('❌ [PAYMENT-MODAL] Error en pago gratis:', e);
        setError(e?.message || 'No se pudo procesar el pago gratis.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    
    // Si el monto final > 0, enviar a Redsys con el monto correcto
    console.log('💳 [PAYMENT-MODAL] Monto final > 0, enviando a Redsys con monto:', finalAmount);
    setIsSubmitting(true);
    try {
      const bizumFlag = method === 'BIZUM' ? '&bizum=1' : '';
      const promoFlag = appliedPromo ? `&promo=${encodeURIComponent(appliedPromo.code)}&finalAmount=${finalAmount}` : '';
      const url = `/api/payments/redsys/redirect?rid=${encodeURIComponent(reservationId)}${bizumFlag}${promoFlag}`;
      console.log('🔗 [PAYMENT-MODAL] URL de redirección:', url);
      window.location.href = url;
    } catch (e: any) {
      console.error('❌ [PAYMENT-MODAL] Error redirigiendo a Redsys:', e);
      setError(e?.message || 'No se pudo iniciar el pago.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      aria-labelledby="payment-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog - Optimizado para móvil */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md mx-0 sm:mx-4 bg-white rounded-t-3xl sm:rounded-xl shadow-xl border border-gray-200 animate-slide-up sm:animate-none modal-mobile max-h-[85vh] sm:max-h-[65vh]"
        style={{
          transform: `translateY(${dragOffset}px)`,
          opacity: isDragging ? Math.max(0.6, 1 - dragOffset / 150) : 1,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header - Optimizado para móvil */}
        <div className="px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-4 border-b border-gray-200">
          {/* Handle visual para móvil */}
          <div className="sm:hidden w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg">
                💳
              </div>
              <div>
                <h3 id="payment-modal-title" className="text-lg font-bold text-gray-900">Pagar reserva</h3>
                <p className="text-sm text-gray-500">Selecciona tu método de pago preferido</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Cerrar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body - Optimizado para móvil y escritorio */}
        <div className="px-4 sm:px-6 py-3 space-y-2 max-h-[50vh] sm:max-h-[55vh] overflow-y-auto overscroll-behavior-contain">
          {/* Resumen */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-xs">🏟️</span>
              </div>
              <h4 className="font-semibold text-gray-900">Detalles de la reserva</h4>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">🏟️</span>
                  <span className="text-gray-600">Cancha</span>
                </div>
                <span className="font-medium text-gray-900">{courtName}</span>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">📅</span>
                  <span className="text-gray-600">Fecha</span>
                </div>
                <span className="font-medium text-gray-900">{dateLabel}</span>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">🕐</span>
                  <span className="text-gray-600">Hora</span>
                </div>
                <span className="font-medium text-gray-900">{timeLabel}</span>
              </div>

              {/* Código Promocional */}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <PromoCodeInput
                  amount={amount}
                  type="RESERVATION"
                  onPromoApplied={(promo) => {
                    console.log('🎁 [PAYMENT] Promoción aplicada:', promo);
                    setAppliedPromo(promo);
                  }}
                  onPromoRemoved={() => {
                    console.log('🗑️ [PAYMENT] Promoción removida');
                    setAppliedPromo(null);
                  }}
                />
              </div>
              
              <div className="border-t border-gray-300 pt-1 mt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-600">💰</span>
                    <span className="font-semibold text-gray-900">Total a pagar</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">
                    {appliedPromo 
                      ? `${appliedPromo.finalAmount.toFixed(2)}€` 
                      : formattedAmount
                    }
                  </span>
                </div>
                {appliedPromo && appliedPromo.savings > 0 && (
                  <p className="text-sm text-green-600 mt-1 text-right">
                    ¡Ahorraste {appliedPromo.savings.toFixed(2)}€!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Selector de método - Móvil optimizado */}
          <div>
            <div className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <span className="mr-2">💳</span>
              Método de pago
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMethod('CARD')}
                className={`group relative p-2 rounded-lg border-2 transition-all duration-300 hover:shadow-lg ${method === 'CARD' 
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 shadow-lg scale-105' 
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                    method === 'CARD' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                  }`}>
                    💳
                  </div>
                  <span className="font-medium text-xs">Tarjeta</span>
                  <span className="text-xs text-gray-500">Redsys</span>
                </div>
                {method === 'CARD' && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full"></div>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMethod('BIZUM')}
                className={`group relative p-2 rounded-lg border-2 transition-all duration-300 hover:shadow-lg ${method === 'BIZUM' 
                  ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 text-green-900 shadow-lg scale-105' 
                  : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50 active:scale-95'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                    method === 'BIZUM' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 group-hover:bg-green-100 group-hover:text-green-600'
                  }`}>
                    🤳
                  </div>
                  <span className="font-medium text-xs">Bizum</span>
                  <span className="text-xs text-gray-500">Redsys</span>
                </div>
                {method === 'BIZUM' && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full"></div>
                )}
              </button>
              {/* Pago en sede - Solo disponible para reservas de hoy */}
              {isReservationToday() && (
                <button
                  type="button"
                  onClick={() => setMethod('ONSITE')}
                  className={`group relative p-2 rounded-lg border-2 transition-all duration-300 hover:shadow-lg ${method === 'ONSITE' 
                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 text-orange-900 shadow-lg scale-105' 
                    : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50 active:scale-95'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                      method === 'ONSITE' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600'
                    }`}>
                      🏢
                    </div>
                    <span className="font-medium text-xs">En sede</span>
                    <span className="text-xs text-gray-500">Recepción</span>
                  </div>
                  {method === 'ONSITE' && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full"></div>
                  )}
                </button>
              )}
              
              {/* Botón de pago con créditos */}
              <button
                type="button"
                onClick={() => setMethod('CREDITS')}
                disabled={creditsBalance < amount || loadingCredits}
                className={`group relative p-2 rounded-lg border-2 transition-all duration-300 ${
                  method === 'CREDITS' 
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-900 shadow-lg scale-105' 
                    : creditsBalance < amount || loadingCredits
                    ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50 hover:shadow-lg active:scale-95'
                }`}
              >
                {loadingCredits ? (
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    </div>
                    <span className="text-xs">Cargando...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                      method === 'CREDITS' 
                        ? 'bg-purple-100 text-purple-600' 
                        : creditsBalance < amount
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600'
                    }`}>
                      💰
                    </div>
                    <span className="font-medium text-xs">Monedero</span>
                    <div className="flex flex-col items-center">
                      <span className={`text-xs ${
                        creditsBalance < amount ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {creditsBalance.toFixed(2)} créditos
                      </span>
                      {creditsBalance < amount && (
                        <span className="text-xs text-red-500">
                          Saldo insuficiente
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {method === 'CREDITS' && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-purple-500 rounded-full"></div>
                )}
                {creditsBalance < amount && !loadingCredits && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-red-400 rounded-full"></div>
                )}
              </button>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
              {method === 'CARD' && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Serás redirigido a Redsys para completar el pago con tarjeta de forma segura</span>
                </div>
              )}
              {method === 'BIZUM' && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Serás redirigido a Redsys para pagar con Bizum desde tu móvil</span>
                </div>
              )}
              {method === 'ONSITE' && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Tu reserva quedará confirmada y podrás pagar al llegar a nuestras instalaciones</span>
                </div>
              )}
              {method === 'CREDITS' && creditsBalance < (appliedPromo ? appliedPromo.finalAmount : amount) && (
                <div className="flex items-center space-x-2 text-sm text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Saldo insuficiente. Necesitas {(appliedPromo ? appliedPromo.finalAmount : amount).toFixed(2)} créditos, tienes {creditsBalance.toFixed(2)}</span>
                </div>
              )}
              {method === 'CREDITS' && creditsBalance >= (appliedPromo ? appliedPromo.finalAmount : amount) && (
                <div className="flex items-center space-x-2 text-sm text-purple-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Se descontarán {(appliedPromo ? appliedPromo.finalAmount : amount).toFixed(2)} créditos. Quedarán {(creditsBalance - (appliedPromo ? appliedPromo.finalAmount : amount)).toFixed(2)} créditos</span>
                </div>
              )}
            </div>
          </div>

          {/* Formulario de tarjeta eliminado (demo) */}
          {false && method === 'CARD' && (
            <div className="space-y-4"></div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{error}</div>
          )}
        </div>

        {/* Footer - Optimizado para móvil */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 safe-area-bottom">
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:bg-white disabled:opacity-50 font-semibold text-sm transition-all duration-200 active:scale-95 shadow-sm"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePay}
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-6 py-2 rounded-lg disabled:opacity-50 flex items-center justify-center font-bold text-sm transition-all duration-200 active:scale-95 shadow-lg ${
                method === 'CREDITS' 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white' 
                  : method === 'ONSITE'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="loading-pulse">Procesando pago...</span>
                </>
              ) : (
                <span>
                  {method === 'ONSITE' ? '🏢 Confirmar (pagar en sede)' : 
                   method === 'CREDITS' ? '💰 Pagar con créditos' :
                   method === 'BIZUM' ? (
                     <div className="flex items-center gap-2">
                       <img 
                         src="/images/bizum-logo.png" 
                         alt="Bizum" 
                         className="w-5 h-5 object-contain"
                         onError={(e) => {
                           e.currentTarget.style.display = 'none';
                           e.currentTarget.nextElementSibling?.classList.remove('hidden');
                         }}
                       />
                       <span className="hidden">🤳</span>
                       <span>Pagar con Bizum</span>
                     </div>
                   ) : '💳 Pagar ahora'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



