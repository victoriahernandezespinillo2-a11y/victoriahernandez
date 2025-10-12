'use client';

/**
 * @file PromoCodeInput Component
 * @description Componente reutilizable para ingresar y validar códigos promocionales
 * 
 * @version 1.0.0
 * @since 2025-01-12
 */

import { useState } from 'react';
import { Tag, Loader2, Check, X, Gift } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface PromoCodeInputProps {
  /** Monto de la transacción (para calcular bonus porcentual) */
  amount: number;
  /** Tipo de transacción: TOPUP (recarga) o RESERVATION (reserva) */
  type: 'TOPUP' | 'RESERVATION';
  /** Callback cuando se aplica exitosamente un código */
  onPromoApplied: (promotion: AppliedPromotion) => void;
  /** Callback cuando se remueve un código aplicado */
  onPromoRemoved: () => void;
}

interface AppliedPromotion {
  valid: boolean;
  promotion: {
    id: string;
    name: string;
    type: string;
  };
  reward: {
    amount: number;
    isDiscount: boolean;
    description: string;
  };
  originalAmount: number;
  finalAmount: number;
  savings: number;
  bonus: number;
}

/**
 * Componente para ingresar códigos promocionales
 * 
 * @description Permite al usuario ingresar un código promocional,
 * lo valida contra el backend y muestra el beneficio obtenido.
 * 
 * @example
 * <PromoCodeInput
 *   amount={100}
 *   type="TOPUP"
 *   onPromoApplied={(promo) => setDiscount(promo.savings)}
 *   onPromoRemoved={() => setDiscount(0)}
 * />
 */
export function PromoCodeInput({ 
  amount, 
  type, 
  onPromoApplied, 
  onPromoRemoved 
}: PromoCodeInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromotion | null>(null);

  /**
   * Validar código promocional
   */
  const handleApply = async () => {
    if (!code.trim()) {
      setError('Ingresa un código válido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔍 [PROMO-CODE] Validando código:', code, 'para monto:', amount);

      // Usar apiRequest que maneja autenticación automáticamente
      const data = await apiRequest('/api/promotions/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: code.toUpperCase(),
          amount,
          type
        })
      });

      console.log('📥 [PROMO-CODE] Respuesta del servidor:', data);

      if (data) {
        console.log('✅ [PROMO-CODE] Código válido');
        setAppliedPromo(data);
        onPromoApplied(data);
      } else {
        console.log('❌ [PROMO-CODE] Código inválido');
        setError('Código promocional inválido');
      }
    } catch (err) {
      console.error('❌ [PROMO-CODE] Error:', err);
      setError('Error al validar el código');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remover código aplicado
   */
  const handleRemove = () => {
    console.log('🗑️ [PROMO-CODE] Removiendo código aplicado');
    setCode('');
    setAppliedPromo(null);
    setError('');
    onPromoRemoved();
  };

  /**
   * Vista cuando el código está aplicado
   */
  if (appliedPromo) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="bg-green-500 rounded-full p-2 mt-0.5">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Gift className="h-4 w-4 text-green-700" />
                <p className="text-sm font-semibold text-green-900">
                  {appliedPromo.promotion.name}
                </p>
              </div>
              <p className="text-xs text-green-700 mb-2">
                {appliedPromo.reward.description}
              </p>
              <div className="bg-white rounded-lg p-2 border border-green-200">
                {appliedPromo.reward.isDiscount ? (
                  <>
                    <p className="text-xs text-gray-600">Ahorro:</p>
                    <p className="text-lg font-bold text-green-600">
                      {appliedPromo.savings}€
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-600">Bonus:</p>
                    <p className="text-lg font-bold text-green-600">
                      +{appliedPromo.bonus} créditos
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-green-600 hover:text-green-800 transition-colors p-1"
            aria-label="Remover código"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  /**
   * Vista del input
   */
  return (
    <div className="space-y-2">
      <label className="flex items-center text-sm font-medium text-gray-700">
        <Tag className="h-4 w-4 mr-1.5 text-gray-500" />
        ¿Tienes un código promocional?
      </label>
      
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApply();
              }
            }}
            placeholder="CODIGO123"
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all uppercase text-sm font-mono"
            disabled={loading}
            maxLength={20}
          />
        </div>
        
        <button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center space-x-2 shadow-sm hover:shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Validando...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>Aplicar</span>
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <X className="h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      <p className="text-xs text-gray-500">
        Los códigos promocionales se aplican automáticamente al procesar el pago
      </p>
    </div>
  );
}


