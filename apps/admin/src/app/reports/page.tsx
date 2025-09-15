'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { useAdminReports, exportUtils } from '@/lib/hooks';

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
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    return {
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  });
  
  const { reportData, loading, error, getRevenueReport, getUsageReport, getCustomersReport, reset } = useAdminReports();
  // Usamos any porque el backend devuelve shapes distintos por tipo
  const [revenueData, setRevenueData] = useState<any>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [usersData, setUsersData] = useState<any>(null);
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalRevenue: 0,
    totalReservations: 0,
    totalUsers: 0,
    occupancyRate: 0
  });
  const [groupBy, setGroupBy] = useState<'day'|'week'|'month'>('day');

  // Actualizar dateRange cuando cambia selectedPeriod
  useEffect(() => {
    if (selectedPeriod !== 'custom') {
      const today = new Date();
      const startDate = getPeriodStartDate(selectedPeriod);
      
      setDateRange({
        start: startDate.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      });
    }
  }, [selectedPeriod]);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadReportsData();
  }, [selectedPeriod, dateRange]);

  const loadReportsData = async () => {
    try {
      const params = {
        period: selectedPeriod,
        groupBy,
        ...(selectedPeriod === 'custom' && {
          startDate: dateRange.start,
          endDate: dateRange.end
        })
      };

      // Calcular fechas del período actual
      const currentStart = selectedPeriod === 'custom' ? new Date(dateRange.start!) : new Date(getPeriodStartDate(selectedPeriod));
      const currentEnd = selectedPeriod === 'custom' ? new Date(dateRange.end!) : new Date();
      
      // Calcular fechas del período anterior para comparación
      const periodDuration = currentEnd.getTime() - currentStart.getTime();
      const previousStart = new Date(currentStart);
      const previousEnd = new Date(currentStart);
      previousStart.setTime(previousStart.getTime() - periodDuration);

      console.log('📊 Cargando datos de reportes:', { params, currentStart, currentEnd, previousStart, previousEnd });

      // Cargar datos del período actual usando los endpoints que funcionan
      const [revenueResult, usageResult, usersResult] = await Promise.all([
        getRevenueReport(params),
        getUsageReport(params),
        getCustomersReport(params)
      ]);

      // Cargar datos del período anterior para comparación
      const previousParams = {
        period: 'custom' as const,
        startDate: previousStart.toISOString().split('T')[0],
        endDate: previousEnd.toISOString().split('T')[0],
        groupBy
      };

      const [previousRevenue, previousUsage, previousUsers] = await Promise.all([
        getRevenueReport(previousParams),
        getUsageReport(previousParams),
        getCustomersReport(previousParams)
      ]);

      // Normalizar para tomar el payload interno si viene envuelto como { data: ... }
      const rev = (revenueResult as any)?.data ?? revenueResult;
      const use = (usageResult as any)?.data ?? usageResult;
      const usr = (usersResult as any)?.data ?? usersResult;
      const prevRev = (previousRevenue as any)?.data ?? previousRevenue;
      const prevUse = (previousUsage as any)?.data ?? previousUsage;
      const prevUsr = (previousUsers as any)?.data ?? previousUsers;

      console.log('📈 Datos actuales:', { revenueResult: rev, usageResult: use, usersResult: usr });
      console.log('📉 Datos anteriores:', { previousRevenue: prevRev, previousUsage: prevUse, previousUsers: prevUsr });

      // Actualizar datos
      if (rev) setRevenueData(rev?.data ?? rev);
      if (use) setUsageData(use?.data ?? use);
      if (usr) setUsersData(usr?.data ?? usr);

      // Calcular métricas actuales
      const currentMetrics = {
        totalRevenue: (rev as any)?.summary?.totalRevenue || 0,
        totalReservations: (use as any)?.summary?.totalReservations || 0,
        totalUsers: (usr as any)?.summary?.totalUsers || 0,
        occupancyRate: calculateOccupancyRate(use as any)
      };

      // Calcular métricas anteriores
      const previousMetricsData = {
        totalRevenue: (prevRev as any)?.summary?.totalRevenue || 0,
        totalReservations: (prevUse as any)?.summary?.totalReservations || 0,
        totalUsers: (prevUsr as any)?.summary?.totalUsers || 0,
        occupancyRate: calculateOccupancyRate(prevUse as any)
      };

      setMetrics(currentMetrics);
      setPreviousMetrics(previousMetricsData);

      console.log('📊 Métricas calculadas:', { current: currentMetrics, previous: previousMetricsData });
    } catch (error) {
      console.error('❌ Error cargando datos de reportes:', error);
    }
  };

  // Función auxiliar para calcular fechas de período
  const getPeriodStartDate = (period: string): Date => {
    const now = new Date();
    const start = new Date(now);
    
    switch (period) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setDate(now.getDate() - 30);
    }
    
    return start;
  };

  const calculateOccupancyRate = (data: UsageData | null): number => {
    if (!data || !data.summary) return 0;
    
    // Obtener datos reales de canchas desde la base de datos
    // Por ahora usamos un valor por defecto, pero esto debería venir de una consulta
    const totalCourts = 8; // TODO: Obtener dinámicamente desde adminApi.courts.getAll()
    const hoursPerDay = 14; // Horas de operación por día (6 AM - 8 PM)
    
    // Calcular días en el período de forma más precisa
    let daysInPeriod = 1;
    if (selectedPeriod === 'custom') {
      const start = new Date(dateRange.start!);
      const end = new Date(dateRange.end!);
      daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      switch (selectedPeriod) {
        case '7d': daysInPeriod = 7; break;
        case '30d': daysInPeriod = 30; break;
        case '90d': daysInPeriod = 90; break;
        case '1y': daysInPeriod = 365; break;
        default: daysInPeriod = 30;
      }
    }
    
    // Calcular capacidad total considerando que cada reserva ocupa 1 hora
    const totalCapacity = totalCourts * hoursPerDay * daysInPeriod;
    const totalReservations = data.summary.totalReservations;
    
    if (totalCapacity === 0) return 0;
    
    // Calcular tasa de ocupación real
    const occupancyRate = (totalReservations / totalCapacity) * 100;
    return Math.round(Math.min(occupancyRate, 100)); // Máximo 100%
  };

  // Calcular crecimiento dinámicamente
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isPositive: true };
    const growth = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(growth),
      isPositive: growth >= 0
    };
  };

  // Obtener datos del período anterior para comparación
  const [previousMetrics, setPreviousMetrics] = useState<ReportMetrics>({
    totalRevenue: 0,
    totalReservations: 0,
    totalUsers: 0,
    occupancyRate: 0
  });

  // Calcular métricas de crecimiento
  const revenueGrowth = calculateGrowth(metrics.totalRevenue, previousMetrics.totalRevenue);
  const reservationGrowth = calculateGrowth(metrics.totalReservations, previousMetrics.totalReservations);
  const userGrowth = calculateGrowth(metrics.totalUsers, previousMetrics.totalUsers);
  const occupancyGrowth = calculateGrowth(metrics.occupancyRate, previousMetrics.occupancyRate);

  // Función para exportar datos
  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const exportData = {
        period: selectedPeriod,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end
        },
        groupBy,
        metrics: {
          totalRevenue: metrics.totalRevenue,
          totalReservations: metrics.totalReservations,
          totalUsers: metrics.totalUsers,
          occupancyRate: metrics.occupancyRate
        },
        revenueData: {
          summary: revenueData?.summary || {},
          byPeriod: Array.isArray(revenueData?.byPeriod) ? revenueData.byPeriod : [],
          byMethod: Array.isArray(revenueData?.byMethod) ? revenueData.byMethod : []
        },
        usageData,
        usersData,
        generatedAt: new Date().toISOString()
      };

      const filename = `reporte_${selectedPeriod}_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'csv') {
        exportUtils.downloadCSV(exportData, `${filename}.csv`);
      } else {
        exportUtils.downloadJSON(exportData, `${filename}.json`);
      }
    } catch (error) {
      console.error('Error exportando datos:', error);
    }
  };

  // Función para convertir datos a CSV
  const convertToCSV = (data: any): string => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines: string[] = [];
    // Encabezado general
    lines.push(['Sección','Métrica','Valor','Período','Inicio','Fin','Agrupar'].map(esc).join(','));
    lines.push(['Resumen','Ingresos Totales', `$${data.metrics.totalRevenue.toLocaleString()}`, data.period, data.dateRange.start, data.dateRange.end, data.groupBy].map(esc).join(','));
    lines.push(['Resumen','Total Reservas', data.metrics.totalReservations, data.period, data.dateRange.start, data.dateRange.end, data.groupBy].map(esc).join(','));
    lines.push(['Resumen','Usuarios Activos', data.metrics.totalUsers, data.period, data.dateRange.start, data.dateRange.end, data.groupBy].map(esc).join(','));
    lines.push(['Resumen','Tasa de Ocupación', `${data.metrics.occupancyRate}%`, data.period, data.dateRange.start, data.dateRange.end, data.groupBy].map(esc).join(','));
    // Detalle por período
    lines.push(['','','','','',''].map(esc).join(','));
    lines.push(['Detalle por período','Fecha','Transacciones','Monto','','',''].map(esc).join(','));
    (data.revenueData.byPeriod || []).forEach((r: any) => {
      const d = new Date(r?.date || r?.createdAt || new Date()).toISOString().slice(0,10);
      const count = r?.count ?? r?._count?.id ?? 0;
      const amount = r?.totalAmount ?? r?._sum?.amount ?? 0;
      lines.push(['Detalle por período', d, count, amount].map(esc).join(','));
    });
    // Detalle por método
    lines.push(['','','','','',''].map(esc).join(','));
    lines.push(['Detalle por método','Método','Transacciones','Monto','','',''].map(esc).join(','));
    (data.revenueData.byMethod || []).forEach((m: any) => {
      const method = m?.method || m?.paymentMethod || 'UNKNOWN';
      const count = m?.count ?? m?._count?.id ?? 0;
      const amount = m?.totalAmount ?? m?._sum?.totalPrice ?? m?._sum?.amount ?? 0;
      lines.push(['Detalle por método', method, count, amount].map(esc).join(','));
    });
    return lines.join('\n');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header móvil */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reportes y Análisis</h1>
              <p className="text-sm text-gray-600">Análisis detallado del rendimiento del polideportivo</p>
            </div>
          </div>
          
          {/* Botones de acción móviles */}
          <div className="flex gap-2">
            <button 
              onClick={() => setSelectedPeriod('custom')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button 
              onClick={() => handleExport('csv')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Controles de período móviles */}
      <div className="px-4 py-3">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          {/* Botones de período en grid móvil */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setSelectedPeriod('7d')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedPeriod === '7d'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              7 Días
            </button>
            <button
              onClick={() => setSelectedPeriod('30d')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedPeriod === '30d'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              30 Días
            </button>
            <button
              onClick={() => setSelectedPeriod('90d')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedPeriod === '90d'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              90 Días
            </button>
            <button
              onClick={() => setSelectedPeriod('1y')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedPeriod === '1y'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              1 Año
            </button>
          </div>
          
          {/* Personalizado */}
          <button
            onClick={() => setSelectedPeriod('custom')}
            className={`w-full px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 mb-4 ${
              selectedPeriod === 'custom'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            Personalizado
          </button>
          
          {/* Controles adicionales en móvil */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Agrupar por:</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              >
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
              </select>
            </div>
            
            {selectedPeriod === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Desde:</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Hasta:</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Métricas principales móviles */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-6 h-6 text-green-500" />
              <div className="flex items-center gap-1">
                {revenueGrowth.isPositive ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${
                  revenueGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {revenueGrowth.value}%
                </span>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Ingresos Totales</p>
            <p className="text-lg font-bold text-gray-900">${metrics.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">vs mes anterior</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-6 h-6 text-blue-500" />
              <div className="flex items-center gap-1">
                {reservationGrowth.isPositive ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${
                  reservationGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {reservationGrowth.value}%
                </span>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Total Reservas</p>
            <p className="text-lg font-bold text-gray-900">{metrics.totalReservations}</p>
            <p className="text-xs text-gray-500 mt-1">vs mes anterior</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-purple-500" />
              <div className="flex items-center gap-1">
                {userGrowth.isPositive ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${
                  userGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {userGrowth.value}%
                </span>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Usuarios Activos</p>
            <p className="text-lg font-bold text-gray-900">{metrics.totalUsers}</p>
            <p className="text-xs text-gray-500 mt-1">vs mes anterior</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-6 h-6 text-orange-500" />
              <div className="flex items-center gap-1">
                {occupancyGrowth.isPositive ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${
                  occupancyGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {occupancyGrowth.value}%
                </span>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Tasa de Ocupación</p>
            <p className="text-lg font-bold text-gray-900">{metrics.occupancyRate}%</p>
            <p className="text-xs text-gray-500 mt-1">vs mes anterior</p>
          </div>
        </div>
      </div>

      {/* Gráficos y análisis móviles */}
      <div className="px-4 pb-3 space-y-3">
        {/* Gráfico de ingresos móvil */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Evolución de Ingresos</h3>
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-2">
            {Array.isArray(revenueData?.byPeriod) && revenueData.byPeriod.length > 0 ? revenueData.byPeriod.slice(0, 5).map((item: any, index: number) => {
              const amount = Number(item?.totalAmount ?? item?._sum?.amount ?? 0);
              const maxRevenue = Math.max(...(revenueData?.byPeriod || []).map((r: any) => Number(r?.totalAmount ?? r?._sum?.amount ?? 0)), 0);
              const percentage = maxRevenue > 0 ? (amount / maxRevenue) * 100 : 0;
              const d = new Date(item?.date || item?.createdAt || new Date());
              const label = groupBy === 'month'
                ? d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
                : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
              return (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600 w-12">{label}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-900 w-16 text-right">
                    ${amount > 1000000 ? `${(amount / 1000000).toFixed(1)}M` : amount > 1000 ? `${(amount / 1000).toFixed(1)}K` : amount.toLocaleString()}
                  </span>
                </div>
              );
            }) : (
              <div className="text-center py-4 text-gray-500">
                <div className="text-lg font-medium mb-2">📊</div>
                <div className="text-sm">No hay datos de ingresos disponibles</div>
                <div className="text-xs text-gray-400 mt-1">Los datos aparecerán cuando se generen reservas</div>
              </div>
            )}
          </div>
        </div>

        {/* Reservas por estado móvil */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Reservas por Estado</h3>
            <PieChart className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-2">
            {Array.isArray(usageData?.byStatus) && usageData.byStatus.length > 0 ? usageData.byStatus.map((item: any, index: number) => {
              const maxCount = Math.max(...(usageData?.byStatus || []).map((r: any) => r?._count?.id || 0));
              const percentage = maxCount > 0 ? ((item?._count?.id || 0) / maxCount) * 100 : 0;
              const statusLabels: { [key: string]: string } = {
                'CONFIRMED': 'Confirmadas',
                'PENDING': 'Pendientes',
                'CANCELLED': 'Canceladas',
                'COMPLETED': 'Completadas'
              };
              const statusColors: { [key: string]: string } = {
                'CONFIRMED': 'bg-green-600',
                'PENDING': 'bg-yellow-600',
                'CANCELLED': 'bg-red-600',
                'COMPLETED': 'bg-blue-600'
              };
              return (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600 w-16">{statusLabels[item.status] || item.status}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${statusColors[item.status] || 'bg-gray-600'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-gray-900 w-8 text-right">
                    {item?._count?.id ?? 0}
                  </span>
                </div>
              );
            }) : (
              <div className="text-center py-4 text-gray-500">
                <div className="text-lg font-medium mb-2">📅</div>
                <div className="text-sm">No hay datos de reservas disponibles</div>
                <div className="text-xs text-gray-400 mt-1">Los datos aparecerán cuando se creen reservas</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canchas más populares móvil */}
      <div className="px-4 pb-3">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Canchas Más Populares</h3>
          <div className="grid grid-cols-2 gap-2">
            {Array.isArray(usageData?.bySport) && usageData.bySport.length > 0 ? usageData.bySport.slice(0, 4).map((court: any, index: number) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600 mb-1">{court?._count?.id ?? 0}</div>
                <div className="text-xs text-gray-600 font-medium truncate">{court.court}</div>
                <div className="text-xs text-gray-500 mt-1">reservas</div>
              </div>
            )) : (
              <div className="col-span-2 text-center py-6 text-gray-500">
                <div className="text-lg font-medium mb-2">🏟️</div>
                <div className="text-sm">No hay datos de canchas disponibles</div>
                <div className="text-xs text-gray-400 mt-1">Los datos aparecerán cuando se hagan reservas</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reportes rápidos móviles */}
      <div className="px-4 pb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Reportes Rápidos</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickReports.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => {
                    if (report.id === 'revenue') {
                      router.push('/reports/revenue');
                      return;
                    }
                    if (report.id === 'reservations') {
                      router.push('/reports/reservations');
                      return;
                    }
                    if (report.id === 'users') {
                      router.push('/reports/users');
                      return;
                    }
                    if (report.id === 'courts') {
                      router.push('/reports/courts');
                      return;
                    }
                    setSelectedReport(report.id);
                    loadReportsData();
                  }}
                  className={`p-3 border rounded-lg hover:shadow-md transition-all duration-200 text-left ${
                    selectedReport === report.id 
                      ? 'border-blue-400 bg-blue-50 shadow-md' 
                      : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <div className={`w-8 h-8 ${report.bgColor} rounded-lg flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 ${report.color}`} />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{report.name}</h4>
                  <p className="text-xs text-gray-700 font-medium leading-tight">{report.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}