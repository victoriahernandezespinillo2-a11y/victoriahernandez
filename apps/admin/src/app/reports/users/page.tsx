'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminReports, exportUtils } from '@/lib/hooks';
import { 
  UsersIcon, 
  UserGroupIcon, 
  DocumentTextIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon as FileText
} from '@heroicons/react/24/outline';

export default function UsersReportPage() {
  const { getCustomersReport } = useAdminReports();
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
    period,
    ...(period === 'custom' ? { startDate: dateRange.start, endDate: dateRange.end } : {})
  }), [period, dateRange]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        console.log('👥 Cargando reporte de usuarios con params:', params);
        const res = await getCustomersReport(params);
        if (!active) return;
        console.log('👥 Respuesta reporte usuarios:', res);
        
        // Acceder correctamente a los datos anidados
        const reportData = res?.data || res;
        console.log('📋 Datos del reporte usuarios:', reportData);
        setData(reportData);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [getCustomersReport, params]);

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
      totalUsers: 0, 
      newUsers: 0, 
      activeUsers: 0, 
      inactiveUsers: 0,
      byRole: [],
      byMembership: []
    };
    
    const totalUsers = Number(data?.summary?.totalUsers || 0);
    const byRole = Array.isArray(data?.byRole) ? data.byRole : [];
    const byActive = Array.isArray(data?.byActive) ? data.byActive : [];
    
    // Calcular usuarios activos e inactivos
    const activeUsers = byActive.find((r: any) => r.isActive === true)?._count?.id || 0;
    const inactiveUsers = byActive.find((r: any) => r.isActive === false)?._count?.id || 0;
    
    // Para usuarios nuevos, asumimos que son todos los del período
    const newUsers = totalUsers;
    
    return { 
      totalUsers, 
      newUsers, 
      activeUsers, 
      inactiveUsers,
      byRole,
      byMembership: [] // TODO: Implementar cuando esté disponible en el backend
    };
  }, [data]);

  const { totalUsers, newUsers, activeUsers, inactiveUsers, byRole, byMembership } = calculatedMetrics;

  // Debug de métricas
  console.log('👥 Métricas calculadas:', {
    fromAPI: {
      totalUsers: Number(data?.summary?.totalUsers || 0)
    },
    calculated: calculatedMetrics,
    dataSummary: data?.summary,
    dataByRole: data?.byRole?.length || 0,
    fullData: data
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte de Usuarios</h1>
          <p className="text-gray-600">Análisis detallado de usuarios y membresías</p>
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
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalUsers.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Nuevos Usuarios</p>
                  <p className="text-2xl font-semibold text-gray-900">{newUsers.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Usuarios Activos</p>
                  <p className="text-2xl font-semibold text-gray-900">{activeUsers.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarDaysIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Usuarios Inactivos</p>
                  <p className="text-2xl font-semibold text-gray-900">{inactiveUsers.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Distribución por roles */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Roles</h3>
            <div className="space-y-3">
              {byRole.map((role: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-3"></div>
                    <span className="text-sm font-medium text-gray-700">
                      {role.role === 'ADMIN' ? 'Administradores' : 
                       role.role === 'USER' ? 'Usuarios' : 
                       role.role === 'STAFF' ? 'Personal' : role.role}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-gray-900 mr-2">
                      {role._count?.id || 0}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({totalUsers > 0 ? Math.round(((role._count?.id || 0) / totalUsers) * 100) : 0}%)
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
                <h4 className="text-sm font-medium text-gray-500 mb-2">Tasa de Actividad</h4>
                <p className="text-sm text-gray-900">
                  {totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}%
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
      usersData: {
        summary: data?.summary || {},
        byRole: Array.isArray(data?.byRole) ? data.byRole : [],
        byActive: Array.isArray(data?.byActive) ? data.byActive : [],
      },
      metrics: calculatedMetrics,
      generatedAt: new Date().toISOString(),
    };
    
    const filename = `users_report_${new Date().toISOString().slice(0,10)}`;
    
    if (format === 'json') {
      exportUtils.downloadJSON(payload, `${filename}.json`);
    } else {
      // Para CSV, crear estructura específica para users
      const csvData = [
        ['Sección', 'Métrica', 'Valor', 'Período', 'Inicio', 'Fin'],
        ['Resumen', 'Total Usuarios', payload.metrics.totalUsers, period, dateRange.start, dateRange.end],
        ['Resumen', 'Nuevos Usuarios', payload.metrics.newUsers, period, dateRange.start, dateRange.end],
        ['Resumen', 'Usuarios Activos', payload.metrics.activeUsers, period, dateRange.start, dateRange.end],
        ['Resumen', 'Usuarios Inactivos', payload.metrics.inactiveUsers, period, dateRange.start, dateRange.end],
        ['', '', '', '', '', ''],
        ['Por Rol', 'Rol', 'Cantidad', '', '', ''],
        ...(payload.usersData.byRole || []).map((r: any) => ['Por Rol', r?.role || 'UNKNOWN', r?._count?.id || 0, '', '', '']),
        ['', '', '', '', '', ''],
        ['Por Estado', 'Estado', 'Cantidad', '', '', ''],
        ...(payload.usersData.byActive || []).map((a: any) => ['Por Estado', a?.isActive ? 'Activo' : 'Inactivo', a?._count?.id || 0, '', '', ''])
      ];
      exportUtils.downloadCSV(csvData, `${filename}.csv`);
    }
  }
}
