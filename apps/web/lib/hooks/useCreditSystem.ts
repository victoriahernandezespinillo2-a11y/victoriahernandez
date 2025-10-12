/**
 * Hook: useCreditSystem
 * Hook para gestionar operaciones del sistema de créditos
 */

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

interface CreditBalance {
  balance: number;
  currency: string;
}

interface CreditTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface PaymentMethods {
  paymentMethods: Array<{
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
  }>;
  totalAmount: number;
  currency: string;
}

export function useCreditSystem() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obtener balance de créditos del usuario
   */
  const getBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest('/api/credits/balance');
      if (response.success) {
        setBalance(response.data);
      } else {
        setError(response.message || 'Error obteniendo balance');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener historial de transacciones
   */
  const getTransactions = async (options?: {
    limit?: number;
    offset?: number;
    fromDate?: Date;
    toDate?: Date;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());
      if (options?.fromDate) params.append('fromDate', options.fromDate.toISOString());
      if (options?.toDate) params.append('toDate', options.toDate.toISOString());

      const response = await apiRequest(`/api/credits/transactions?${params.toString()}`);
      if (response.success) {
        setTransactions(response.data.transactions || []);
      } else {
        setError(response.message || 'Error obteniendo transacciones');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener métodos de pago para una reserva
   */
  const getPaymentMethods = async (reservationId: string): Promise<PaymentMethods | null> => {
    try {
      const response = await apiRequest(`/api/reservations/${reservationId}/payment-methods`);
      if (response.success) {
        return response.data;
      } else {
        setError(response.message || 'Error obteniendo métodos de pago');
        return null;
      }
    } catch (err) {
      setError('Error de conexión');
      return null;
    }
  };

  /**
   * Procesar pago de reserva
   */
  const processPayment = async (params: {
    reservationId: string;
    paymentMethod: 'CREDITS' | 'CARD';
    amount: number;
    idempotencyKey?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`/api/reservations/${params.reservationId}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: params.paymentMethod,
          amount: params.amount,
          idempotencyKey: params.idempotencyKey
        })
      });

      if (response.success) {
        // Actualizar balance si fue pago con créditos
        if (params.paymentMethod === 'CREDITS') {
          await getBalance();
        }
        return response.data;
      } else {
        setError(response.message || 'Error procesando pago');
        return null;
      }
    } catch (err) {
      setError('Error de conexión');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verificar si el usuario puede permitirse una cantidad
   */
  const canAfford = async (amount: number): Promise<boolean> => {
    try {
      const response = await apiRequest(`/api/credits/can-afford?amount=${amount}`);
      return response.success && response.data.canAfford;
    } catch (err) {
      return false;
    }
  };

  /**
   * Cargar datos iniciales
   */
  useEffect(() => {
    getBalance();
  }, []);

  return {
    balance,
    transactions,
    loading,
    error,
    getBalance,
    getTransactions,
    getPaymentMethods,
    processPayment,
    canAfford,
    clearError: () => setError(null)
  };
}


