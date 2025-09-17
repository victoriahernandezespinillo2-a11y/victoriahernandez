'use client';

import { useState } from 'react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'ONSITE' | 'CREDITS' | 'BIZUM';
    notes?: string;
  }) => Promise<void>;
  reservation: {
    id: string;
    userName: string;
    courtName: string;
    totalAmount: number;
    currentPaymentMethod?: string;
  };
  loading?: boolean;
}

export default function PaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  reservation,
  loading = false
}: PaymentConfirmationModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER' | 'ONSITE' | 'CREDITS' | 'BIZUM'>('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        paymentMethod,
        notes: notes.trim() || undefined
      });
      onClose();
      // Reset form
      setPaymentMethod('CASH');
      setNotes('');
    } catch (error) {
      console.error('Error confirming payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
    setPaymentMethod('CASH');
    setNotes('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar Pago
              </h3>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Reservation Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Detalles de la Reserva</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Usuario:</span> {reservation.userName}</p>
                <p><span className="font-medium">Cancha:</span> {reservation.courtName}</p>
                <p><span className="font-medium">Total:</span> €{reservation.totalAmount.toFixed(2)}</p>
                {reservation.currentPaymentMethod && (
                  <p><span className="font-medium">Método actual:</span> {reservation.currentPaymentMethod}</p>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Método de Pago
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'CASH', label: 'Efectivo', icon: '💵' },
                  { value: 'CARD', label: 'Tarjeta', icon: '💳' },
                  { value: 'TRANSFER', label: 'Transferencia', icon: '🏦' },
                  // Omitimos 'ONSITE' aquí: en recepción se debe registrar el método real
                  { value: 'CREDITS', label: 'Créditos', icon: '⭐' },
                  { value: 'BIZUM', label: 'Bizum', icon: '📱' }
                ].map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value as any)}
                    disabled={isSubmitting}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      paymentMethod === method.value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{method.icon}</span>
                      <span>{method.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notas (opcional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
                placeholder="Notas adicionales sobre el pago..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Confirmando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Confirmar Pago</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


