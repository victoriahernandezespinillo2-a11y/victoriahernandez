'use client';

/**
 * @file Promotions History Page (User)
 * @description Página para ver historial de promociones usadas por el usuario
 * 
 * @version 1.0.0
 * @since 2025-01-12
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { History, Gift, TrendingUp, Award, Calendar, Sparkles, Tag } from 'lucide-react';

export default function PromotionsHistoryPage() {
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await api.promotions.getMyHistory({ limit: 50 });
      
      if (response.success && response.data) {
        setHistory(response.data);
      } else {
        setHistory({ applications: [], stats: { totalApplications: 0, totalCreditsEarned: 0 } });
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      setHistory({ applications: [], stats: { totalApplications: 0, totalCreditsEarned: 0 } });
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      SIGNUP_BONUS: '🎁',
      RECHARGE_BONUS: '💰',
      USAGE_BONUS: '⭐',
      REFERRAL_BONUS: '👥',
      DISCOUNT_CODE: '🏷️',
      SEASONAL: '📅'
    };
    return icons[type] || '🎁';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SIGNUP_BONUS: 'Bono de Registro',
      RECHARGE_BONUS: 'Bono de Recarga',
      USAGE_BONUS: 'Bono por Uso',
      REFERRAL_BONUS: 'Bono de Referido',
      DISCOUNT_CODE: 'Código de Descuento',
      SEASONAL: 'Promoción Temporal'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando historial...</p>
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
            <History className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Mi Historial de Promociones</h1>
          </div>
          <p className="text-gray-600">Revisa todas las promociones que has usado</p>
        </div>

        {/* Estadísticas */}
        {history && history.stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Promociones Usadas</p>
                  <p className="text-3xl font-bold">{history.stats.totalApplications}</p>
                </div>
                <Award className="h-12 w-12 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm mb-1">Créditos Ganados</p>
                  <p className="text-3xl font-bold">{history.stats.totalCreditsEarned}</p>
                </div>
                <Sparkles className="h-12 w-12 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm mb-1">Tipos Diferentes</p>
                  <p className="text-3xl font-bold">
                    {history.stats.byType ? Object.values(history.stats.byType).filter((v: any) => v > 0).length : 0}
                  </p>
                </div>
                <TrendingUp className="h-12 w-12 opacity-80" />
              </div>
            </div>
          </div>
        )}

        {/* Lista de Aplicaciones */}
        {history && history.applications && history.applications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aún no has usado promociones
            </h3>
            <p className="text-gray-500 mb-6">
              Comienza a usar códigos promocionales para ahorrar
            </p>
            <a
              href="/dashboard/promotions"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ver Promociones Disponibles
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-200">
              {history?.applications?.map((app: any) => (
                <div key={app.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="text-3xl">{getTypeIcon(app.promotion.type)}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{app.promotion.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{getTypeLabel(app.promotion.type)}</p>
                        {app.promotion.code && (
                          <div className="flex items-center space-x-1 mt-2">
                            <Tag className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500 font-mono">{app.promotion.code}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1 mt-2 text-xs text-gray-400">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(app.appliedAt).toLocaleDateString()} {new Date(app.appliedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        +{Number(app.creditsAwarded).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">créditos</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


