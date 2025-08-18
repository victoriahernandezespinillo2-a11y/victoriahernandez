"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

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

  const [method, setMethod] = useState<PaymentMethod>('CARD_DEMO');
  const [holder, setHolder] = useState<string>('');
  const [card, setCard] = useState<string>('');
  const [expiry, setExpiry] = useState<string>('');
  const [cvc, setCvc] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      onSuccess();
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
      onSuccess();
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
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-labelledby="payment-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-xl border border-gray-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 id="payment-modal-title" className="text-lg font-semibold text-gray-900">Pagar reserva</h3>
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Resumen */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-700 flex justify-between"><span className="text-gray-500">Cancha</span><span className="font-medium">{courtName}</span></div>
            <div className="text-sm text-gray-700 flex justify-between"><span className="text-gray-500">Fecha</span><span className="font-medium">{dateLabel}</span></div>
            <div className="text-sm text-gray-700 flex justify-between"><span className="text-gray-500">Hora</span><span className="font-medium">{timeLabel}</span></div>
            <div className="text-sm text-gray-900 flex justify-between mt-2 pt-2 border-t border-gray-200"><span className="font-medium">Total</span><span className="font-semibold">{formattedAmount}</span></div>
          </div>

          {/* Selector de método */}
          <div>
            <div className="text-sm font-medium text-gray-900 mb-2">Método de pago</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('CARD_DEMO')}
                className={`p-3 rounded-md border text-sm ${method === 'CARD_DEMO' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Tarjeta (demo)
              </button>
              <button
                type="button"
                onClick={() => setMethod('ONSITE')}
                className={`p-3 rounded-md border text-sm ${method === 'ONSITE' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Pagar en sede
              </button>
            </div>
          </div>

          {/* Formulario de tarjeta (demo) */}
          {method === 'CARD_DEMO' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Titular de la tarjeta</label>
                <input
                  ref={firstFieldRef}
                  type="text"
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Número de tarjeta</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={card}
                  onChange={(e) => setCard(e.target.value.replace(/[^0-9\s]/g, ''))}
                  placeholder="4242 4242 4242 4242"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Vencimiento</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value.replace(/[^0-9/]/g, ''))}
                    placeholder="MM/YY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">CVC</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={isSubmitting}
            className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Procesando...
              </span>
            ) : (
              <span>
                {method === 'ONSITE' ? 'Confirmar (pagar en sede)' : 'Pagar ahora (demo)'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}



