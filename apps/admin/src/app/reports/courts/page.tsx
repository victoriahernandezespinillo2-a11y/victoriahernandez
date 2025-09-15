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
  DocumentTextIcon as FileText
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

  // Calcular métricas desde los datos
  const calculatedMetrics = useMemo(() => {
    if (!data) return { 
      totalCourts: 0, 
      availableCourts: 0, 
      maintenanceCourts: 0, 
      averageUtilization: 0,
      bySport: [],
      byStatus: []
    };
    
    const totalCourts = Number(data?.summary?.totalCourts || 0);
    const bySport = Array.isArray(data?.bySport) ? data.bySport : [];
    const byStatus = Array.isArray(data?.byStatus) ? data.byStatus : [];
    
    // Calcular canchas disponibles y en mantenimiento
    const availableCourts = byStatus.find((s: any) => s.maintenanceStatus === 'operational')?._count?.id || 0;
    const maintenanceCourts = byStatus.find((s: any) => s.maintenanceStatus !== 'operational')?._count?.id || 0;
    
    // Calcular utilización promedio (simulado por ahora)
    const averageUtilization = totalCourts > 0 ? Math.round((availableCourts / totalCourts) * 100) : 0;
    
    return { 
      totalCourts, 
      availableCourts, 
      maintenanceCourts, 
      averageUtilization,
      bySport,
      byStatus
    };
  }, [data]);

  const { totalCourts, availableCourts, maintenanceCourts, averageUtilization, bySport, byStatus } = calculatedMetrics;

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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte de Canchas</h1>
          <p className="text-gray-600">Utilización y rendimiento de canchas</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => exportFile('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Exportar CSV
          </button>
          <button 
            onClick={() => exportFile('json')}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-400 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Exportar JSON
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-wrap gap-3 items-center">
          {(['7d','30d','90d','1y'] as const).map((p) => (
            <button 
              key={p} 
              onClick={() => setPeriod(p)} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                period===p?'bg-blue-600 text-white':'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {p==='7d'?'7 Días':p==='30d'?'30 Días':p==='90d'?'90 Días':'1 Año'}
            </button>
          ))}
          <button 
            onClick={() => setPeriod('custom')} 
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              period==='custom'?'bg-blue-600 text-white':'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            Personalizado
          </button>
          {period==='custom' && (
            <div className="flex items-center gap-3">
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={(e)=>setDateRange(r=>({...r,start:e.target.value}))} 
                className="px-3 py-2 border-2 border-gray-300 rounded-lg"
              />
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={(e)=>setDateRange(r=>({...r,end:e.target.value}))} 
                className="px-3 py-2 border-2 border-gray-300 rounded-lg"
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
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <MapPinIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Canchas</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalCourts.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrophyIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Canchas Disponibles</p>
                  <p className="text-2xl font-semibold text-gray-900">{availableCourts.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <WrenchScrewdriverIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">En Mantenimiento</p>
                  <p className="text-2xl font-semibold text-gray-900">{maintenanceCourts.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Utilización Promedio</p>
                  <p className="text-2xl font-semibold text-gray-900">{averageUtilization}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Distribución por deporte */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Deporte</h3>
            <div className="space-y-3">
              {bySport.map((sport: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
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
                    <span className="text-xs text-gray-500">
                      ({totalCourts > 0 ? Math.round(((sport._count?.id || 0) / totalCourts) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estado de mantenimiento */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Mantenimiento</h3>
            <div className="space-y-3">
              {byStatus.map((status: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      status.maintenanceStatus === 'operational' ? 'bg-green-500' :
                      status.maintenanceStatus === 'maintenance' ? 'bg-yellow-500' :
                      status.maintenanceStatus === 'out_of_order' ? 'bg-red-500' : 'bg-gray-500'
                    }`}></div>
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
                    <span className="text-xs text-gray-500">
                      ({totalCourts > 0 ? Math.round(((status._count?.id || 0) / totalCourts) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                  {totalCourts > 0 ? Math.round((availableCourts / totalCourts) * 100) : 0}% de canchas operativas
                </p>
              </div>
            </div>
          </div>
        </>
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
      },
      metrics: calculatedMetrics,
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
        ['Resumen', 'Canchas Disponibles', payload.metrics.availableCourts, period, dateRange.start, dateRange.end],
        ['Resumen', 'En Mantenimiento', payload.metrics.maintenanceCourts, period, dateRange.start, dateRange.end],
        ['Resumen', 'Utilización Promedio', `${payload.metrics.averageUtilization}%`, period, dateRange.start, dateRange.end],
        ['', '', '', '', '', ''],
        ['Por Deporte', 'Deporte', 'Cantidad', '', '', ''],
        ...(payload.courtsData.bySport || []).map((s: any) => ['Por Deporte', s?.sportType || 'UNKNOWN', s?._count?.id || 0, '', '', '']),
        ['', '', '', '', '', ''],
        ['Por Estado', 'Estado', 'Cantidad', '', '', ''],
        ...(payload.courtsData.byStatus || []).map((s: any) => ['Por Estado', s?.maintenanceStatus || 'UNKNOWN', s?._count?.id || 0, '', '', ''])
      ];
      exportUtils.downloadCSV(csvData, `${filename}.csv`);
    }
  }
}
