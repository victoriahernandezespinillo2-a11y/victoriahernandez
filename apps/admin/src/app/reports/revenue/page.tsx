'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminReports, exportUtils } from '@/lib/hooks';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon, DocumentTextIcon, ClockIcon, EyeIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function RevenueReportPage() {
  const { getRevenueReport, reset } = useAdminReports();
  const [period, setPeriod] = useState<'7d'|'30d'|'90d'|'1y'|'custom'>('1y');
  const [groupBy, setGroupBy] = useState<'day'|'week'|'month'>('month');
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const ago = new Date();
    ago.setFullYear(today.getFullYear() - 1); // Último año por defecto
    return { start: ago.toISOString().slice(0,10), end: today.toISOString().slice(0,10) };
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Estados para tabla de reservas individuales
  const [reservations, setReservations] = useState<any[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsPage, setReservationsPage] = useState(1);
  const [reservationsTotal, setReservationsTotal] = useState(0);
  const [reservationsSearch, setReservationsSearch] = useState('');
  const [reservationsStatus, setReservationsStatus] = useState<string>('');
  const [showReservationsTable, setShowReservationsTable] = useState(false);

  const params = useMemo(() => ({
    period,
    groupBy,
    ...(period === 'custom' ? { startDate: dateRange.start, endDate: dateRange.end } : {})
  }), [period, groupBy, dateRange]);

  // Debug de parámetros
  console.log('🔧 [REVENUE] Parámetros enviados al API:', params);
  console.log('🔧 [REVENUE] Período seleccionado:', period);
  console.log('🔧 [REVENUE] Rango de fechas:', dateRange);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        console.log('📊 Cargando reporte de ingresos con params:', params);
        const res = await getRevenueReport(params);
        if (!active) return;
        console.log('💰 Respuesta reporte ingresos:', res);
        
        // Acceder correctamente a los datos anidados
        const reportData = res?.data || res;
        console.log('📋 Datos del reporte:', reportData);
        setData(reportData);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [getRevenueReport, params]);

  // Cargar reservas automáticamente cuando cambie el período o se muestre la tabla
  useEffect(() => {
    if (showReservationsTable) {
      console.log('🔄 Cargando reservas (tabla visible) - período/fecha cambiaron...');
      // Resetear a página 1 cuando cambia el período
      setReservationsPage(1);
      loadReservations(1, reservationsSearch, reservationsStatus);
    }
  }, [period, dateRange, showReservationsTable]);

  // Función para cargar reservas individuales
  const loadReservations = async (page?: number, search?: string, status?: string) => {
    // Usar valores proporcionados o los valores actuales del estado
    const currentPage = page ?? reservationsPage;
    const currentSearch = search ?? reservationsSearch;
    const currentStatus = status ?? reservationsStatus;
    setReservationsLoading(true);
    try {
      // Usar rango real (coherente con backend: paidAt para coincidir con reporte de ingresos)
      const startDate = period === 'custom' ? dateRange.start : getPeriodStartDate(period);
      const endDate = period === 'custom' ? dateRange.end : new Date().toISOString().slice(0,10);
      
      // Si no hay filtro de estado, usar createdAt para incluir TODAS las reservas (incluso sin paidAt)
      // Si hay filtro de estado específico (incluyendo PAID,COMPLETED), usar paidAt para coincidir con el reporte de ingresos
      const usePaidAt = currentStatus && currentStatus !== '';
      
      const baseParams = {
        startDate: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
        endDate: new Date(`${endDate}T23:59:59.999Z`).toISOString(),
        sortBy: usePaidAt ? 'paidAt' : 'createdAt', // Usar paidAt solo cuando hay filtro específico
        sortOrder: 'desc',
        dateField: usePaidAt ? 'paidAt' : 'createdAt' // Usar createdAt para "todos los estados" para incluir todas las reservas
      };
      
      let rows: any[] = [];
      let total = 0;
      
      // Si no hay filtro de estado o es "Todos los estados", hacer una sola consulta sin filtro
      if (!currentStatus || currentStatus === '') {
        // Consulta sin filtro de estado para obtener TODAS las reservas
        const params = new URLSearchParams({
          ...baseParams,
          page: currentPage.toString(),
          limit: '50',
          ...(currentSearch && { search: currentSearch })
          // No incluir 'status' para obtener todas las reservas
        });
        
        const response = await fetch(`/api/admin/reservations?${params.toString()}`);
        if (!response.ok) {
          console.error('❌ Error en consulta sin filtro de estado:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        
        console.log('🔍 [loadReservations] Respuesta sin filtro de estado:', {
          success: result?.success,
          dataLength: result?.data?.data?.length,
          pagination: result?.data?.pagination
        });
        
        if (result.success) {
          rows = Array.isArray(result?.data?.data) ? result.data.data : [];
          const pagination = result?.data?.pagination || result?.pagination;
          total = Number(pagination?.total ?? 0);
          console.log('✅ TODAS las reservas obtenidas:', rows.length, 'Total:', total, 'Pagination:', pagination);
        } else {
          console.error('❌ Error en respuesta de API:', result);
          rows = [];
          total = 0;
        }
      } else if (currentStatus === 'PAID,COMPLETED') {
        // Para PAID,COMPLETED, hacer dos consultas y combinar
        // Para paginación correcta, necesitamos obtener suficientes reservas de cada tipo
        // y luego combinar y paginar en cliente
        // Obtener suficientes reservas para la página actual (con margen de seguridad)
        const itemsPerPage = 50;
        // Obtener al menos (página actual * items por página) + margen de seguridad
        // Esto asegura que tenemos suficientes después de combinar y ordenar
        const fetchLimit = Math.max(itemsPerPage * currentPage + 50, 200);
        
        const [paidResponse, completedResponse] = await Promise.all([
          fetch(`/api/admin/reservations?${new URLSearchParams({
            ...baseParams,
            page: '1',
            limit: fetchLimit.toString(),
            status: 'PAID',
            ...(currentSearch && { search: currentSearch })
          })}`).then(r => {
            if (!r.ok) {
              console.error('❌ Error en consulta PAID:', r.status, r.statusText);
              return { success: false, data: { data: [], pagination: { total: 0 } } };
            }
            return r.json();
          }),
          fetch(`/api/admin/reservations?${new URLSearchParams({
            ...baseParams,
            page: '1',
            limit: fetchLimit.toString(),
            status: 'COMPLETED',
            ...(currentSearch && { search: currentSearch })
          })}`).then(r => {
            if (!r.ok) {
              console.error('❌ Error en consulta COMPLETED:', r.status, r.statusText);
              return { success: false, data: { data: [], pagination: { total: 0 } } };
            }
            return r.json();
          })
        ]);
        
        console.log('🔍 [loadReservations] Respuestas recibidas:', {
          paidSuccess: paidResponse?.success,
          paidData: paidResponse?.data?.data?.length,
          paidPagination: paidResponse?.data?.pagination,
          completedSuccess: completedResponse?.success,
          completedData: completedResponse?.data?.data?.length,
          completedPagination: completedResponse?.data?.pagination
        });
        
        // Combinar resultados y ordenar por paidAt descendente (o startTime si paidAt no está disponible)
        const paidRows = Array.isArray(paidResponse?.data?.data) ? paidResponse.data.data : [];
        const completedRows = Array.isArray(completedResponse?.data?.data) ? completedResponse.data.data : [];
        const allRows = [...paidRows, ...completedRows]
          .sort((a, b) => {
            const dateA = a.paidAt ? new Date(a.paidAt).getTime() : new Date(a.startTime).getTime();
            const dateB = b.paidAt ? new Date(b.paidAt).getTime() : new Date(b.startTime).getTime();
            return dateB - dateA;
          });
        
        // Paginar en cliente
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        rows = allRows.slice(startIndex, endIndex);
        
        // Sumar los totales de ambas consultas para el total real
        // Verificar que las respuestas tengan la estructura correcta
        const paidPagination = paidResponse?.data?.pagination || paidResponse?.pagination;
        const completedPagination = completedResponse?.data?.pagination || completedResponse?.pagination;
        const paidTotal = Number(paidPagination?.total ?? 0);
        const completedTotal = Number(completedPagination?.total ?? 0);
        total = paidTotal + completedTotal;
        
        console.log('🔍 [loadReservations] Totales extraídos:', {
          paidPagination,
          completedPagination,
          paidTotal,
          completedTotal,
          total
        });
        
        console.log('✅ PAID reservas obtenidas:', paidRows.length, 'Total en BD:', paidTotal);
        console.log('✅ COMPLETED reservas obtenidas:', completedRows.length, 'Total en BD:', completedTotal);
        console.log('✅ Total combinado:', total);
        console.log('✅ Página', currentPage, '- Mostrando', rows.length, 'de', allRows.length, 'reservas obtenidas');
        console.log('✅ Estableciendo reservationsTotal a:', total);
      } else {
        // Para un estado específico, hacer una sola consulta
        const params = new URLSearchParams({
          ...baseParams,
          page: currentPage.toString(),
          limit: '50',
          status: currentStatus,
          ...(currentSearch && { search: currentSearch })
        });
        
        const response = await fetch(`/api/admin/reservations?${params.toString()}`);
        if (!response.ok) {
          console.error('❌ Error en consulta de estado específico:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        
        console.log('🔍 [loadReservations] Respuesta estado específico:', {
          success: result?.success,
          dataLength: result?.data?.data?.length,
          pagination: result?.data?.pagination
        });
        
        if (result.success) {
          rows = Array.isArray(result?.data?.data) ? result.data.data : [];
          // Intentar obtener el total de diferentes formas posibles
          const pagination = result?.data?.pagination || result?.pagination;
          total = Number(pagination?.total ?? 0);
          console.log('✅ Reservas recibidas:', rows.length, 'Total:', total, 'Pagination:', pagination);
        } else {
          console.error('❌ Error en respuesta de API:', result);
          rows = [];
          total = 0;
        }
      }
      
      console.log('🔍 [loadReservations] Final - rows:', rows.length, 'total:', total, 'page:', currentPage);
      setReservations(rows);
      setReservationsTotal(total);
      setReservationsPage(currentPage);
      console.log('🔍 [loadReservations] Estado actualizado - reservationsTotal:', total, 'page:', currentPage);
    } catch (error) {
      console.error('Error cargando reservas:', error);
    } finally {
      setReservationsLoading(false);
    }
  };

  // Función auxiliar para calcular fecha de inicio del período
  const getPeriodStartDate = (p: string) => {
    const today = new Date();
    let ago = new Date();
    
    switch (p) {
      case '7d': ago.setDate(today.getDate() - 7); break;
      case '30d': ago.setDate(today.getDate() - 30); break;
      case '90d': ago.setDate(today.getDate() - 90); break;
      case '1y': 
        // Para 1 año, hoy - 1 año (coherente con backend)
        ago = new Date(today);
        ago.setFullYear(today.getFullYear() - 1);
        break;
      default: ago.setDate(today.getDate() - 30);
    }
    
    return ago.toISOString().slice(0,10);
  };

  // Calcular métricas desde las reservas individuales si están disponibles
  const calculatedFromReservations = useMemo(() => {
    if (reservations.length === 0) return { totalRevenue: 0, totalTx: 0, avgTicket: 0 };
    
    const total = reservations.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    const count = reservations.length;
    const avg = count > 0 ? total / count : 0;
    
    return { totalRevenue: total, totalTx: count, avgTicket: avg };
  }, [reservations]);

  // Métricas de cabecera: usar summary del backend como fuente de verdad
  const backendRevenue = Number(data?.summary?.totalRevenue || 0);
  const backendTx = Number(data?.summary?.totalTransactions || 0);
  const totalRevenue = backendRevenue;
  const totalTx = backendTx;
  const avgTicket = totalTx > 0 ? totalRevenue / totalTx : 0;
  
  // Debug de métricas
  console.log('💵 Métricas calculadas:', {
    fromAPI: {
      totalRevenue: Number(data?.summary?.totalRevenue || 0),
      totalTx: Number(data?.summary?.totalTransactions || 0)
    },
    fromReservations: calculatedFromReservations,
    final: { totalRevenue, totalTx, avgTicket },
    dataSummary: data?.summary,
    dataByPeriod: data?.byPeriod?.length || 0,
    dataByMethod: data?.byMethod?.length || 0,
    fullData: data
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header móvil */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reporte de Ingresos</h1>
              <p className="text-sm text-gray-600">Análisis detallado de ingresos por período</p>
            </div>
          </div>
          
          {/* Botones de acción móviles */}
          <div className="flex gap-2">
            <button 
              onClick={() => exportFile('csv')} 
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <DocumentTextIcon className="w-4 h-4"/>
              Exportar CSV
            </button>
            <button 
              onClick={() => exportFile('json')} 
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-sm font-medium"
            >
              <DocumentTextIcon className="w-4 h-4"/>
              Exportar JSON
            </button>
          </div>
        </div>
      </div>

      {/* Controles de período móviles */}
      <div className="px-4 py-3">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          {/* Botones de período en grid móvil */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(['7d','30d','90d','1y'] as const).map((p) => (
              <button 
                key={p} 
                onClick={() => setPeriod(p)} 
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  period===p
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {p==='7d'?'7 Días':p==='30d'?'30 Días':p==='90d'?'90 Días':'1 Año'}
              </button>
            ))}
          </div>
          
          {/* Personalizado */}
          <button 
            onClick={() => setPeriod('custom')} 
            className={`w-full px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 mb-4 ${
              period==='custom'
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
                onChange={(e)=>setGroupBy(e.target.value as any)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              >
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
              </select>
            </div>
            
            {period==='custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Desde:</label>
                  <input 
                    type="date" 
                    value={dateRange.start} 
                    onChange={(e)=>setDateRange(r=>({...r,start:e.target.value}))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Hasta:</label>
                  <input 
                    type="date" 
                    value={dateRange.end} 
                    onChange={(e)=>setDateRange(r=>({...r,end:e.target.value}))} 
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
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600"/>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Ingresos Totales</p>
            <p className="text-lg font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-2">
                <ClockIcon className="w-5 h-5 text-blue-600"/>
              </div>
              <p className="text-xs font-medium text-gray-600 mb-1">Transacciones</p>
              <p className="text-lg font-bold text-gray-900">{totalTx.toLocaleString()}</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-2">
                <ArrowTrendingUpIcon className="w-5 h-5 text-purple-600"/>
              </div>
              <p className="text-xs font-medium text-gray-600 mb-1">Ticket Promedio</p>
              <p className="text-lg font-bold text-gray-900">${avgTicket.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos móviles */}
      <div className="px-4 pb-3 space-y-3">
        {/* Evolución móvil */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Evolución de Ingresos</h3>
          <div className="space-y-2">
            {Array.isArray(data?.byPeriod) && data.byPeriod.length>0 ? data.byPeriod.slice(0, 5).map((r:any, i:number)=>{
              const amount = Number(r?.totalAmount ?? r?._sum?.amount ?? 0);
              const max = Math.max(...data.byPeriod.map((x:any)=>Number(x?.totalAmount ?? x?._sum?.amount ?? 0)),1);
              const pct = (amount/max)*100;
              const d = new Date(r?.date || r?.createdAt || new Date());
              const label = groupBy==='month'?d.toLocaleDateString('es-ES',{month:'short',year:'2-digit'}):d.toLocaleDateString('es-ES',{day:'2-digit',month:'short'});
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-12">{label}</span>
                  <div className="flex-1 bg-gray-200 h-2 rounded-full">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width:`${pct}%`}}/>
                  </div>
                  <span className="text-xs font-medium w-16 text-right text-gray-900">${amount.toLocaleString()}</span>
                </div>
              );
            }):(<div className="text-center py-4 text-gray-500 text-sm">Sin datos</div>)}
          </div>
        </div>

        {/* Por método móvil */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Por Método de Pago</h3>
          <div className="space-y-2">
            {Array.isArray(data?.byMethod) && data.byMethod.length>0 ? data.byMethod.map((m:any,i:number)=>{
              const count = Number(m?.count ?? m?._count?.id ?? 0);
              const amount = Number(m?.totalAmount ?? m?._sum?.totalPrice ?? m?._sum?.amount ?? 0);
              return (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-800 truncate flex-1">{(m?.method || m?.paymentMethod || 'UNKNOWN')}</span>
                  <span className="text-gray-600 mx-2">{count.toLocaleString()} tx</span>
                  <span className="font-medium text-gray-900">${amount.toLocaleString()}</span>
                </div>
              );
            }):(<div className="text-center py-4 text-gray-500 text-sm">Sin datos</div>)}
          </div>
        </div>
      </div>

      {/* Detalle de reservas móvil */}
      <div className="px-4 pb-3">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Resumen por Período</h3>
            <button 
              onClick={() => {
                const newShowState = !showReservationsTable;
                setShowReservationsTable(newShowState);
                if (newShowState) {
                  console.log('🔄 Botón "Ver Detalles" clickeado - cargando reservas...');
                  // Resetear a página 1 y cargar reservas
                  setReservationsPage(1);
                  loadReservations(1, reservationsSearch, reservationsStatus);
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
            >
              <EyeIcon className="w-3 h-3"/>
              {showReservationsTable ? 'Ocultar' : 'Ver'} Detalles
            </button>
          </div>
          
          <div className="space-y-2">
            {Array.isArray(data?.byPeriod)&&data.byPeriod.length>0?data.byPeriod.slice(0, 5).map((r:any,i:number)=>{
              const d = new Date(r?.date || r?.createdAt || new Date());
              const count = Number(r?.count ?? r?._count?.id ?? 0);
              const amount = Number(r?.totalAmount ?? r?._sum?.amount ?? 0);
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-800">{d.toLocaleDateString('es-ES')}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600">{count.toLocaleString()} tx</span>
                    <span className="text-xs font-medium text-gray-900">${amount.toLocaleString()}</span>
                  </div>
                </div>
              );
            }):(<div className="text-center py-4 text-gray-500 text-sm">Sin datos</div>)}
          </div>
        </div>
      </div>

      {/* Tabla de reservas individuales móvil */}
      {showReservationsTable && (
        <div className="px-4 pb-3">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Reservas ({reservationsTotal.toLocaleString()})</h3>
              <button
                onClick={() => exportFile('csv')}
                className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs"
              >
                <ArrowDownTrayIcon className="w-3 h-3"/>
                CSV
              </button>
            </div>

            {/* Filtros móviles */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={reservationsSearch}
                  onChange={(e) => setReservationsSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadReservations(1, e.currentTarget.value, reservationsStatus)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full"
                />
              </div>
              <select
                value={reservationsStatus}
                onChange={(e) => {
                  setReservationsStatus(e.target.value);
                  loadReservations(1, reservationsSearch, e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="PAID">Pagadas</option>
                <option value="COMPLETED">Completadas</option>
                <option value="PAID,COMPLETED">Pagadas + Completadas</option>
              </select>
            </div>

            {/* Lista de reservas móvil */}
            <div className="space-y-2">
              {reservationsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <ClockIcon className="w-4 h-4 animate-spin"/>
                    Cargando reservas...
                  </div>
                </div>
              ) : reservations.length > 0 ? reservations.map((reservation: any, i: number) => (
                <div key={reservation.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{reservation.userName}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      reservation.status === 'PAID' ? 'bg-green-100 text-green-800' :
                      reservation.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {reservation.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Cancha:</span>
                      <span className="text-gray-800">{reservation.courtName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Centro:</span>
                      <span className="text-gray-800">{reservation.centerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fecha:</span>
                      <span className="text-gray-800">{reservation.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hora:</span>
                      <span className="text-gray-800">{reservation.startTime} - {reservation.endTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duración:</span>
                      <span className="text-gray-800">{reservation.duration}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Método:</span>
                      <span className="text-gray-800">{reservation.paymentMethod || '-'}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Monto:</span>
                      <span className="text-gray-900">${Number(reservation.totalAmount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron reservas
                </div>
              )}
            </div>

            {/* Paginación - Mostrar si hay más de una página */}
            {(() => {
              const totalPages = Math.ceil(reservationsTotal / 50);
              const shouldShow = totalPages > 1 && reservationsTotal > 0;
              
              // Log siempre para debug
              if (showReservationsTable) {
                console.log('🔍 [Revenue] Paginación DEBUG:', {
                  reservationsTotal,
                  reservationsLength: reservations.length,
                  reservationsPage,
                  totalPages,
                  shouldShow
                });
              }
              
              return shouldShow;
            })() && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-600">
                    Mostrando {((reservationsPage - 1) * 50 + 1)}-{Math.min(reservationsPage * 50, reservationsTotal)} de {reservationsTotal.toLocaleString()} reservas
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      const prevPage = Math.max(1, reservationsPage - 1);
                      setReservationsPage(prevPage);
                      loadReservations(prevPage, reservationsSearch, reservationsStatus);
                    }}
                    disabled={reservationsPage === 1 || reservationsLoading}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const totalPages = Math.ceil(reservationsTotal / 50);
                      const pages: (number | string)[] = [];
                      
                      if (totalPages <= 5) {
                        // Mostrar todas las páginas si son 5 o menos
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // Lógica para mostrar páginas con elipsis
                        pages.push(1);
                        
                        if (reservationsPage > 3) {
                          pages.push('...');
                        }
                        
                        const start = Math.max(2, reservationsPage - 1);
                        const end = Math.min(totalPages - 1, reservationsPage + 1);
                        
                        for (let i = start; i <= end; i++) {
                          if (i !== 1 && i !== totalPages) {
                            pages.push(i);
                          }
                        }
                        
                        if (reservationsPage < totalPages - 2) {
                          pages.push('...');
                        }
                        
                        pages.push(totalPages);
                      }
                      
                      return pages.map((page, idx) => {
                        if (page === '...') {
                          return <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">...</span>;
                        }
                        const pageNum = page as number;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => {
                              setReservationsPage(pageNum);
                              loadReservations(pageNum, reservationsSearch, reservationsStatus);
                            }}
                            disabled={reservationsLoading}
                            className={`px-3 py-2 text-sm font-medium rounded-lg ${
                              pageNum === reservationsPage
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {pageNum}
                          </button>
                        );
                      });
                    })()}
                  </div>
                  <button
                    onClick={() => {
                      const totalPages = Math.ceil(reservationsTotal / 50);
                      const nextPage = Math.min(totalPages, reservationsPage + 1);
                      setReservationsPage(nextPage);
                      loadReservations(nextPage, reservationsSearch, reservationsStatus);
                    }}
                    disabled={reservationsPage >= Math.ceil(reservationsTotal / 50) || reservationsLoading}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-4 right-4 bg-white shadow rounded-lg px-3 py-2 flex items-center gap-2">
          <ClockIcon className="w-5 h-5 animate-spin"/><span className="text-sm">Cargando…</span>
        </div>
      )}

      <style jsx>{`
        
      `}</style>
    </div>
  );

  function exportFile(format: 'csv'|'json') {
    const payload = {
      period,
      groupBy,
      dateRange,
      revenueData: {
        summary: data?.summary || {},
        byPeriod: Array.isArray(data?.byPeriod)?data.byPeriod:[],
        byMethod: Array.isArray(data?.byMethod)?data.byMethod:[],
      },
      reservations: showReservationsTable ? reservations : [],
      metrics: {
        totalRevenue,
        totalTx,
        avgTicket
      },
      generatedAt: new Date().toISOString(),
    };
    
    const filename = `revenue_${new Date().toISOString().slice(0,10)}`;
    
    if (format === 'json') {
      exportUtils.downloadJSON(payload, `${filename}.json`);
    } else {
      // Para CSV, crear estructura específica para revenue
      const csvData = [
        ['Sección', 'Label', 'Valor', 'Período', 'Inicio', 'Fin', 'Agrupar'],
        ['Resumen', 'Ingresos Totales', data?.summary?.totalRevenue||0, period, dateRange.start, dateRange.end, groupBy],
        ['Resumen', 'Transacciones', data?.summary?.totalTransactions||0, period, dateRange.start, dateRange.end, groupBy],
        ['Resumen', 'Ticket Promedio', (avgTicket||0).toFixed(2), period, dateRange.start, dateRange.end, groupBy],
        ['', '', '', '', '', '', ''],
        ['Detalle por período', 'Fecha', 'Transacciones', 'Monto', '', '', ''],
        ...(payload.revenueData.byPeriod||[]).map((r:any) => {
          const d = new Date(r?.date || r?.createdAt || new Date()).toISOString().slice(0,10);
          return ['Detalle por período', d, (r?.count ?? r?._count?.id ?? 0), (r?.totalAmount ?? r?._sum?.amount ?? 0), '', '', ''];
        }),
        ['', '', '', '', '', '', ''],
        ['Detalle por método', 'Método', 'Transacciones', 'Monto', '', '', ''],
        ...(payload.revenueData.byMethod||[]).map((m:any) => [
          'Detalle por método', 
          m?.method || 'UNKNOWN', 
          m?.count || 0, 
          m?.totalAmount || 0, 
          '', '', ''
        ])
      ];
      exportUtils.downloadCSV(csvData, `${filename}.csv`);
    }
  }
}


