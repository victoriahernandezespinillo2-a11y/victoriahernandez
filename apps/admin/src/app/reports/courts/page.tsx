'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminReports, exportUtils } from '@/lib/hooks';
import { 
  MapPinIcon, 
  TrophyIcon, 
  WrenchScrewdriverIcon, 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon as FileText,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarIcon,
  TableCellsIcon,
  ChartPieIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapIcon,
  BoltIcon,
  StarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

export default function CourtsReportPage() {
  const { getGeneralReport } = useAdminReports();
  const [period, setPeriod] = useState<'7d'|'30d'|'90d'|'1y'|'custom'>('30d');
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const ago = new Date();
    ago.setDate(today.getDate() - 30);
    return { start: ago.toISOString().slice(0,10), end: today.toISOString().slice(0,10) };
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Estados para funcionalidades avanzadas
  const [showCourtsTable, setShowCourtsTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [centerFilter, setCenterFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name'|'sportType'|'utilization'|'revenue'|'reservations'>('name');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showCharts, setShowCharts] = useState(true);
  const [selectedChart, setSelectedChart] = useState<'sport'|'status'|'utilization'|'revenue'>('sport');
  const [selectedCourt, setSelectedCourt] = useState<any>(null);
  const [showCourtModal, setShowCourtModal] = useState(false);

  const params = useMemo(() => ({
    type: 'courts' as const,
    period,
    ...(period === 'custom' ? { startDate: dateRange.start, endDate: dateRange.end } : {})
  }), [period, dateRange]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        console.log('🏟️ Cargando reporte de canchas con params:', params);
        const res = await getGeneralReport(params);
        if (!active) return;
        console.log('🏟️ Respuesta reporte canchas:', res);
        
        // Acceder correctamente a los datos anidados
        const reportData = res?.data || res;
        console.log('📋 Datos del reporte canchas:', reportData);
        setData(reportData);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [getGeneralReport, params]);

  // Función auxiliar para calcular fecha de inicio del período
  const getPeriodStartDate = (p: string) => {
    const today = new Date();
    let ago = new Date();
    
    switch (p) {
      case '7d': ago.setDate(today.getDate() - 7); break;
      case '30d': ago.setDate(today.getDate() - 30); break;
      case '90d': ago.setDate(today.getDate() - 90); break;
      case '1y': 
        ago.setFullYear(today.getFullYear() - 1);
        break;
      default: ago.setDate(today.getDate() - 30);
    }
    
    return ago.toISOString().slice(0,10);
  };

  // Función para abrir modal de detalles de cancha
  const handleViewCourt = (court: any) => {
    setSelectedCourt(court);
    setShowCourtModal(true);
  };

  // Calcular métricas desde los datos
  const calculatedMetrics = useMemo(() => {
    if (!data) return { 
      totalCourts: 0, 
      activeCourts: 0, 
      operationalCourts: 0, 
      maintenanceCourts: 0, 
      averageUtilization: 0,
      totalRevenue: 0,
      totalReservations: 0,
      bySport: [],
      byStatus: [],
      courtsList: [],
      utilizationData: [],
      topPerformingCourts: [],
      centersList: []
    };
    
    const summary = data?.summary || {};
    const bySport = Array.isArray(data?.bySport) ? data.bySport : [];
    const byStatus = Array.isArray(data?.byStatus) ? data.byStatus : [];
    const courtsList = Array.isArray(data?.courts) ? data.courts : [];
    const utilizationData = Array.isArray(data?.utilizationData) ? data.utilizationData : [];
    
    // Obtener centros únicos
    const centersList = Array.from(new Set(courtsList.map((court: any) => court.center?.name).filter(Boolean)));
    
    // Top canchas por utilización
    const topPerformingCourts = courtsList
      .map((court: any) => {
        const utilization = utilizationData.find((u: any) => u.courtId === court.id);
        return {
          ...court,
          utilizationRate: utilization?.utilizationRate || 0,
          revenue: utilization?.revenue || 0,
          reservationCount: utilization?.reservationCount || 0
        };
      })
      .sort((a: any, b: any) => b.utilizationRate - a.utilizationRate)
      .slice(0, 5);
    
    return { 
      totalCourts: Number(summary.totalCourts || 0),
      activeCourts: Number(summary.activeCourts || 0),
      operationalCourts: Number(summary.operationalCourts || 0),
      maintenanceCourts: Number(summary.maintenanceCourts || 0),
      averageUtilization: Number(summary.averageUtilization || 0),
      totalRevenue: Number(summary.totalRevenue || 0),
      totalReservations: Number(summary.totalReservations || 0),
      bySport,
      byStatus,
      courtsList,
      utilizationData,
      topPerformingCourts,
      centersList
    };
  }, [data]);

  const { 
    totalCourts, 
    activeCourts, 
    operationalCourts, 
    maintenanceCourts, 
    averageUtilization, 
    totalRevenue, 
    totalReservations,
    bySport, 
    byStatus, 
    courtsList, 
    utilizationData, 
    topPerformingCourts, 
    centersList 
  } = calculatedMetrics;

  // Filtrar y ordenar canchas para la tabla
  const filteredCourts = useMemo(() => {
    if (!courtsList || courtsList.length === 0) return [];
    
    let filtered = courtsList.filter((court: any) => {
      const matchesSearch = !searchTerm || 
        court.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        court.center?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSport = !sportFilter || court.sportType === sportFilter;
      const matchesStatus = !statusFilter || court.maintenanceStatus === statusFilter;
      const matchesCenter = !centerFilter || court.center?.name === centerFilter;
      
      return matchesSearch && matchesSport && matchesStatus && matchesCenter;
    });
    
    // Ordenar
    filtered.sort((a: any, b: any) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'sportType':
          aValue = a.sportType.toLowerCase();
          bValue = b.sportType.toLowerCase();
          break;
        case 'utilization':
          const aUtil = utilizationData.find((u: any) => u.courtId === a.id);
          const bUtil = utilizationData.find((u: any) => u.courtId === b.id);
          aValue = aUtil?.utilizationRate || 0;
          bValue = bUtil?.utilizationRate || 0;
          break;
        case 'revenue':
          const aRev = utilizationData.find((u: any) => u.courtId === a.id);
          const bRev = utilizationData.find((u: any) => u.courtId === b.id);
          aValue = aRev?.revenue || 0;
          bValue = bRev?.revenue || 0;
          break;
        case 'reservations':
          const aRes = utilizationData.find((u: any) => u.courtId === a.id);
          const bRes = utilizationData.find((u: any) => u.courtId === b.id);
          aValue = aRes?.reservationCount || 0;
          bValue = bRes?.reservationCount || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return filtered;
  }, [courtsList, searchTerm, sportFilter, statusFilter, centerFilter, sortBy, sortOrder, utilizationData]);

  // Paginación
  const totalPages = Math.ceil(filteredCourts.length / itemsPerPage);
  const paginatedCourts = filteredCourts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Debug de métricas
  console.log('🏟️ Métricas calculadas:', {
    fromAPI: {
      totalCourts: Number(data?.summary?.totalCourts || 0)
    },
    calculated: calculatedMetrics,
    dataSummary: data?.summary,
    dataBySport: data?.bySport?.length || 0,
    dataByStatus: data?.byStatus?.length || 0,
    fullData: data
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header móvil */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Reporte de Canchas</h1>
            <p className="text-sm text-gray-600">Análisis de utilización</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowCourtsTable(!showCourtsTable)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              <TableCellsIcon className="w-4 h-4" />
              {showCourtsTable ? 'Ocultar' : 'Ver'}
            </button>
            <button 
              onClick={() => setShowCharts(!showCharts)}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              <ChartPieIcon className="w-4 h-4" />
              {showCharts ? 'Ocultar' : 'Ver'}
            </button>
            <button 
              onClick={() => exportFile('csv')}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filtros móviles */}
      <div className="px-4 py-3">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(['7d','30d','90d','1y'] as const).map((p) => (
              <button 
                key={p} 
                onClick={() => setPeriod(p)} 
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  period===p?'bg-blue-600 text-white':'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {p==='7d'?'7 Días':p==='30d'?'30 Días':p==='90d'?'90 Días':'1 Año'}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setPeriod('custom')} 
            className={`w-full px-3 py-2 rounded-lg text-sm font-semibold ${
              period==='custom'?'bg-blue-600 text-white':'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            Personalizado
          </button>
          {period==='custom' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={(e)=>setDateRange(r=>({...r,start:e.target.value}))} 
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={(e)=>setDateRange(r=>({...r,end:e.target.value}))} 
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Métricas principales móviles */}
          <div className="px-4 pb-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <MapPinIcon className="h-6 w-6 text-blue-600" />
                  <span className="text-xs text-gray-500">{activeCourts} activas</span>
                </div>
                <p className="text-xs text-gray-600 mb-1">Total Canchas</p>
                <p className="text-lg font-bold text-gray-900">{totalCourts.toLocaleString()}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">
                    {totalCourts > 0 ? Math.round((operationalCourts / totalCourts) * 100) : 0}%
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-1">Operacionales</p>
                <p className="text-lg font-bold text-gray-900">{operationalCourts.toLocaleString()}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600" />
                  <span className="text-xs text-orange-600 font-medium">
                    {totalCourts > 0 ? Math.round((maintenanceCourts / totalCourts) * 100) : 0}%
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-1">Mantenimiento</p>
                <p className="text-lg font-bold text-gray-900">{maintenanceCourts.toLocaleString()}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                  <span className="text-xs text-purple-600 font-medium">{totalReservations}</span>
                </div>
                <p className="text-xs text-gray-600 mb-1">Utilización</p>
                <p className="text-lg font-bold text-gray-900">{averageUtilization}%</p>
              </div>
            </div>
          </div>

          {/* Métricas adicionales móviles */}
          <div className="px-4 pb-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                  <span className="text-xs text-gray-500">Período</span>
                </div>
                <p className="text-xs text-gray-600 mb-1">Ingresos</p>
                <p className="text-sm font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <UserGroupIcon className="h-6 w-6 text-blue-600" />
                  <span className="text-xs text-gray-500">Confirmadas</span>
                </div>
                <p className="text-xs text-gray-600 mb-1">Reservas</p>
                <p className="text-sm font-bold text-gray-900">{totalReservations.toLocaleString()}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
                  <span className="text-xs text-gray-500">Deportivos</span>
                </div>
                <p className="text-xs text-gray-600 mb-1">Centros</p>
                <p className="text-sm font-bold text-gray-900">{centersList.length}</p>
              </div>
            </div>
          </div>

          {/* Gráficos y análisis */}
          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Selector de gráficos */}
              <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'sport', label: 'Por Deporte', icon: TrophyIcon },
                    { id: 'status', label: 'Por Estado', icon: WrenchScrewdriverIcon },
                    { id: 'utilization', label: 'Utilización', icon: ChartBarIcon },
                    { id: 'revenue', label: 'Ingresos', icon: CurrencyDollarIcon }
                  ].map((chart) => (
                    <button
                      key={chart.id}
                      onClick={() => setSelectedChart(chart.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedChart === chart.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <chart.icon className="w-4 h-4" />
                      {chart.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gráfico de distribución por deporte */}
              {selectedChart === 'sport' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Deporte</h3>
                  <div className="space-y-3">
                    {bySport.map((sport: any, index: number) => {
                      const percentage = totalCourts > 0 ? Math.round(((sport._count?.id || 0) / totalCourts) * 100) : 0;
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-orange-500 mr-3"></div>
                              <span className="text-sm font-medium text-gray-700">
                                {sport.sportType === 'FOOTBALL7' ? 'Fútbol 7' :
                                 sport.sportType === 'PADDLE' ? 'Pádel' :
                                 sport.sportType === 'FUTSAL' ? 'Futsal' :
                                 sport.sportType === 'BASKETBALL' ? 'Básquet' :
                                 sport.sportType === 'TENNIS' ? 'Tenis' :
                                 sport.sportType === 'VOLLEYBALL' ? 'Vóley' :
                                 sport.sportType === 'MULTIPURPOSE' ? 'Multiuso' : sport.sportType}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-sm font-semibold text-gray-900 mr-2">
                                {sport._count?.id || 0}
                              </span>
                              <span className="text-xs text-gray-500">({percentage}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Gráfico de estado de mantenimiento */}
              {selectedChart === 'status' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Mantenimiento</h3>
                  <div className="space-y-3">
                    {byStatus.map((status: any, index: number) => {
                      const percentage = totalCourts > 0 ? Math.round(((status._count?.id || 0) / totalCourts) * 100) : 0;
                      const statusColor = status.maintenanceStatus === 'operational' ? 'bg-green-500' :
                                        status.maintenanceStatus === 'maintenance' ? 'bg-yellow-500' :
                                        status.maintenanceStatus === 'out_of_order' ? 'bg-red-500' : 'bg-gray-500';
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-3 ${statusColor}`}></div>
                              <span className="text-sm font-medium text-gray-700">
                                {status.maintenanceStatus === 'operational' ? 'Operacional' :
                                 status.maintenanceStatus === 'maintenance' ? 'En Mantenimiento' :
                                 status.maintenanceStatus === 'out_of_order' ? 'Fuera de Servicio' : status.maintenanceStatus}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-sm font-semibold text-gray-900 mr-2">
                                {status._count?.id || 0}
                              </span>
                              <span className="text-xs text-gray-500">({percentage}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${statusColor}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top canchas por utilización */}
              {selectedChart === 'utilization' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Canchas por Utilización</h3>
                  <div className="space-y-3">
                    {topPerformingCourts.map((court: any, index: number) => (
                      <div key={court.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{court.name}</p>
                            <p className="text-xs text-gray-500">{court.center?.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{court.utilizationRate}%</p>
                          <p className="text-xs text-gray-500">{court.reservationCount} reservas</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top canchas por ingresos */}
              {selectedChart === 'revenue' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Canchas por Ingresos</h3>
                  <div className="space-y-3">
                    {topPerformingCourts
                      .sort((a: any, b: any) => b.revenue - a.revenue)
                      .slice(0, 5)
                      .map((court: any, index: number) => (
                      <div key={court.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-semibold text-green-600">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{court.name}</p>
                            <p className="text-xs text-gray-500">{court.center?.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">${court.revenue.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{court.reservationCount} reservas</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabla detallada de canchas */}
          {showCourtsTable && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Canchas Detalladas</h3>
                  
                  {/* Filtros */}
                  <div className="flex flex-wrap gap-3">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Buscar cancha o centro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <select
                      value={sportFilter}
                      onChange={(e) => setSportFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todos los deportes</option>
                      {Array.from(new Set(courtsList.map((c: any) => c.sportType))).map((sport: any) => (
                        <option key={sport} value={sport}>
                          {sport === 'FOOTBALL7' ? 'Fútbol 7' :
                           sport === 'PADDLE' ? 'Pádel' :
                           sport === 'FUTSAL' ? 'Futsal' :
                           sport === 'BASKETBALL' ? 'Básquet' :
                           sport === 'TENNIS' ? 'Tenis' :
                           sport === 'VOLLEYBALL' ? 'Vóley' :
                           sport === 'MULTIPURPOSE' ? 'Multiuso' : sport}
                        </option>
                      ))}
                    </select>
                    
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todos los estados</option>
                      <option value="operational">Operacional</option>
                      <option value="maintenance">En Mantenimiento</option>
                      <option value="out_of_order">Fuera de Servicio</option>
                    </select>
                    
                    <select
                      value={centerFilter}
                      onChange={(e) => setCenterFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todos los centros</option>
                      {centersList.map((center: any) => (
                        <option key={center} value={center}>{center}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        { key: 'name', label: 'Cancha' },
                        { key: 'sportType', label: 'Deporte' },
                        { key: 'utilization', label: 'Utilización' },
                        { key: 'revenue', label: 'Ingresos' },
                        { key: 'reservations', label: 'Reservas' },
                        { key: 'status', label: 'Estado' },
                        { key: 'actions', label: 'Acciones' }
                      ].map((column) => (
                        <th
                          key={column.key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            if (column.key !== 'actions') {
                              setSortBy(column.key as any);
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {column.label}
                            {column.key !== 'actions' && (
                              sortBy === column.key ? (
                                sortOrder === 'asc' ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />
                              ) : <div className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center">
                            <ClockIcon className="animate-spin h-6 w-6 text-blue-600 mr-2" />
                            <span className="text-gray-500">Cargando canchas...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedCourts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No se encontraron canchas
                        </td>
                      </tr>
                    ) : (
                      paginatedCourts.map((court: any) => {
                        const utilization = utilizationData.find((u: any) => u.courtId === court.id);
                        return (
                          <tr key={court.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{court.name}</div>
                                <div className="text-sm text-gray-500">{court.center?.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {court.sportType === 'FOOTBALL7' ? 'Fútbol 7' :
                                 court.sportType === 'PADDLE' ? 'Pádel' :
                                 court.sportType === 'FUTSAL' ? 'Futsal' :
                                 court.sportType === 'BASKETBALL' ? 'Básquet' :
                                 court.sportType === 'TENNIS' ? 'Tenis' :
                                 court.sportType === 'VOLLEYBALL' ? 'Vóley' :
                                 court.sportType === 'MULTIPURPOSE' ? 'Multiuso' : court.sportType}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {utilization?.utilizationRate || 0}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${(utilization?.revenue || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {utilization?.reservationCount || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                court.maintenanceStatus === 'operational' 
                                  ? 'bg-green-100 text-green-800' 
                                  : court.maintenanceStatus === 'maintenance'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {court.maintenanceStatus === 'operational' ? 'Operacional' :
                                 court.maintenanceStatus === 'maintenance' ? 'En Mantenimiento' :
                                 court.maintenanceStatus === 'out_of_order' ? 'Fuera de Servicio' : court.maintenanceStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button 
                                onClick={() => handleViewCourt(court)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                title="Ver detalles de la cancha"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, filteredCourts.length)}
                        </span>{' '}
                        de <span className="font-medium">{filteredCourts.length}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Anterior
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Siguiente
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resumen de datos */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Período</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Período Seleccionado</h4>
                <p className="text-sm text-gray-900">
                  {period === 'custom' 
                    ? `${dateRange.start} - ${dateRange.end}`
                    : period === '7d' ? 'Últimos 7 días'
                    : period === '30d' ? 'Últimos 30 días'
                    : period === '90d' ? 'Últimos 90 días'
                    : 'Último año'
                  }
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Disponibilidad</h4>
                <p className="text-sm text-gray-900">
                  {totalCourts > 0 ? Math.round((operationalCourts / totalCourts) * 100) : 0}% de canchas operativas
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de detalles de cancha */}
      {showCourtModal && selectedCourt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Detalles de la Cancha</h3>
                <button
                  onClick={() => setShowCourtModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedCourt.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Centro</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedCourt.center?.name || 'No especificado'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Deporte</label>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedCourt.sportType === 'FOOTBALL7' ? 'Fútbol 7' :
                       selectedCourt.sportType === 'PADDLE' ? 'Pádel' :
                       selectedCourt.sportType === 'FUTSAL' ? 'Futsal' :
                       selectedCourt.sportType === 'BASKETBALL' ? 'Básquet' :
                       selectedCourt.sportType === 'TENNIS' ? 'Tenis' :
                       selectedCourt.sportType === 'VOLLEYBALL' ? 'Vóley' :
                       selectedCourt.sportType === 'MULTIPURPOSE' ? 'Multiuso' : selectedCourt.sportType}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacidad</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedCourt.capacity || 'No especificada'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Precio Base</label>
                  <p className="mt-1 text-sm text-gray-900">${Number(selectedCourt.basePricePerHour).toLocaleString()}/hora</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Iluminación</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedCourt.hasLighting 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedCourt.hasLighting ? 'Disponible' : 'No disponible'}
                    </span>
                    {selectedCourt.hasLighting && selectedCourt.lightingExtraPerHour && (
                      <p className="text-xs text-gray-500 mt-1">
                        Extra: ${Number(selectedCourt.lightingExtraPerHour).toLocaleString()}/hora
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedCourt.maintenanceStatus === 'operational' 
                        ? 'bg-green-100 text-green-800' 
                        : selectedCourt.maintenanceStatus === 'maintenance'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedCourt.maintenanceStatus === 'operational' ? 'Operacional' :
                       selectedCourt.maintenanceStatus === 'maintenance' ? 'En Mantenimiento' :
                       selectedCourt.maintenanceStatus === 'out_of_order' ? 'Fuera de Servicio' : selectedCourt.maintenanceStatus}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Multiuso</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedCourt.isMultiuse 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedCourt.isMultiuse ? 'Sí' : 'No'}
                    </span>
                    {selectedCourt.isMultiuse && selectedCourt.allowedSports && selectedCourt.allowedSports.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Deportes permitidos: {selectedCourt.allowedSports.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                
                {(() => {
                  const utilization = utilizationData.find((u: any) => u.courtId === selectedCourt.id);
                  return utilization ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Utilización</label>
                        <p className="mt-1 text-sm text-gray-900">{utilization.utilizationRate}%</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Ingresos</label>
                        <p className="mt-1 text-sm text-gray-900">${utilization.revenue.toLocaleString()}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Reservas</label>
                        <p className="mt-1 text-sm text-gray-900">{utilization.reservationCount}</p>
                      </div>
                    </>
                  ) : null;
                })()}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Creación</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedCourt.createdAt ? new Date(selectedCourt.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'No disponible'}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowCourtModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function exportFile(format: 'csv'|'json') {
    const payload = {
      period,
      dateRange,
      courtsData: {
        summary: data?.summary || {},
        bySport: Array.isArray(data?.bySport) ? data.bySport : [],
        byStatus: Array.isArray(data?.byStatus) ? data.byStatus : [],
        courts: courtsList,
        utilizationData: utilizationData
      },
      metrics: calculatedMetrics,
      filters: {
        searchTerm,
        sportFilter,
        statusFilter,
        centerFilter,
        sortBy,
        sortOrder
      },
      generatedAt: new Date().toISOString(),
    };
    
    const filename = `courts_report_${new Date().toISOString().slice(0,10)}`;
    
    if (format === 'json') {
      exportUtils.downloadJSON(payload, `${filename}.json`);
    } else {
      // Para CSV, crear estructura específica para courts
      const csvData = [
        ['Sección', 'Métrica', 'Valor', 'Período', 'Inicio', 'Fin'],
        ['Resumen', 'Total Canchas', payload.metrics.totalCourts, period, dateRange.start, dateRange.end],
        ['Resumen', 'Canchas Activas', payload.metrics.activeCourts, period, dateRange.start, dateRange.end],
        ['Resumen', 'Canchas Operacionales', payload.metrics.operationalCourts, period, dateRange.start, dateRange.end],
        ['Resumen', 'En Mantenimiento', payload.metrics.maintenanceCourts, period, dateRange.start, dateRange.end],
        ['Resumen', 'Utilización Promedio', `${payload.metrics.averageUtilization}%`, period, dateRange.start, dateRange.end],
        ['Resumen', 'Ingresos Totales', `$${payload.metrics.totalRevenue.toLocaleString()}`, period, dateRange.start, dateRange.end],
        ['Resumen', 'Reservas Totales', payload.metrics.totalReservations, period, dateRange.start, dateRange.end],
        ['Resumen', 'Centros', payload.metrics.centersList.length, period, dateRange.start, dateRange.end],
        ['', '', '', '', '', ''],
        ['Por Deporte', 'Deporte', 'Cantidad', 'Porcentaje', '', ''],
        ...(payload.courtsData.bySport || []).map((s: any) => [
          'Por Deporte', 
          s?.sportType || 'UNKNOWN', 
          s?._count?.id || 0, 
          totalCourts > 0 ? `${Math.round(((s?._count?.id || 0) / totalCourts) * 100)}%` : '0%',
          '', 
          ''
        ]),
        ['', '', '', '', '', ''],
        ['Por Estado', 'Estado', 'Cantidad', 'Porcentaje', '', ''],
        ...(payload.courtsData.byStatus || []).map((s: any) => [
          'Por Estado', 
          s?.maintenanceStatus || 'UNKNOWN', 
          s?._count?.id || 0, 
          totalCourts > 0 ? `${Math.round(((s?._count?.id || 0) / totalCourts) * 100)}%` : '0%',
          '', 
          ''
        ]),
        ['', '', '', '', '', ''],
        ['Canchas Detalladas', 'ID', 'Nombre', 'Centro', 'Deporte', 'Capacidad', 'Precio Base', 'Iluminación', 'Estado', 'Utilización', 'Ingresos', 'Reservas', 'Fecha Creación'],
        ...(payload.courtsData.courts || []).map((court: any) => {
          const utilization = utilizationData.find((u: any) => u.courtId === court.id);
          return [
            'Canchas Detalladas',
            court.id || '',
            court.name || '',
            court.center?.name || '',
            court.sportType || '',
            court.capacity || '',
            `$${Number(court.basePricePerHour || 0).toLocaleString()}`,
            court.hasLighting ? 'Sí' : 'No',
            court.maintenanceStatus || '',
            `${utilization?.utilizationRate || 0}%`,
            `$${(utilization?.revenue || 0).toLocaleString()}`,
            utilization?.reservationCount || 0,
            court.createdAt ? new Date(court.createdAt).toLocaleDateString('es-ES') : ''
          ];
        })
      ];
      exportUtils.downloadCSV(csvData, `${filename}.csv`);
    }
  }
}
