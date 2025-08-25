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
  Smartphone,
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

type PaymentMethod = 'CARD_DEMO' | 'ONSITE';

export default function MobilePaymentModal(props: MobilePaymentModalProps) {
  const {
    isOpen,
    onClose,
    reservationId,
    amount,
    currency = 'COP',
    courtName,
    dateLabel,
    timeLabel,
    onSuccess,
  } = props;
  
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>('CARD_DEMO');
  const [holder, setHolder] = useState<string>('');
  const [card, setCard] = useState<string>('');
  const [expiry, setExpiry] = useState<string>('');
  const [cvc, setCvc] = useState<string>('');
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
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };
  
  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };
  
  const handleSubmit = async () => {
    if (method === 'CARD_DEMO' && (!holder || !card || !expiry || !cvc)) {
      setError('Por favor completa todos los campos de la tarjeta');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setStep('processing');
    
    try {
      // Simular procesamiento de pago
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStep('success');
      
      // Esperar un momento antes de cerrar
      setTimeout(() => {
        onSuccess();
        onClose();
        router.push('/dashboard/reservations/success?id=' + reservationId);
      }, 1500);
      
    } catch (err) {
      setError('Error al procesar el pago. Intenta nuevamente.');
      setStep('payment');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setStep('summary');
    setMethod('CARD_DEMO');
    setHolder('');
    setCard('');
    setExpiry('');
    setCvc('');
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
            {step === 'processing' && 'Procesando...'}
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
              {/* Selector de método de pago */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Método de Pago</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setMethod('CARD_DEMO')}
                    className={`w-full p-4 rounded-2xl border-2 transition-all ${
                      method === 'CARD_DEMO'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <CreditCard className="h-6 w-6 mr-3 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium">Tarjeta de Crédito/Débito</div>
                        <div className="text-sm text-gray-600">Pago seguro con tarjeta</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setMethod('ONSITE')}
                    className={`w-full p-4 rounded-2xl border-2 transition-all ${
                      method === 'ONSITE'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <MapPin className="h-6 w-6 mr-3 text-green-600" />
                      <div className="text-left">
                        <div className="font-medium">Pagar en el Lugar</div>
                        <div className="text-sm text-gray-600">Paga al llegar a la cancha</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
              
              {/* Formulario de tarjeta */}
              {method === 'CARD_DEMO' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del titular
                    </label>
                    <input
                      type="text"
                      value={holder}
                      onChange={(e) => setHolder(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Juan Pérez"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de tarjeta
                    </label>
                    <input
                      type="text"
                      value={card}
                      onChange={(e) => setCard(formatCardNumber(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vencimiento
                      </label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="MM/AA"
                        maxLength={5}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVC
                      </label>
                      <input
                        type="text"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
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
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-green-700 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {method === 'CARD_DEMO' ? 'Pagar Ahora' : 'Confirmar Reserva'}
                </button>
              </div>
            </div>
          )}
          
          {step === 'processing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Procesando tu pago...
              </h3>
              <p className="text-gray-600">
                Por favor espera mientras confirmamos tu reserva
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