'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  CreditCard,
  Star,
  Check,
  Zap,
  Shield,
  Crown,
  Plus,
  Minus,
  ShoppingCart,
  Gift,
  TrendingUp,
} from 'lucide-react';

type ApiMembershipType = {
  type: 'BASIC' | 'PREMIUM' | 'VIP';
  name: string;
  monthlyPrice: number;
  benefits: Record<string, any>;
  popular?: boolean;
  isActive?: boolean;
};

type ApiMembership = {
  id: string;
  type: 'BASIC' | 'PREMIUM' | 'VIP';
  startDate: string;
  endDate: string;
  active: boolean;
  price: number;
};

export default function MembershipsPage() {
  const { data: session } = useSession();
  const [planTypes, setPlanTypes] = useState<ApiMembershipType[]>([]);
  const [currentMembership, setCurrentMembership] = useState<ApiMembership | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const userCredits = (session?.user as any)?.creditsBalance ?? 0;
  const userId = (session?.user as any)?.id as string | undefined;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  useEffect(() => {
    // Cargar tipos de membresía
    setLoadingPlans(true);
    fetch('/api/memberships/types', { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(json => {
        const plans = (json.data || json) as ApiMembershipType[];
        setPlanTypes(plans);
      })
      .catch((error) => {
        console.error('Error cargando planes:', error);
        setPlanTypes([]);
      })
      .finally(() => setLoadingPlans(false));

    // Cargar membresía actual
    fetch('/api/memberships?limit=1&sortBy=validUntil&sortOrder=desc', { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(json => {
        const memberships = (json.data?.memberships || json.memberships || []) as ApiMembership[];
        setCurrentMembership(memberships[0] || null);
        if (memberships[0]) setSelectedPlan(memberships[0].type.toLowerCase());
      })
      .catch(() => setCurrentMembership(null));
  }, []);

  const handleUpgradePlan = async (planKey: 'basic' | 'premium' | 'vip') => {
    setIsLoading(true);
    try {
      if (!userId) throw new Error('Usuario no autenticado');
      const mapKeyToType = { basic: 'BASIC', premium: 'PREMIUM', vip: 'VIP' } as const;

      const res = await fetch('/api/memberships', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type: mapKeyToType[planKey], duration: 1, paymentMethod: 'CASH', autoRenew: false }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const created = json.data || json;
      setCurrentMembership(created);
      setSelectedPlan(planKey);
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('Error al actualizar el plan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyCredits = async (packageId: string) => {
    setIsLoading(true);
    try {
      // Aquí iría la llamada a la API para comprar créditos
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('¡Créditos comprados exitosamente!');
    } catch (error) {
      console.error('Error buying credits:', error);
      alert('Error al comprar créditos. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentPlanName = useMemo(() => {
    const map = { BASIC: 'Básico', PREMIUM: 'Premium', VIP: 'VIP' } as const;
    return currentMembership ? map[currentMembership.type] : '—';
  }, [currentMembership]);

  const currentPlan = useMemo(() => {
    const key = (currentMembership?.type || '').toLowerCase();
    return planTypes.find(pt => pt.type.toLowerCase() === key) || null;
  }, [currentMembership, planTypes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Membresías y Créditos</h1>
        <p className="text-gray-500 mt-1">
          Gestiona tu plan de membresía y compra créditos adicionales
        </p>
      </div>

      {/* Current Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Estado Actual
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 capitalize">
                {currentPlanName}
              </div>
              <div className="text-sm text-gray-500">Plan Actual</div>
              <div className="text-xs text-gray-400 mt-1">
                Vence: {currentMembership?.endDate ? formatDate(currentMembership.endDate) : '—'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {userCredits}
              </div>
              <div className="text-sm text-gray-500">Créditos Disponibles</div>
            </div>
            {/* Reservas del mes: pendiente de endpoint específico */}
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {currentMembership ? formatCurrency(currentMembership.price) : '—'}
              </div>
              <div className="text-sm text-gray-500">Total Gastado</div>
            </div>
          </div>
        </div>
      </div>

      {/* Membership Plans */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Crown className="h-5 w-5 mr-2 text-purple-600" />
            Planes de Membresía
          </h2>
          <p className="text-gray-500 mt-1">
            Elige el plan que mejor se adapte a tus necesidades
          </p>
        </div>
        <div className="p-6">
          {loadingPlans ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Cargando planes de membresía...</p>
            </div>
          ) : planTypes.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Próximamente Nuevos Planes
                </h3>
                <p className="text-gray-500 text-sm">
                  Estamos preparando nuevos planes de membresía con beneficios exclusivos. 
                  Te notificaremos cuando estén disponibles.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {planTypes.map((plan) => {
                const IconComponent = plan.type === 'VIP' ? Crown : plan.type === 'PREMIUM' ? Star : Shield;
                const planKey = plan.type.toLowerCase() as 'basic' | 'premium' | 'vip';
                const isCurrentPlan = currentMembership?.type === plan.type;
                
                return (
                  <div
                    key={plan.type}
                    className={`relative rounded-lg border-2 p-6 transition-all ${
                      isCurrentPlan
                        ? 'border-green-500 bg-green-50'
                        : plan.popular
                        ? 'border-blue-500 bg-blue-50'
                        : plan.isActive === false
                        ? 'border-gray-300 bg-gray-100 opacity-75'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {plan.popular && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Más Popular
                        </span>
                      </div>
                    )}
                    
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Plan Actual
                        </span>
                      </div>
                    )}
                    
                    {plan.isActive === false && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                          No Disponible
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <IconComponent className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-gray-900">
                          {formatCurrency(plan.monthlyPrice)}
                        </span>
                        <span className="text-gray-500">/mes</span>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {Object.entries(plan.benefits || {}).map(([key, value]) => (
                        <li key={key} className="flex items-start text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600">{key}: {String(value)}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => !isCurrentPlan && plan.isActive !== false && handleUpgradePlan(planKey)}
                      disabled={isCurrentPlan || isLoading || plan.isActive === false}
                      className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                        isCurrentPlan
                          ? 'bg-green-100 text-green-800 cursor-not-allowed'
                          : plan.isActive === false
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {isCurrentPlan 
                        ? 'Plan Actual' 
                        : plan.isActive === false 
                        ? 'No Disponible' 
                        : isLoading 
                        ? 'Procesando...' 
                        : 'Seleccionar Plan'
                      }
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Paquetes de Créditos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-yellow-600" />
            Paquetes de Créditos
          </h2>
          <p className="text-gray-500 mt-1">
            Compra créditos adicionales para tus reservas
          </p>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <Zap className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Próximamente Disponible
            </h3>
            <p className="text-gray-500 text-sm">
              Estamos preparando paquetes de créditos con descuentos especiales para que puedas reservar más canchas a mejor precio.
            </p>
          </div>
        </div>
      </div>

      {/* Usage Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          💡 Consejos para Maximizar tus Créditos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">Ahorra con Membresías:</h4>
            <ul className="space-y-1">
              <li>• Los planes Premium y VIP incluyen descuentos automáticos</li>
              <li>• Las membresías renuevan créditos mensualmente</li>
              <li>• Cancela reservas con tiempo para recuperar créditos</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Optimiza tus Reservas:</h4>
            <ul className="space-y-1">
              <li>• Reserva en horarios de menor demanda</li>
              <li>• Compra paquetes grandes para obtener créditos bonus</li>
              <li>• Participa en torneos para ganar créditos adicionales</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}