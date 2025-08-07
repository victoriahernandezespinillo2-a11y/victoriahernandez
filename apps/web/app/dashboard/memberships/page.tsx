'use client';

import { useState } from 'react';
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

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
  popular?: boolean;
  color: string;
  icon: React.ComponentType<any>;
}

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

// Mock data - En producción esto vendría de la API
const membershipPlans: MembershipPlan[] = [
  {
    id: 'basic',
    name: 'Básico',
    price: 50000,
    credits: 100,
    features: [
      'Acceso a todas las canchas',
      'Reservas hasta 7 días anticipados',
      'Soporte por email',
      'Historial de reservas'
    ],
    color: 'gray',
    icon: Shield
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 80000,
    credits: 200,
    features: [
      'Todo lo del plan Básico',
      'Reservas hasta 30 días anticipados',
      'Descuento del 10% en todas las reservas',
      'Soporte prioritario',
      'Acceso a torneos exclusivos',
      'Cancelación gratuita hasta 1 hora antes'
    ],
    popular: true,
    color: 'blue',
    icon: Star
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 120000,
    credits: 350,
    features: [
      'Todo lo del plan Premium',
      'Reservas ilimitadas',
      'Descuento del 20% en todas las reservas',
      'Soporte 24/7',
      'Acceso prioritario a nuevas canchas',
      'Invitaciones a eventos especiales',
      'Entrenador personal (2 sesiones/mes)'
    ],
    color: 'purple',
    icon: Crown
  }
];

const creditPackages: CreditPackage[] = [
  {
    id: 'small',
    credits: 50,
    price: 25000
  },
  {
    id: 'medium',
    credits: 100,
    price: 45000,
    bonus: 10
  },
  {
    id: 'large',
    credits: 200,
    price: 80000,
    bonus: 30,
    popular: true
  },
  {
    id: 'xlarge',
    credits: 500,
    price: 180000,
    bonus: 100
  }
];

// Mock current user data
const currentUser = {
  membershipType: 'premium',
  creditsBalance: 150,
  membershipExpiry: '2024-03-15',
  totalSpent: 240000,
  reservationsThisMonth: 8
};

export default function MembershipsPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>(currentUser.membershipType);
  const [selectedCredits, setSelectedCredits] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleUpgradePlan = async (planId: string) => {
    setIsLoading(true);
    try {
      // Aquí iría la llamada a la API para actualizar el plan
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('¡Plan actualizado exitosamente!');
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('Error al actualizar el plan. Inténtalo de nuevo.');
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

  const currentPlan = membershipPlans.find(plan => plan.id === currentUser.membershipType);

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
                {currentUser.membershipType}
              </div>
              <div className="text-sm text-gray-500">Plan Actual</div>
              <div className="text-xs text-gray-400 mt-1">
                Vence: {formatDate(currentUser.membershipExpiry)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {currentUser.creditsBalance}
              </div>
              <div className="text-sm text-gray-500">Créditos Disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {currentUser.reservationsThisMonth}
              </div>
              <div className="text-sm text-gray-500">Reservas Este Mes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(currentUser.totalSpent)}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {membershipPlans.map((plan) => {
              const IconComponent = plan.icon;
              const isCurrentPlan = plan.id === currentUser.membershipType;
              const colorClasses = {
                gray: 'border-gray-200 bg-gray-50',
                blue: 'border-blue-200 bg-blue-50',
                purple: 'border-purple-200 bg-purple-50'
              };
              
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-lg border-2 p-6 transition-all ${
                    isCurrentPlan
                      ? 'border-green-500 bg-green-50'
                      : plan.popular
                      ? 'border-blue-500 bg-blue-50'
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

                  <div className="text-center mb-4">
                    <IconComponent className={`h-8 w-8 mx-auto mb-2 ${
                      plan.color === 'gray' ? 'text-gray-600' :
                      plan.color === 'blue' ? 'text-blue-600' :
                      'text-purple-600'
                    }`} />
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-gray-500">/mes</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {plan.credits} créditos incluidos
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => !isCurrentPlan && handleUpgradePlan(plan.id)}
                    disabled={isCurrentPlan || isLoading}
                    className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                      isCurrentPlan
                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {isCurrentPlan ? 'Plan Actual' : isLoading ? 'Procesando...' : 'Seleccionar Plan'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Credit Packages */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-lg border-2 p-4 transition-all ${
                  pkg.popular
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Mejor Valor
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {pkg.credits}
                    {pkg.bonus && (
                      <span className="text-sm text-green-600 ml-1">
                        +{pkg.bonus}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    {pkg.bonus ? `${pkg.credits + pkg.bonus} créditos totales` : 'créditos'}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 mb-3">
                    {formatCurrency(pkg.price)}
                  </div>
                  
                  {pkg.bonus && (
                    <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mb-3">
                      <Gift className="h-3 w-3 inline mr-1" />
                      +{pkg.bonus} créditos gratis
                    </div>
                  )}

                  <button
                    onClick={() => handleBuyCredits(pkg.id)}
                    disabled={isLoading}
                    className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      pkg.popular
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50`}
                  >
                    <ShoppingCart className="h-4 w-4 inline mr-1" />
                    {isLoading ? 'Comprando...' : 'Comprar'}
                  </button>
                </div>
              </div>
            ))}
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