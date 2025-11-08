'use client';

import { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  CreditCard,
  TrendingUp,
  Users,
  MapPin,
  Trophy,
  Star,
  XCircle,
  Gift,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useUserProfile, useReservations, useCenters } from '@/lib/hooks';
import { apiRequest, api } from '@/lib/api';
import { toast } from 'sonner';



export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { profile, loading: profileLoading, error: profileError, getProfile } = useUserProfile();
  const { reservations, loading: reservationsLoading, error: reservationsError, getReservations } = useReservations();
  const { centers, loading: centersLoading, getCenters } = useCenters();
  const [userStats, setUserStats] = useState({
    totalReservations: 0,
    upcomingReservations: 0,
    creditsUsed: 0,
    favoriteCourtType: '',
    memberSince: '',
    totalHoursPlayed: 0,
  });
  type UpcomingItem = { id: string; courtName: string; date: string; time: string; sport: string; status: string };
  type ActivityItem = { id: string; type: 'reservation' | 'payment' | 'other'; description: string; date: string; time: string };
  const [upcomingReservations, setUpcomingReservations] = useState<UpcomingItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [signupBonusChecked, setSignupBonusChecked] = useState(false);

  // Verificar y notificar SIGNUP_BONUS
  useEffect(() => {
    const checkSignupBonus = async () => {
      if (signupBonusChecked || !profile) return;
      
      try {
        const history = await api.promotions.getMyHistory({ limit: 5 });
        
        if (history.success && history.data?.applications) {
          const signupBonus = history.data.applications.find(
            (app: any) => app.promotion.type === 'SIGNUP_BONUS' && app.metadata?.autoApplied
          );
          
          // Verificar si es reciente (últimas 24 horas)
          if (signupBonus) {
            const appliedDate = new Date(signupBonus.appliedAt);
            const now = new Date();
            const hoursSince = (now.getTime() - appliedDate.getTime()) / (1000 * 60 * 60);
            
            if (hoursSince < 24) {
              toast.success('¡Bienvenido!', {
                description: `Has recibido ${Number(signupBonus.creditsAwarded).toFixed(0)} créditos de regalo 🎁`,
                duration: 5000,
              });
            }
          }
        }
        
        setSignupBonusChecked(true);
      } catch (error) {
        console.error('Error verificando SIGNUP_BONUS:', error);
        setSignupBonusChecked(true);
      }
    };

    if (profile && !signupBonusChecked) {
      checkSignupBonus();
    }
  }, [profile, signupBonusChecked]);

  // Calcular estadísticas del usuario
  useEffect(() => {
    if (reservations && reservations.length > 0) {
      const now = new Date();
      const upcoming = reservations.filter(r => new Date(r.date) >= now && r.status === 'confirmed');
      
      // Calcular horas totales SOLO de reservas que realmente se completaron
      // Solo contar reservas con estado COMPLETED (realmente completadas)
      // NO contar: cancelled (incluye NO_SHOW), pending (no pagadas), confirmed (solo pagadas pero no completadas)
      const playedReservations = reservations.filter(r => 
        r.status === 'completed' // Solo reservas que realmente se completaron exitosamente
      );
      
      const totalHours = playedReservations.reduce((acc, r) => {
        // Usar la duración calculada correctamente del hook, o calcular desde startTime/endTime si no está disponible
        const duration = r.duration || 60; // El hook ya calcula la duración correctamente
        return acc + duration;
      }, 0) / 60; // Convertir minutos a horas
      
      // Encontrar deporte favorito
      const sportCounts = reservations.reduce((acc, r) => {
        acc[r.courtType] = (acc[r.courtType] || 0) + 1;
        return acc;
      }, {});
      const favoriteCourtType = Object.keys(sportCounts).reduce((a, b) => 
        sportCounts[a] > sportCounts[b] ? a : b, '');

      // Calcular créditos usados correctamente usando datos reales
      // INCLUIR TANTO RESERVAS COMO PEDIDOS
      
      // 1. Créditos usados en RESERVAS
      const totalCostInEuros = reservations.reduce((acc, r) => acc + (r.cost || 0), 0);
      const centerConfigs = new Map();
      let totalCreditsUsedReservations = 0;
      
      // Procesar cada reserva con su centro específico
      for (const reservation of reservations) {
        const centerId = reservation.center?.id;
        const rawCost = reservation.cost ?? 0;
        const normalizedCost =
          typeof rawCost === 'number'
            ? rawCost
            : Number(String(rawCost).replace(',', '.').replace(/[^\d.-]/g, ''));

        if (!Number.isFinite(normalizedCost) || normalizedCost <= 0) {
          continue;
        }
        
        if (centerId) {
          // Obtener configuración del centro si no la tenemos
          if (!centerConfigs.has(centerId)) {
            const center = centers?.find(c => c.id === centerId);
            if (center) {
              const settings = center.settings || {};
              const creditsConfig = settings.credits || {};
              const euroPerCredit = typeof creditsConfig.euroPerCredit === 'number' && creditsConfig.euroPerCredit > 0 
                ? creditsConfig.euroPerCredit 
                : null;
              centerConfigs.set(centerId, euroPerCredit);
            }
          }
          
          const euroPerCredit = centerConfigs.get(centerId);
          if (euroPerCredit !== null) {
            // Usar configuración real del centro
            const creditsUsed = Number((normalizedCost / euroPerCredit).toFixed(2));
            totalCreditsUsedReservations += creditsUsed;
          } else {
            // Si no hay configuración, no podemos calcular créditos reales
            console.warn(`No se encontró configuración de créditos para el centro ${centerId}`);
          }
        }
      }
      
      // 2. Créditos usados en PEDIDOS (datos directos de la base de datos)
      const totalCreditsUsedOrders = orders.reduce((acc, order) => {
        const rawValue = Number(order?.creditsUsed ?? 0);
        return acc + (Number.isFinite(rawValue) ? rawValue : 0);
      }, 0);
      
      // 3. Total de créditos usados (reservas + pedidos)
      const creditsUsed = totalCreditsUsedReservations + totalCreditsUsedOrders;
      const normalizedCreditsUsed = Number.isFinite(creditsUsed)
        ? Number((Math.max(0, creditsUsed)).toFixed(2))
        : 0;

      setUserStats({
        totalReservations: reservations.length,
        upcomingReservations: upcoming.length,
        creditsUsed: normalizedCreditsUsed,
        favoriteCourtType,
        memberSince: profile?.createdAt || '',
        totalHoursPlayed: Math.round(totalHours),
      });

      // Próximas reservas (máximo 3)
      setUpcomingReservations(
        upcoming.slice(0, 3).map(r => ({
          id: r.id,
          courtName: r.courtName,
          date: r.date,
          time: `${r.startTime} - ${r.endTime}`,
          sport: r.courtType,
          status: r.status,
        }))
      );

      // Actividad reciente (últimas 3 reservas)
      const recent: ActivityItem[] = reservations
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3)
        .map(r => ({
          id: r.id,
          type: 'reservation' as const,
          description: `Reserva ${r.status === 'confirmed' ? 'confirmada' : r.status} para ${r.courtName}`,
          date: new Date(r.createdAt).toLocaleDateString(),
          time: new Date(r.createdAt).toLocaleTimeString(),
        }));
      setRecentActivity(recent);
    }
  }, [reservations, profile, centers, orders]);

  // Cargar datos (perfil, reservas, centros y pedidos) al montar
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          getProfile().catch(() => {}),
          getReservations().catch(() => {}),
          getCenters().catch(() => {}), // Cargar centros para obtener configuración de créditos
          // Cargar pedidos para incluir créditos usados en pedidos
          apiRequest('/api/orders').then((res: any) => {
            const items = res?.items || res || [];
            setOrders(items);
          }).catch(() => setOrders([]))
        ]);
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
      }
    };
    
    loadData();
  }, [getProfile, getReservations, getCenters]);

  if (status === 'loading' || profileLoading || reservationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
    return null;
  }

  if (profileError || reservationsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error al cargar el dashboard
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{profileError || reservationsError}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = session?.user;

  return (
    <div className="space-y-6 pb-24">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          ¡Bienvenido de vuelta, {user?.name ?? 'Usuario'}!
        </h1>
        <p className="text-blue-100">
          Aquí tienes un resumen de tu actividad en el polideportivo.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Reservas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {userStats.totalReservations}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Próximas Reservas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {userStats.upcomingReservations}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Créditos Usados</p>
              <p className="text-2xl font-semibold text-gray-900">
                {userStats.creditsUsed}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Horas Jugadas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {userStats.totalHoursPlayed}h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Reservations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Próximas Reservas
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {upcomingReservations.length > 0 ? upcomingReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {reservation.courtName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {reservation.date} • {reservation.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        reservation.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {reservation.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">
                  No tienes reservas próximas
                </p>
              )}
            </div>
            <div className="mt-4">
              <a
                href="/dashboard/reservations"
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                Ver todas las reservas →
              </a>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-green-600" />
              Actividad Reciente
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'reservation'
                          ? 'bg-blue-400'
                          : activity.type === 'payment'
                          ? 'bg-green-400'
                          : 'bg-red-400'
                      }`}
                    ></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {activity.date} • {activity.time}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">
                  No hay actividad reciente
                </p>
              )}
            </div>
            <div className="mt-4">
              <a
                href="/dashboard/history"
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                Ver historial completo →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h2>
        </div>
        <div className="p-6 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/dashboard/reservations/new"
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Calendar className="h-6 w-6 text-blue-600 mr-3" />
              <span className="text-sm font-medium text-blue-900">
                Nueva Reserva
              </span>
            </a>
            <a
              href="/dashboard/memberships"
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <CreditCard className="h-6 w-6 text-green-600 mr-3" />
              <span className="text-sm font-medium text-green-900">
                Comprar Créditos
              </span>
            </a>
            <a
              href="/dashboard/tournaments"
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Trophy className="h-6 w-6 text-purple-600 mr-3" />
              <span className="text-sm font-medium text-purple-900">
                Ver Torneos
              </span>
            </a>
            <a
              href="/dashboard/profile"
              className="flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <Users className="h-6 w-6 text-orange-600 mr-3" />
              <span className="text-sm font-medium text-orange-900">
                Mi Perfil
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}