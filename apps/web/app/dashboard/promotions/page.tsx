'use client';

/**
 * @file Promotions Page (User)
 * @description Página para que usuarios vean promociones activas disponibles
 * 
 * @version 1.0.0
 * @since 2025-01-12
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Gift, Tag, Calendar, Clock, Copy, Check, TrendingUp } from 'lucide-react';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadPromotions();
  }, [filter]);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const response = await api.promotions.getActive(
        filter !== 'ALL' ? { type: filter } : undefined
      );
      
      if (response.success && response.data) {
        setPromotions(response.data.promotions || []);
      } else {
        setPromotions([]);
      }
    } catch (error) {
      console.error('Error cargando promociones:', error);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SIGNUP_BONUS: '🎁 Bono de Registro',
      RECHARGE_BONUS: '💰 Bono de Recarga',
      USAGE_BONUS: '⭐ Bono por Uso',
      REFERRAL_BONUS: '👥 Bono de Referido',
      DISCOUNT_CODE: '🏷️ Código de Descuento',
      SEASONAL: '📅 Promoción Temporal'
    };
    return labels[type] || type;
  };

  const getRewardDescription = (rewards: any) => {
    if (rewards.type === 'FIXED_CREDITS') {
      return `${rewards.value} créditos gratis`;
    } else if (rewards.type === 'PERCENTAGE_BONUS') {
      return `${rewards.value}% de bonus`;
    } else if (rewards.type === 'DISCOUNT_PERCENTAGE') {
      return `${rewards.value}% de descuento`;
    } else if (rewards.type === 'DISCOUNT_FIXED') {
      return `${rewards.value}€ de descuento`;
    }
    return 'Recompensa especial';
  };

  const getConditionsDescription = (conditions: any) => {
    const parts = [];
    if (conditions.minAmount) parts.push(`Monto mín: ${conditions.minAmount}€`);
    if (conditions.maxAmount) parts.push(`Monto máx: ${conditions.maxAmount}€`);
    if (conditions.minTopupAmount) parts.push(`Recarga mín: ${conditions.minTopupAmount}€`);
    if (conditions.dayOfWeek && conditions.dayOfWeek.length > 0) {
      const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      parts.push(`Días: ${conditions.dayOfWeek.map((d: number) => days[d]).join(', ')}`);
    }
    if (conditions.timeOfDay) {
      parts.push(`Horario: ${conditions.timeOfDay.start}-${conditions.timeOfDay.end}`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'Sin restricciones';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando promociones...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Gift className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Promociones Disponibles</h1>
          </div>
          <p className="text-gray-600">Aprovecha nuestras ofertas y ahorra en tus reservas y recargas</p>
        </div>

        {/* Filtros */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex space-x-2 min-w-max">
            {['ALL', 'RECHARGE_BONUS', 'USAGE_BONUS', 'DISCOUNT_CODE', 'SEASONAL'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                }`}
              >
                {type === 'ALL' ? 'Todas' : getTypeLabel(type).split(' ').slice(1).join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Promociones */}
        {promotions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay promociones disponibles
            </h3>
            <p className="text-gray-500">
              Vuelve pronto para ver nuevas ofertas
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-blue-300"
              >
                <div className="bg-gradient-to-r from-blue-500 to-green-500 p-4 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm opacity-90">{getTypeLabel(promo.type)}</p>
                      <h3 className="text-xl font-bold mt-1">{promo.name}</h3>
                    </div>
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Código */}
                  {promo.code && (
                    <div className="bg-gray-50 rounded-lg p-3 border-2 border-dashed border-gray-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Tag className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600">Código:</span>
                          <span className="font-mono font-bold text-lg text-blue-600">{promo.code}</span>
                        </div>
                        <button
                          onClick={() => handleCopyCode(promo.code)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-1"
                        >
                          {copiedCode === promo.code ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span className="text-xs">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span className="text-xs">Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Recompensa */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-xs text-green-700 mb-1">Recompensa</p>
                    <p className="text-lg font-bold text-green-600">
                      {getRewardDescription(promo.rewards)}
                    </p>
                  </div>

                  {/* Condiciones */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Condiciones</p>
                    <p className="text-sm text-gray-700">
                      {getConditionsDescription(promo.conditions)}
                    </p>
                  </div>

                  {/* Fechas */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Desde {new Date(promo.validFrom).toLocaleDateString()}</span>
                    </div>
                    {promo.validTo && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Hasta {new Date(promo.validTo).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Límite de uso */}
                  {promo.usageLimit && (
                    <div className="text-xs text-gray-500">
                      Disponibles: {promo.usageLimit - promo.usageCount} de {promo.usageLimit}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


