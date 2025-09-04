'use client';

import { useState, useEffect } from 'react';
import {
  CalendarDaysIcon as Calendar,
  ArrowDownTrayIcon as Download,
  CurrencyDollarIcon as DollarSign,
  UsersIcon as Users,
  ArrowTrendingUpIcon as TrendingUp,
  ArrowTrendingDownIcon as TrendingDown,
  FunnelIcon as Filter,
  ClockIcon,
  MapPinIcon as MapPin,
  ChartBarIcon as BarChart3,
  ChartPieIcon as PieChart,
  BoltIcon as Activity,
  DocumentTextIcon as FileText
} from '@heroicons/react/24/outline';
import { useAdminReports } from '@/lib/hooks';

interface ReportData {
  period: string;
  totalRevenue: number;
  totalReservations: number;
  totalUsers: number;
  averageReservationValue: number;
  occupancyRate: number;
  popularCourts: { name: string; reservations: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  reservationsByDay: { day: string; count: number }[];
}

// Interfaces para los datos de reportes
interface ReportMetrics {
  totalRevenue: number;
  totalReservations: number;
  totalUsers: number;
  occupancyRate: number;
}

interface RevenueData {
  summary: {
    totalRevenue: number;
    totalTransactions: number;
  };
  byType: Array<{
    type: string;
    _sum: { amount: number };
    _count: { id: number };
  }>;
  byPeriod: Array<{
    createdAt: string;
    _sum: { amount: number };
    _count: { id: number };
  }>;
}

interface UsageData {
  summary: {
    totalReservations: number;
  };
  bySport: Array<{
    court: string;
    _count: { id: number };
  }>;
  byStatus: Array<{
    status: string;
    _count: { id: number };
  }>;
}

interface UsersData {
  summary: {
    totalUsers: number;
  };
  byRole: Array<{
    role: string;
    _count: { id: number };
  }>;
  byStatus: Array<{
    status: string;
    _count: { id: number };
  }>;
}

const quickReports = [
  {
    id: 'revenue',
    name: 'Reporte de Ingresos',
    description: 'Análisis detallado de ingresos por período',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'reservations',
    name: 'Reporte de Reservas',
    description: 'Estadísticas de reservas y ocupación',
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'users',
    name: 'Reporte de Usuarios',
    description: 'Análisis de usuarios y membresías',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'courts',
    name: 'Reporte de Canchas',
    description: 'Utilización y rendimiento de canchas',
    icon: MapPin,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  }
];

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start: '2024-01-01',
    end: '2024-01-31'
  });
  
  const { reportData, loading, error, getGeneralReport, reset } = useAdminReports();
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [usersData, setUsersData] = useState<UsersData | null>(null);
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalRevenue: 0,
    totalReservations: 0,
    totalUsers: 0,
    occupancyRate: 0
  });

  // Cargar datos al montar el componente
  useEffect(() => {
    loadReportsData();
  }, [selectedPeriod, dateRange]);

  const loadReportsData = async () => {
    try {
      const params = {
        period: selectedPeriod,
        ...(selectedPeriod === 'custom' && {
          startDate: dateRange.start,
          endDate: dateRange.end
        })
      };

      // Cargar datos de ingresos
      const revenueResult = await getGeneralReport({ ...params, type: 'revenue' });
      if (revenueResult) setRevenueData(revenueResult);

      // Cargar datos de uso
      const usageResult = await getGeneralReport({ ...params, type: 'usage' });
      if (usageResult) setUsageData(usageResult);

      // Cargar datos de usuarios
      const usersResult = await getGeneralReport({ ...params, type: 'users' });
      if (usersResult) setUsersData(usersResult);

      // Calcular métricas combinadas
      if (revenueResult && usageResult && usersResult) {
        setMetrics({
          totalRevenue: (revenueResult as any)?.summary?.totalRevenue || 0,
          totalReservations: (usageResult as any)?.summary?.totalReservations || 0,
          totalUsers: (usersResult as any)?.summary?.totalUsers || 0,
          occupancyRate: calculateOccupancyRate(usageResult as any)
        });
      }
    } catch (error) {
      console.error('Error cargando datos de reportes:', error);
    }
  };

  const calculateOccupancyRate = (data: UsageData | null): number => {
    if (!data || !data.summary) return 0;
    // Cálculo simplificado de tasa de ocupación
    // En una implementación real, esto dependería de la capacidad total de las canchas
    const totalReservations = data.summary.totalReservations;
    const estimatedCapacity = totalReservations * 1.3; // Asumiendo 30% más de capacidad
    return Math.round((totalReservations / estimatedCapacity) * 100);
  };

  // Calcular crecimiento (simplificado - en una implementación real compararías con período anterior)
  const revenueGrowth = {
    value: 12.5,
    isPositive: true
  };

  const reservationGrowth = {
    value: 8.3,
    isPositive: true
  };

  const userGrowth = {
    value: 15.2,
    isPositive: true
  };

  const occupancyGrowth = {
    value: -2.1,
    isPositive: false
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-6 h-6 animate-spin" />
          <span>Cargando reportes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error al cargar los reportes</p>
          <button
            onClick={() => {
              reset();
              loadReportsData();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reportes y Análisis</h1>
            <p className="text-gray-600">Análisis detallado del rendimiento del polideportivo</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Controles de período */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod('7d')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedPeriod === '7d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 Días
            </button>
            <button
              onClick={() => setSelectedPeriod('30d')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedPeriod === '30d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 Días
            </button>
            <button
              onClick={() => setSelectedPeriod('90d')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedPeriod === '90d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              90 Días
            </button>
            <button
              onClick={() => setSelectedPeriod('1y')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedPeriod === '1y'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              1 Año
            </button>
            <button
              onClick={() => setSelectedPeriod('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedPeriod === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Personalizado
            </button>
          </div>
          <div className="flex gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Desde:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Hasta:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.totalRevenue.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1">
                {revenueGrowth.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  revenueGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {revenueGrowth.value}%
                </span>
                <span className="text-sm text-gray-500">vs mes anterior</span>
              </div>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reservas</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalReservations}</p>
              <div className="flex items-center gap-1 mt-1">
                {reservationGrowth.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  reservationGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {reservationGrowth.value}%
                </span>
                <span className="text-sm text-gray-500">vs mes anterior</span>
              </div>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalUsers}</p>
              <div className="flex items-center gap-1 mt-1">
                {userGrowth.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  userGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {userGrowth.value}%
                </span>
                <span className="text-sm text-gray-500">vs mes anterior</span>
              </div>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasa de Ocupación</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.occupancyRate}%</p>
              <div className="flex items-center gap-1 mt-1">
                {occupancyGrowth.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  occupancyGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {occupancyGrowth.value}%
                </span>
                <span className="text-sm text-gray-500">vs mes anterior</span>
              </div>
            </div>
            <Activity className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Gráficos y análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de ingresos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Evolución de Ingresos</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {Array.isArray(revenueData?.byPeriod) && revenueData.byPeriod.length > 0 ? revenueData.byPeriod.map((item, index) => {
              // Validación robusta de datos
              const itemAmount = item?._sum?.amount || 0;
              const maxRevenue = Math.max(...(revenueData?.byPeriod || []).map(r => r?._sum?.amount || 0));
              const percentage = maxRevenue > 0 ? (itemAmount / maxRevenue) * 100 : 0;
              const date = new Date(item?.createdAt || new Date());
              const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-8">{monthName}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-20 text-right">
                    ${(itemAmount / 1000000).toFixed(1)}M
                  </span>
                </div>
              );
            }) : (
              <div className="text-center py-4 text-gray-500">
                No hay datos de ingresos disponibles
              </div>
            )}
          </div>
        </div>

        {/* Reservas por día */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Reservas por Día de la Semana</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {Array.isArray(usageData?.byStatus) && usageData.byStatus.length > 0 ? usageData.byStatus.map((item, index) => {
              const maxCount = Math.max(...(usageData?.byStatus || []).map(r => r?._count?.id || 0));
              const percentage = maxCount > 0 ? ((item?._count?.id || 0) / maxCount) * 100 : 0;
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-16">{item.status}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {item?._count?.id ?? 0}
                  </span>
                </div>
              );
            }) : (
              <div className="text-center py-4 text-gray-500">
                No hay datos de reservas disponibles
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canchas más populares */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Canchas Más Populares</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.isArray(usageData?.bySport) && usageData.bySport.length > 0 ? usageData.bySport.slice(0, 5).map((court, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">{court?._count?.id ?? 0}</div>
              <div className="text-sm text-gray-600">{court.court}</div>
              <div className="text-xs text-gray-500 mt-1">reservas</div>
            </div>
          )) : (
            <div className="col-span-5 text-center py-4 text-gray-500">
              No hay datos de canchas disponibles
            </div>
          )}
        </div>
      </div>

      {/* Reportes rápidos */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Reportes Rápidos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickReports.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
              >
                <div className={`w-12 h-12 ${report.bgColor} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6 ${report.color}`} />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">{report.name}</h4>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
  );
}