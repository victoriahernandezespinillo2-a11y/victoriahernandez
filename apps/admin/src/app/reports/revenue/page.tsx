'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminReports } from '@/lib/hooks';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon, DocumentTextIcon, ClockIcon, EyeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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

  // Cargar reservas automáticamente cuando cambie el período
  useEffect(() => {
    if (showReservationsTable) {
      loadReservations();
    }
  }, [period, dateRange, showReservationsTable]);

  // Cargar reservas automáticamente al cargar la página para mostrar métricas
  useEffect(() => {
    console.log('🔄 Cargando reservas automáticamente...');
    loadReservations();
  }, [period, dateRange]);

  // Cargar reservas al montar el componente
  useEffect(() => {
    console.log('🔄 Cargando reservas al montar componente...');
    loadReservations();
  }, []);

  // Función para cargar reservas individuales
  const loadReservations = async (page = 1, search = '', status = '') => {
    setReservationsLoading(true);
    try {
      // Obtener un rango más amplio para luego filtrar por startTime
      const startDate = period === 'custom' ? dateRange.start : getPeriodStartDate(period);
      const endDate = period === 'custom' ? dateRange.end : 
        period === '1y' ? '2030-12-31' : new Date().toISOString().slice(0,10);
      
      // Extender el rango para asegurar que capturamos todas las reservas
      const extendedStart = new Date(startDate);
      extendedStart.setDate(extendedStart.getDate() - 7); // 7 días antes
      const extendedEnd = new Date(endDate);
      extendedEnd.setDate(extendedEnd.getDate() + 7); // 7 días después
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100', // Aumentar límite para tener más datos para filtrar
        startDate: extendedStart.toISOString(),
        endDate: extendedEnd.toISOString(),
        sortBy: 'startTime',
        sortOrder: 'desc'
      });
      
      // Solo agregar status si no está vacío y es un valor válido
      if (status && status !== 'PAID,COMPLETED') {
        params.append('status', status);
      }
      
      if (search) params.append('search', search);
      
      console.log('🔍 Cargando reservas con params:', params.toString());
      const response = await fetch(`/api/admin/reservations?${params.toString()}`);
      const result = await response.json();
      
      console.log('📊 Respuesta de API reservas:', result);
      
      if (result.success) {
        // Filtrar por startTime (fecha real de la reserva) y status
        const targetStartDate = new Date(`${startDate}T00:00:00.000Z`);
        const targetEndDate = new Date(`${endDate}T23:59:59.999Z`);
        
        console.log('📅 Fechas objetivo:', { targetStartDate, targetEndDate });
        console.log('📋 Reservas recibidas:', result.data.data.length);
        
        let filteredReservations = result.data.data.filter((r: any) => {
          // Usar el campo 'date' que contiene la fecha en formato ISO
          const reservationDate = new Date(r.date + 'T00:00:00.000Z');
          const isInDateRange = reservationDate >= targetStartDate && reservationDate <= targetEndDate;
          
          let statusMatch = true;
          if (!status || status === 'PAID,COMPLETED') {
            statusMatch = r.status === 'PAID' || r.status === 'COMPLETED';
          } else {
            statusMatch = r.status === status;
          }
          
          return isInDateRange && statusMatch;
        });
        
        console.log('✅ Reservas filtradas:', filteredReservations.length);
        console.log('📊 Primeras 3 reservas:', filteredReservations.slice(0, 3));
        
        setReservations(filteredReservations);
        setReservationsTotal(filteredReservations.length);
        setReservationsPage(page);
      } else {
        console.error('Error en respuesta de API:', result);
      }
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
        // Para 1 año, usar un rango muy amplio para capturar todas las reservas
        ago = new Date('2020-01-01');
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

  // SIEMPRE usar datos de reservas individuales (son los correctos)
  const totalRevenue = calculatedFromReservations.totalRevenue;
  const totalTx = calculatedFromReservations.totalTx;
  const avgTicket = calculatedFromReservations.avgTicket;
  
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte de Ingresos</h1>
          <p className="text-gray-600">Análisis detallado de ingresos por período</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => exportFile('csv')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><DocumentTextIcon className="w-4 h-4"/>Exportar CSV</button>
          <button onClick={() => exportFile('json')} className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50"><DocumentTextIcon className="w-4 h-4"/>Exportar JSON</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-wrap gap-3 items-center">
          {(['7d','30d','90d','1y'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${period===p?'bg-blue-600 text-white':'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>{p==='7d'?'7 Días':p==='30d'?'30 Días':p==='90d'?'90 Días':'1 Año'}</button>
          ))}
          <button onClick={() => setPeriod('custom')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${period==='custom'?'bg-blue-600 text-white':'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>Personalizado</button>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm font-semibold">Agrupar:</label>
            <select value={groupBy} onChange={(e)=>setGroupBy(e.target.value as any)} className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700">
              <option value="day">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
            </select>
          </div>
          {period==='custom' && (
            <div className="flex items-center gap-3">
              <input type="date" value={dateRange.start} onChange={(e)=>setDateRange(r=>({...r,start:e.target.value}))} className="px-3 py-2 border-2 border-gray-300 rounded-lg"/>
              <input type="date" value={dateRange.end} onChange={(e)=>setDateRange(r=>({...r,end:e.target.value}))} className="px-3 py-2 border-2 border-gray-300 rounded-lg"/>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
            <CurrencyDollarIcon className="w-8 h-8 text-green-600"/>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transacciones</p>
              <p className="text-2xl font-bold text-gray-900">{totalTx.toLocaleString()}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-blue-600"/>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-900">${avgTicket.toFixed(2)}</p>
            </div>
            <ArrowTrendingUpIcon className="w-8 h-8 text-purple-600"/>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolución</h3>
          <div className="space-y-3">
            {Array.isArray(data?.byPeriod) && data.byPeriod.length>0 ? data.byPeriod.map((r:any, i:number)=>{
              const amount = Number(r?.totalAmount ?? r?._sum?.amount ?? 0);
              const max = Math.max(...data.byPeriod.map((x:any)=>Number(x?.totalAmount ?? x?._sum?.amount ?? 0)),1);
              const pct = (amount/max)*100;
              const d = new Date(r?.date || r?.createdAt || new Date());
              const label = groupBy==='month'?d.toLocaleDateString('es-ES',{month:'short',year:'2-digit'}):d.toLocaleDateString('es-ES',{day:'2-digit',month:'short'});
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-20">{label}</span>
                  <div className="flex-1 bg-gray-200 h-3 rounded-full"><div className="bg-blue-600 h-3 rounded-full" style={{width:`${pct}%`}}/></div>
                  <span className="text-sm font-medium w-24 text-right text-gray-900">${amount.toLocaleString()}</span>
                </div>
              );
            }):(<div className="text-gray-500">Sin datos</div>)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Método</h3>
          <div className="space-y-2">
            {Array.isArray(data?.byMethod) && data.byMethod.length>0 ? data.byMethod.map((m:any,i:number)=>{
              const count = Number(m?.count ?? m?._count?.id ?? 0);
              const amount = Number(m?.totalAmount ?? m?._sum?.totalPrice ?? m?._sum?.amount ?? 0);
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-800">{(m?.method || m?.paymentMethod || 'UNKNOWN')}</span>
                  <span className="text-gray-800">{count.toLocaleString()} tx</span>
                  <span className="font-medium text-gray-900">${amount.toLocaleString()}</span>
                </div>
              );
            }):(<div className="text-gray-500">Sin datos</div>)}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Detalle de Reservas (Resumen por período)</h3>
          <button 
            onClick={() => {
              setShowReservationsTable(!showReservationsTable);
              if (!showReservationsTable) loadReservations();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <EyeIcon className="w-4 h-4"/>
            {showReservationsTable ? 'Ocultar' : 'Ver'} Reservas Individuales
          </button>
        </div>
        
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
              {Array.isArray(data?.byPeriod)&&data.byPeriod.length>0?data.byPeriod.map((r:any,i:number)=>{
                const d = new Date(r?.date || r?.createdAt || new Date());
                const count = Number(r?.count ?? r?._count?.id ?? 0);
                const amount = Number(r?.totalAmount ?? r?._sum?.amount ?? 0);
                return (
                  <tr key={i} className={i%2?'bg-white':'bg-gray-50'}>
                    <td className="px-4 py-2 text-gray-800">{d.toLocaleDateString('es-ES')}</td>
                    <td className="px-4 py-2 text-right text-gray-800">{count.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">${amount.toLocaleString()}</td>
                  </tr>
                );
              }):(<tr><td colSpan={3} className="px-4 py-4 text-center text-gray-500">Sin datos</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de reservas individuales */}
      {showReservationsTable && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Reservas Individuales ({reservationsTotal.toLocaleString()})</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                <input
                  type="text"
                  placeholder="Buscar por usuario, cancha..."
                  value={reservationsSearch}
                  onChange={(e) => setReservationsSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadReservations(1, e.currentTarget.value, reservationsStatus)}
                  className="pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg text-sm w-64"
                />
              </div>
              <select
                value={reservationsStatus}
                onChange={(e) => {
                  setReservationsStatus(e.target.value);
                  loadReservations(1, reservationsSearch, e.target.value);
                }}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="PAID">Pagadas</option>
                <option value="COMPLETED">Completadas</option>
                <option value="PAID,COMPLETED">Pagadas + Completadas</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Usuario</th>
                  <th className="px-4 py-2 text-left">Cancha</th>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Hora</th>
                  <th className="px-4 py-2 text-right">Duración</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                  <th className="px-4 py-2 text-center">Estado</th>
                  <th className="px-4 py-2 text-center">Método</th>
                </tr>
              </thead>
              <tbody>
                {reservationsLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <ClockIcon className="w-4 h-4 animate-spin"/>
                        Cargando reservas...
                      </div>
                    </td>
                  </tr>
                ) : reservations.length > 0 ? reservations.map((reservation: any, i: number) => (
                  <tr key={reservation.id} className={i % 2 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-gray-800">
                      <div>
                        <div className="font-medium">{reservation.userName}</div>
                        <div className="text-xs text-gray-500">{reservation.userEmail}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-800">
                      <div>
                        <div className="font-medium">{reservation.courtName}</div>
                        <div className="text-xs text-gray-500">{reservation.centerName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-800">{reservation.date}</td>
                    <td className="px-4 py-2 text-gray-800">
                      {reservation.startTime} - {reservation.endTime}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-800">{reservation.duration}h</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      ${Number(reservation.totalAmount).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        reservation.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        reservation.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {reservation.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-800">
                      {reservation.paymentMethod || '-'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron reservas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {reservationsTotal > 50 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-700">
                Mostrando {((reservationsPage - 1) * 50) + 1} - {Math.min(reservationsPage * 50, reservationsTotal)} de {reservationsTotal} reservas
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadReservations(reservationsPage - 1, reservationsSearch, reservationsStatus)}
                  disabled={reservationsPage <= 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Página {reservationsPage} de {Math.ceil(reservationsTotal / 50)}
                </span>
                <button
                  onClick={() => loadReservations(reservationsPage + 1, reservationsSearch, reservationsStatus)}
                  disabled={reservationsPage >= Math.ceil(reservationsTotal / 50)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
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
      generatedAt: new Date().toISOString(),
    };
    if (format==='json') {
      const blob = new Blob([JSON.stringify(payload,null,2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href=url; a.download=`revenue_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
      return;
    }
    const esc = (v:any)=>`"${String(v??'').replace(/"/g,'""')}"`;
    const lines:string[]=[];
    lines.push(['Sección','Label','Valor','Período','Inicio','Fin','Agrupar'].map(esc).join(','));
    lines.push(['Resumen','Ingresos Totales', data?.summary?.totalRevenue||0, period, dateRange.start, dateRange.end, groupBy].map(esc).join(','));
    lines.push(['Resumen','Transacciones', data?.summary?.totalTransactions||0, period, dateRange.start, dateRange.end, groupBy].map(esc).join(','));
    lines.push(['Resumen','Ticket Promedio', (avgTicket||0).toFixed(2), period, dateRange.start, dateRange.end, groupBy].map(esc).join(','));
    lines.push(['','','','','',''].map(esc).join(','));
    lines.push(['Detalle por período','Fecha','Transacciones','Monto','','',''].map(esc).join(','));
    (payload.revenueData.byPeriod||[]).forEach((r:any)=>{
      const d = new Date(r?.date || r?.createdAt || new Date()).toISOString().slice(0,10);
      lines.push(['Detalle por período', d, (r?.count ?? r?._count?.id ?? 0), (r?.totalAmount ?? r?._sum?.amount ?? 0)].map(esc).join(','));
    });
    lines.push(['','','','','',''].map(esc).join(','));
    lines.push(['Detalle por método','Método','Transacciones','Monto','','',''].map(esc).join(','));
    (payload.revenueData.byMethod||[]).forEach((m:any)=>{
      lines.push(['Detalle por método', (m?.method||m?.paymentMethod||'UNKNOWN'), (m?.count ?? m?._count?.id ?? 0), (m?.totalAmount ?? m?._sum?.totalPrice ?? m?._sum?.amount ?? 0)].map(esc).join(','));
    });
    
    // Agregar reservas individuales si están cargadas
    if (showReservationsTable && reservations.length > 0) {
      lines.push(['','','','','',''].map(esc).join(','));
      lines.push(['Reservas Individuales','Usuario','Cancha','Fecha','Hora','Duración','Monto','Estado','Método'].map(esc).join(','));
      reservations.forEach((r:any)=>{
        lines.push([
          'Reservas Individuales',
          r.userName,
          r.courtName,
          r.date,
          `${r.startTime}-${r.endTime}`,
          `${r.duration}h`,
          r.totalAmount,
          r.status,
          r.paymentMethod || ''
        ].map(esc).join(','));
      });
    }
    
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href=url; a.download=`revenue_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }
}


