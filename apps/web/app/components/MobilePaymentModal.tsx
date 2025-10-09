"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

type PaymentMethod = 'CARD' | 'BIZUM' | 'ONSITE';

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
  
  // Gestos táctiles para cerrar
  const [touchStart, setTouchStart] = useState<{ y: number; time: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
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
  
  const resetForm = () => {
    setStep('summary');
    setMethod('CARD');
    setError(null);
    setIsSubmitting(false);
  };
  
  useEffect(() => {
    if (isOpen) {
      resetForm();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
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
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button
            onClick={step === 'summary' ? onClose : () => setStep('summary')}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {step === 'summary' ? <X className="h-6 w-6" /> : <ArrowLeft className="h-6 w-6" />}
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'summary' && 'Confirmar Reserva'}
            {step === 'payment' && 'Método de Pago'}
            {step === 'processing' && 'Redirigiendo al pago...'}
            {step === 'success' && '¡Reserva Confirmada!'}
          </h2>
          <div className="w-10" />
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {step === 'summary' && (
            <div className="space-y-6">
              {/* Resumen de la reserva */}
              <div className="bg-blue-50 rounded-2xl p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Detalles de la Reserva</h3>
                <div className="space-y-3">
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
              
              {/* Botón continuar */}
              <button
                onClick={() => setStep('payment')}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-blue-700 transition-colors active:scale-95"
              >
                Continuar al Pago
              </button>
            </div>
          )}
          
          {step === 'payment' && (
            <div className="space-y-6">
              {/* Selector método */}
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 mb-3">Método de pago</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <button
                    type="button"
                    onClick={() => setMethod('ONSITE')}
                    className={`p-4 rounded-xl border text-sm font-medium transition-all duration-200 ${method === 'ONSITE' ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md scale-105' : 'border-gray-300 text-gray-700'}`}
                  >
                    🏢 Pago en sede
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
                  {isSubmitting ? 'Procesando...' : method === 'ONSITE' ? 'Confirmar (pagar en sede)' : method === 'BIZUM' ? 'Pagar con Bizum' : 'Pagar ahora'}
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