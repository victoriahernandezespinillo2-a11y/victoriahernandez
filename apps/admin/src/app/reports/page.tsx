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
    
    // Obtener el número total de canchas disponibles
    // En una implementación real, esto vendría de la base de datos
    const totalCourts = 8; // Asumiendo 8 canchas en el polideportivo
    const hoursPerDay = 14; // Horas de operación por día (ej: 6 AM - 8 PM)
    const daysInPeriod = selectedPeriod === 'custom' ? 
      Math.ceil((new Date(dateRange.end!).getTime() - new Date(dateRange.start!).getTime()) / (1000 * 60 * 60 * 24)) :
      (selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : selectedPeriod === '90d' ? 90 : 365);
    
    const totalCapacity = totalCourts * hoursPerDay * daysInPeriod;
    const totalReservations = data.summary.totalReservations;
    
    if (totalCapacity === 0) return 0;
    
    return Math.round((totalReservations / totalCapacity) * 100);
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

      if (format === 'csv') {
        // Convertir a CSV
        const csvContent = convertToCSV(exportData);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Exportar como JSON
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reportes y Análisis</h1>
            <p className="text-gray-600">Análisis detallado del rendimiento del polideportivo</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setSelectedPeriod('custom')}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 font-medium shadow-sm"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button 
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md transition-all duration-200 font-medium shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <button 
              onClick={() => handleExport('json')}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-400 hover:bg-green-50 hover:text-green-700 transition-all duration-200 font-medium shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Exportar JSON
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
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedPeriod === '7d'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              7 Días
            </button>
            <button
              onClick={() => setSelectedPeriod('30d')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedPeriod === '30d'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              30 Días
            </button>
            <button
              onClick={() => setSelectedPeriod('90d')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedPeriod === '90d'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              90 Días
            </button>
            <button
              onClick={() => setSelectedPeriod('1y')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedPeriod === '1y'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              1 Año
            </button>
            <button
              onClick={() => setSelectedPeriod('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedPeriod === 'custom'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              Personalizado
            </button>
          </div>
          <div className="flex gap-4 ml-auto items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-800">Agrupar:</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200"
              >
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-800">Desde:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-800">Hasta:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200"
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
            {Array.isArray(revenueData?.byPeriod) && revenueData.byPeriod.length > 0 ? revenueData.byPeriod.map((item: any, index: number) => {
              const amount = Number(item?.totalAmount ?? item?._sum?.amount ?? 0);
              const maxRevenue = Math.max(...(revenueData?.byPeriod || []).map((r: any) => Number(r?.totalAmount ?? r?._sum?.amount ?? 0)), 0);
              const percentage = maxRevenue > 0 ? (amount / maxRevenue) * 100 : 0;
              const d = new Date(item?.date || item?.createdAt || new Date());
              const label = groupBy === 'month'
                ? d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
                : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-16">{label}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-24 text-right">
                    ${amount > 1000000 ? `${(amount / 1000000).toFixed(1)}M` : amount > 1000 ? `${(amount / 1000).toFixed(1)}K` : amount.toLocaleString()}
                  </span>
                </div>
              );
            }) : (
              <div className="text-center py-4 text-gray-500">
                <div className="text-lg font-medium mb-2">📊</div>
                <div>No hay datos de ingresos disponibles</div>
                <div className="text-xs text-gray-400 mt-1">Los datos aparecerán cuando se generen reservas</div>
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
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-20">{statusLabels[item.status] || item.status}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${statusColors[item.status] || 'bg-gray-600'}`}
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
                <div className="text-lg font-medium mb-2">📅</div>
                <div>No hay datos de reservas disponibles</div>
                <div className="text-xs text-gray-400 mt-1">Los datos aparecerán cuando se creen reservas</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canchas más populares */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Canchas Más Populares</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.isArray(usageData?.bySport) && usageData.bySport.length > 0 ? usageData.bySport.slice(0, 5).map((court: any, index: number) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-2xl font-bold text-blue-600 mb-1">{court?._count?.id ?? 0}</div>
              <div className="text-sm text-gray-600 font-medium">{court.court}</div>
              <div className="text-xs text-gray-500 mt-1">reservas</div>
            </div>
          )) : (
            <div className="col-span-5 text-center py-8 text-gray-500">
              <div className="text-lg font-medium mb-2">🏟️</div>
              <div>No hay datos de canchas disponibles</div>
              <div className="text-xs text-gray-400 mt-1">Los datos aparecerán cuando se hagan reservas</div>
            </div>
          )}
        </div>
      </div>

      {/* Detalle de ingresos */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle de Ingresos</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Por Período</h4>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Fecha</th>
                    <th className="px-4 py-2 text-right">Transacciones</th>
                    <th className="px-4 py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(revenueData?.byPeriod) && revenueData.byPeriod.length > 0 ? revenueData.byPeriod.map((r: any, idx: number) => {
                    const d = new Date(r?.date || r?.createdAt || new Date());
                    const dateLabel = d.toLocaleDateString('es-ES');
                    const count = Number(r?.count ?? r?._count?.id ?? 0);
                    const amount = Number(r?.totalAmount ?? r?._sum?.amount ?? 0);
                    return (
                      <tr key={`p-${idx}`} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-gray-800">{dateLabel}</td>
                        <td className="px-4 py-2 text-right text-gray-800">{count.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">${amount.toLocaleString()}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-gray-500">Sin datos</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Por Método de Pago</h4>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Método</th>
                    <th className="px-4 py-2 text-right">Transacciones</th>
                    <th className="px-4 py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(revenueData?.byMethod) && revenueData.byMethod.length > 0 ? revenueData.byMethod.map((m: any, idx: number) => {
                    const method = (m?.method || m?.paymentMethod || 'UNKNOWN').toString();
                    const count = Number(m?.count ?? m?._count?.id ?? 0);
                    const amount = Number(m?.totalAmount ?? m?._sum?.totalPrice ?? m?._sum?.amount ?? 0);
                    return (
                      <tr key={`m-${idx}`} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-gray-800">{method}</td>
                        <td className="px-4 py-2 text-right text-gray-800">{count.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">${amount.toLocaleString()}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-gray-500">Sin datos</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
                onClick={() => {
                  if (report.id === 'revenue') {
                    router.push('/reports/revenue');
                    return;
                  }
                  if (report.id === 'reservations') {
                    router.push('/reports/reservations');
                    return;
                  }
                  setSelectedReport(report.id);
                  loadReportsData();
                }}
                className={`p-4 border-2 rounded-lg hover:shadow-md transition-all duration-200 text-left ${
                  selectedReport === report.id 
                    ? 'border-blue-400 bg-blue-50 shadow-md' 
                    : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <div className={`w-12 h-12 ${report.bgColor} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6 ${report.color}`} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{report.name}</h4>
                <p className="text-sm text-gray-700 font-medium">{report.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}