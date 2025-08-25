"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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

type PaymentMethod = 'CARD_DEMO' | 'ONSITE';

export default function PaymentModal(props: PaymentModalProps) {
  const { isOpen, onClose, reservationId, amount, currency = 'COP', courtName, dateLabel, timeLabel, onSuccess } = props;
  const router = useRouter();

  const [method, setMethod] = useState<PaymentMethod>('CARD_DEMO');
  const [holder, setHolder] = useState<string>('');
  const [card, setCard] = useState<string>('');
  const [expiry, setExpiry] = useState<string>('');
  const [cvc, setCvc] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
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
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(amount);
    } catch {
      return `${amount}`;
    }
  }, [amount, currency]);

  const validateCardDemo = (): string | null => {
    if (method !== 'CARD_DEMO') return null;
    if (!holder.trim()) return 'Nombre del titular requerido';
    const digits = card.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(digits)) return 'Número de tarjeta inválido (16 dígitos)';
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'Fecha inválida (MM/YY)';
    const match = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return 'Fecha inválida (MM/YY)';
    const mm = Number(match[1]);
    const yy = Number(match[2]);
    if (!Number.isFinite(mm) || !Number.isFinite(yy)) return 'Fecha inválida (MM/YY)';
    if (mm < 1 || mm > 12) return 'Mes inválido';
    if (!/^\d{3,4}$/.test(cvc)) return 'CVC inválido';
    return null;
  };

  const handlePay = async () => {
    setError(null);
    if (method === 'ONSITE') {
      onClose();
      // Redirigir a página de éxito
      router.push(`/dashboard/reservations/success?reservationId=${reservationId}`);
      return;
    }
    const validation = validateCardDemo();
    if (validation) {
      setError(validation);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/pay-demo`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      onClose();
      // Redirigir a página de éxito
      router.push(`/dashboard/reservations/success?reservationId=${reservationId}`);
    } catch (e: any) {
      setError(e?.message || 'No se pudo completar el pago.');
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
        className="relative w-full max-w-lg mx-0 sm:mx-4 bg-white rounded-t-3xl sm:rounded-xl shadow-xl border border-gray-200 animate-slide-up sm:animate-none modal-mobile"
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
            <h3 id="payment-modal-title" className="text-lg sm:text-lg font-semibold text-gray-900">💳 Pagar reserva</h3>
            <button
              onClick={handleClose}
              className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none rounded-full hover:bg-gray-100 button-native touch-feedback"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body - Optimizado para móvil */}
        <div className="px-3 xs:px-4 sm:px-6 py-4 xs:py-5 space-y-4 xs:space-y-5 max-h-[65vh] xs:max-h-[60vh] sm:max-h-none overflow-y-auto overscroll-behavior-contain">
          {/* Resumen */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-700 flex justify-between"><span className="text-gray-500">Cancha</span><span className="font-medium">{courtName}</span></div>
            <div className="text-sm text-gray-700 flex justify-between"><span className="text-gray-500">Fecha</span><span className="font-medium">{dateLabel}</span></div>
            <div className="text-sm text-gray-700 flex justify-between"><span className="text-gray-500">Hora</span><span className="font-medium">{timeLabel}</span></div>
            <div className="text-sm text-gray-900 flex justify-between mt-2 pt-2 border-t border-gray-200"><span className="font-medium">Total</span><span className="font-semibold">{formattedAmount}</span></div>
          </div>

          {/* Selector de método - Móvil optimizado */}
          <div>
            <div className="text-sm font-medium text-gray-900 mb-3">💳 Método de pago</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('CARD_DEMO')}
                className={`p-4 sm:p-3 rounded-xl sm:rounded-md border text-sm font-medium transition-all duration-200 button-native touch-feedback ${method === 'CARD_DEMO' ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md scale-105' : 'border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95'}`}
              >
                💳 Tarjeta (demo)
              </button>
              <button
                type="button"
                onClick={() => setMethod('ONSITE')}
                className={`p-4 sm:p-3 rounded-xl sm:rounded-md border text-sm font-medium transition-all duration-200 button-native touch-feedback ${method === 'ONSITE' ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md scale-105' : 'border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95'}`}
              >
                🏢 Pagar en sede
              </button>
            </div>
          </div>

          {/* Formulario de tarjeta (demo) - Móvil optimizado */}
          {method === 'CARD_DEMO' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">👤 Titular de la tarjeta</label>
                <input
                  ref={firstFieldRef}
                  type="text"
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-4 py-4 sm:py-3 border border-gray-300 rounded-xl sm:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm touch-manipulation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">💳 Número de tarjeta</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={card}
                  onChange={(e) => setCard(e.target.value.replace(/[^0-9\s]/g, ''))}
                  placeholder="4242 4242 4242 4242"
                  className="w-full px-4 py-4 sm:py-3 border border-gray-300 rounded-xl sm:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm touch-manipulation"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">📅 Vencimiento</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value.replace(/[^0-9/]/g, ''))}
                    placeholder="MM/YY"
                    className="w-full px-4 py-4 sm:py-3 border border-gray-300 rounded-xl sm:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">🔒 CVC</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123"
                    className="w-full px-4 py-4 sm:py-3 border border-gray-300 rounded-xl sm:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm touch-manipulation"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">Esta es una simulación. No se realizará ningún cargo real.</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{error}</div>
          )}
        </div>

        {/* Footer - Optimizado para móvil */}
        <div className="px-3 xs:px-4 sm:px-6 py-4 border-t border-gray-200 safe-area-bottom">
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-6 py-4 sm:py-2 border border-gray-300 text-gray-700 rounded-xl sm:rounded-md hover:bg-gray-50 disabled:opacity-50 font-medium text-base sm:text-sm button-native touch-feedback transition-all duration-200 active:scale-95"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePay}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-4 sm:py-2 bg-green-600 text-white rounded-xl sm:rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center font-medium text-base sm:text-sm button-native touch-feedback transition-all duration-200 active:scale-95 shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="loading-pulse">Procesando pago...</span>
                </>
              ) : (
                <span>{method === 'ONSITE' ? '🏢 Confirmar (pagar en sede)' : '💳 Pagar ahora (demo)'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



