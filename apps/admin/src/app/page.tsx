'use client';

import {
  UsersIcon,
  CalendarDaysIcon,
  RectangleStackIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAdminDashboard } from '@/lib/hooks';
import { adminApi } from '@/lib/api';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Activity {
  id: string;
  type: string;
  user: string;
  action: string;
  timestamp: string;
  details?: string;
  target?: string;
  time?: string;
  icon?: string;
}

export default function AdminHomePage() {
  const { data: session, status } = useSession();
  const { dashboardData, loading, error, getDashboardStats } = useAdminDashboard();
  const router = useRouter();

  // Estado para actividad reciente
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Función para obtener actividad reciente
  const fetchRecentActivity = async () => {
    try {
      console.log('🔄 Iniciando fetchRecentActivity...');
      setLoadingActivities(true);
      console.log('📡 Llamando a adminApi.dashboard.getRecentActivity...');
      const data = await adminApi.dashboard.getRecentActivity({ limit: 5, hours: 24 }) as any;
      console.log('📥 Respuesta recibida:', data);
      if (data && data.activities) {
        console.log('✅ Actividades encontradas:', data.activities.length);
        setRecentActivities(data.activities as Activity[]);
      } else {
        console.log('⚠️ No se encontraron actividades en la respuesta');
        setRecentActivities([]);
      }
    } catch (error) {
      console.error('❌ Error obteniendo actividad reciente:', error);
      // Mantener datos por defecto en caso de error
      setRecentActivities([
        {
          id: 'default-1',
          type: 'system',
          user: 'Sistema',
          action: 'Error al cargar actividad',
          target: '',
          time: '',
          icon: 'ExclamationTriangleIcon',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoadingActivities(false);
      console.log('🏁 fetchRecentActivity completado');
    }
  };

  // Función para obtener el icono correcto
  const getActivityIcon = (iconName: string) => {
    switch (iconName) {
      case 'CalendarDaysIcon':
        return CalendarDaysIcon;
      case 'CurrencyDollarIcon':
        return CurrencyDollarIcon;
      case 'UsersIcon':
        return UsersIcon;
      case 'ExclamationTriangleIcon':
        return ExclamationTriangleIcon;
      default:
        return CalendarDaysIcon;
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      console.log('Ejecutando getDashboardStats...');
      getDashboardStats().catch(err => {
        console.error('Error en getDashboardStats:', err);
      });
      fetchRecentActivity();
    }
  }, [status, getDashboardStats]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // No redirigimos en cliente. El middleware protege las rutas.

  // Datos del dashboard con crecimiento real
  const stats = [
    {
      name: 'Usuarios Activos',
      stat: dashboardData?.metrics?.totalUsers || '0',
      icon: UsersIcon,
      change: dashboardData?.metrics?.growth?.users?.value || '+0.00',
      changeType: dashboardData?.metrics?.growth?.users?.isPositive !== false ? 'increase' : 'decrease',
    },
    {
      name: 'Reservas Totales',
      stat: dashboardData?.metrics?.totalReservations || '0',
      icon: CalendarDaysIcon,
      change: dashboardData?.metrics?.growth?.reservations?.value || '+0.00',
      changeType: dashboardData?.metrics?.growth?.reservations?.isPositive !== false ? 'increase' : 'decrease',
    },
    {
      name: 'Membresías Activas',
      stat: dashboardData?.metrics?.totalMemberships || '0',
      icon: RectangleStackIcon,
      change: dashboardData?.metrics?.growth?.memberships?.value || '+0.00',
      changeType: dashboardData?.metrics?.growth?.memberships?.isPositive !== false ? 'increase' : 'decrease',
    },
    {
      name: 'Ingresos Totales',
      stat: `$${Number(dashboardData?.metrics?.totalRevenue || 0).toLocaleString()}`,
      icon: CurrencyDollarIcon,
      change: dashboardData?.metrics?.growth?.revenue?.value || '+0.00',
      changeType: dashboardData?.metrics?.growth?.revenue?.isPositive !== false ? 'increase' : 'decrease',
    },
  ];



  const quickActions = [
    {
      name: 'Nueva Reserva',
      description: 'Crear una nueva reserva',
      href: '/reservations/new',
      icon: CalendarDaysIcon,
      iconForeground: 'text-teal-700',
      iconBackground: 'bg-teal-50',
    },
    {
      name: 'Agregar Usuario',
      description: 'Registrar nuevo usuario',
      href: '/users/new',
      icon: UsersIcon,
      iconForeground: 'text-purple-700',
      iconBackground: 'bg-purple-50',
    },
    {
      name: 'Gestionar Canchas',
      description: 'Administrar canchas',
      href: '/courts',
      icon: RectangleStackIcon,
      iconForeground: 'text-sky-700',
      iconBackground: 'bg-sky-50',
    },
    {
      name: 'Ver Reportes',
      description: 'Análisis y estadísticas',
      href: '/reports',
      icon: ChartBarIcon,
      iconForeground: 'text-yellow-700',
      iconBackground: 'bg-yellow-50',
    },
  ];

  // Estado de carga
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Bienvenido al panel de administración del Polideportivo Oroquieta
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Bienvenido al panel de administración del Polideportivo Oroquieta
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Error al cargar el dashboard</h3>
              <p className="text-red-600 mt-1">{error}</p>
              <button 
                onClick={() => getDashboardStats()}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="mt-2 text-gray-600">Polideportivo Oroquieta - Dashboard Ejecutivo</p>
            </div>
            {/* Menú de usuario y cerrar sesión se gestiona en Header */}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((item) => (
            <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <item.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{item.stat}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span
                    className={`${
                      item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    } font-medium`}
                  >
                    {item.change}
                  </span>
                  <span className="text-gray-500"> desde el mes pasado</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <div
                key={action.name}
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div>
                  <span
                    className={`rounded-lg inline-flex p-3 ring-4 ring-white ${
                      action.iconBackground
                    } ${action.iconForeground}`}
                  >
                    <action.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    <a href={action.href} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      {action.name}
                    </a>
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">{action.description}</p>
                </div>
                <span
                  className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
                  aria-hidden="true"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="m11.293 17.293 1.414 1.414L19.414 12l-6.707-6.707-1.414 1.414L15.586 11H6v2h9.586l-4.293 4.293z" />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Actividad Reciente
              </h3>
              <div className="flow-root">
                {loadingActivities ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-2 text-sm text-gray-500">Cargando actividad reciente...</span>
                  </div>
                ) : (
                  <ul className="-mb-8">
                    {recentActivities.map((activity, activityIdx) => (
                      <li key={activity.id}>
                        <div className="relative pb-8">
                          {activityIdx !== recentActivities.length - 1 ? (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                                {(() => {
                                  const IconComponent = getActivityIcon(activity.icon || 'CalendarDaysIcon');
                                  return <IconComponent className="h-5 w-5 text-white" aria-hidden="true" />;
                                })()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  <span className="font-medium text-gray-900">{activity.user}</span>{' '}
                                  {activity.action}{' '}
                                  {activity.target && (
                                    <span className="font-medium text-gray-900">{activity.target}</span>
                                  )}
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time>{activity.time}</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Occupancy Chart Placeholder */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ocupación de Canchas</h3>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Gráfico de ocupación (próximamente)</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos Mensuales</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Gráfico de ingresos (próximamente)</p>
          </div>
        </div>
      </div>
    </div>
  );
}