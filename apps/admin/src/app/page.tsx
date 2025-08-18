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
import { useAdminDashboard, useAdminReports } from '@/lib/hooks';
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
  const { reportData: usageData, loading: loadingUsage, getGeneralReport } = useAdminReports();
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
      // Cargar reporte de uso (ocupación) por defecto últimos 30 días
      getGeneralReport({ type: 'usage', period: '30d' }).catch((err) => {
        console.error('Error cargando reporte de uso:', err);
      });
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
            Bienvenido al panel de administración del Polideportivo Victoria Hernandez
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
            Bienvenido al panel de administración del Polideportivo Victoria Hernandez
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
              <p className="mt-2 text-gray-600">Polideportivo Victoria Hernandez - Dashboard Ejecutivo</p>
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

          {/* Occupancy Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ocupación de Canchas</h3>
              <span className="text-xs text-gray-500">Últimos 30 días</span>
            </div>
            {loadingUsage ? (
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="flex items-center text-gray-500 text-sm">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-2"></div>
                  Cargando ocupación...
                </div>
              </div>
            ) : (() => {
              console.log('Datos de uso recibidos:', usageData);
              const bySport = (usageData as any)?.bySport;
              console.log('bySport array:', bySport);
              return Array.isArray(bySport) && bySport.length > 0;
            })() ? (
              <div className="h-64">
                {/* Simple bar chart por deporte */}
                {(() => {
                  const bySport = ((usageData as any).bySport as Array<{ sportType: string; count: number }>);
                  console.log('Renderizando barras con datos:', bySport);
                  const max = Math.max(...bySport.map(s => Number(s.count || 0)), 1);
                  console.log('Máximo calculado:', max);
                  
                  // Colores por deporte
                  const getSportColor = (sportType: string) => {
                    const colors = {
                      'FUTBOL': { bg: 'bg-green-500', hover: 'hover:bg-green-600', border: 'border-green-300' },
                      'BASQUET': { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', border: 'border-orange-300' },
                      'TENIS': { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', border: 'border-blue-300' },
                      'VOLEIBOL': { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', border: 'border-purple-300' },
                      'PADDLE': { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', border: 'border-pink-300' },
                      'SQUASH': { bg: 'bg-teal-500', hover: 'hover:bg-teal-600', border: 'border-teal-300' },
                      'BASKETBALL': { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', border: 'border-orange-300' },
                      'FOOTBALL': { bg: 'bg-green-500', hover: 'hover:bg-green-600', border: 'border-green-300' },
                      'TENNIS': { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', border: 'border-blue-300' },
                      'VOLLEYBALL': { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', border: 'border-purple-300' },
                    };
                    return colors[sportType as keyof typeof colors] || { bg: 'bg-gray-500', hover: 'hover:bg-gray-600', border: 'border-gray-300' };
                  };
                  
                  return (
                    <div className="flex items-end h-56 justify-around bg-gray-50 p-4 rounded">
                      {bySport.map((s) => {
                        const colors = getSportColor(s.sportType);
                        return (
                          <div key={s.sportType} className="flex-1 flex flex-col items-center">
                            <div
                              className={`w-12 ${colors.bg} ${colors.hover} transition-colors rounded-t-md shadow-md border ${colors.border}`}
                              style={{ 
                                height: `${Math.max((Number(s.count || 0) / max) * 200, 20)}px`,
                                minHeight: '20px'
                              }}
                              title={`${s.sportType}: ${s.count}`}
                            />
                            <div className="mt-2 text-xs text-gray-600 truncate w-full text-center">
                              {s.sportType}
                            </div>
                            <div className="text-xs font-medium text-gray-700">{s.count}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 text-sm">Sin datos de ocupación en el período seleccionado</p>
              </div>
            )}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ingresos Diarios</h3>
            <span className="text-xs text-gray-500">Últimos 30 días</span>
          </div>
          {loading ? (
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="flex items-center text-gray-500 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-2"></div>
                Cargando ingresos...
              </div>
            </div>
          ) : Array.isArray(dashboardData?.trends?.daily) && dashboardData.trends.daily.length > 0 ? (
            <div className="h-64">
              {(() => {
                const dailyData = dashboardData.trends.daily as Array<{ date: string; revenue: number }>;
                console.log('Datos de ingresos diarios:', dailyData);
                const maxRevenue = Math.max(...dailyData.map(d => Number(d.revenue || 0)), 1);
                const minRevenue = Math.min(...dailyData.map(d => Number(d.revenue || 0)));
                console.log('Máximo ingreso:', maxRevenue, 'Mínimo:', minRevenue);
                
                return (
                  <div className="h-56 bg-gray-50 p-4 rounded">
                    {/* Gráfico de línea simple */}
                    <div className="relative h-full flex items-end justify-between">
                      {dailyData.slice(-14).map((day, index) => {
                        const revenue = Number(day.revenue || 0);
                        const heightPercent = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                        const date = new Date(day.date);
                        const shortDate = `${date.getDate()}/${date.getMonth() + 1}`;
                        
                        return (
                          <div key={day.date} className="flex flex-col items-center group">
                            {/* Barra */}
                            <div
                              className="w-6 bg-gradient-to-t from-green-500 to-green-400 rounded-t-md shadow-sm hover:from-green-600 hover:to-green-500 transition-all duration-200"
                              style={{ 
                                height: `${Math.max(heightPercent, 2)}%`,
                                minHeight: '4px'
                              }}
                              title={`${shortDate}: $${revenue.toLocaleString()}`}
                            />
                            {/* Fecha */}
                            <div className="mt-1 text-[10px] text-gray-500 rotate-45 origin-bottom-left">
                              {shortDate}
                            </div>
                            {/* Valor en hover */}
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded transition-opacity">
                              ${revenue.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Leyenda */}
                    <div className="mt-4 flex justify-between text-xs text-gray-600">
                      <span>Min: ${minRevenue.toLocaleString()}</span>
                      <span>Promedio: ${Math.round(dailyData.reduce((sum, d) => sum + Number(d.revenue || 0), 0) / dailyData.length).toLocaleString()}</span>
                      <span>Max: ${maxRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 text-sm">Sin datos de ingresos en el período seleccionado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}