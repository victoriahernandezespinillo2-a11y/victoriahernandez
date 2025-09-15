'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminReports, exportUtils } from '@/lib/hooks';
import OccupancyCalendar from '@/components/OccupancyCalendar';
import { 
  CalendarDaysIcon, 
  UserGroupIcon, 
  DocumentTextIcon, 
  BoltIcon, 
  EyeIcon, 
  MagnifyingGlassIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function ReservationsReportPage() {
  const { getUsageReport } = useAdminReports();
  const [period, setPeriod] = useState<'7d'|'30d'|'90d'|'1y'|'custom'>('90d');
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const ago = new Date();
    ago.setDate(today.getDate() - 90);
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
  const [reservationsSport, setReservationsSport] = useState<string>('');
  const [showReservationsTable, setShowReservationsTable] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);

  const params = useMemo(() => ({
    period,
    ...(period === 'custom' ? { startDate: dateRange.start, endDate: dateRange.end } : {})
  }), [period, dateRange]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getUsageReport(params);
        if (!active) return; 
        setData(res as any);
        // Cargar reservas automáticamente para mostrar datos reales
        loadReservations();
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [getUsageReport, params]);

  // Función para cargar reservas individuales
  const loadReservations = async (page = 1, search = '', status = '', sport = '') => {
    setReservationsLoading(true);
    try {
      const startDate = period === 'custom' ? dateRange.start : getPeriodStartDate(period);
      const endDate = period === 'custom' ? dateRange.end : new Date().toISOString().slice(0,10);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        startDate: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
        endDate: new Date(`${endDate}T23:59:59.999Z`).toISOString(),
        sortBy: 'startTime',
        sortOrder: 'desc',
        dateField: 'startTime'
      });
      
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/admin/reservations?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        let rows: any[] = Array.isArray(result?.data?.data) ? result.data.data : [];
        
        // Filtrar por deporte si se especifica
        if (sport) {
          rows = rows.filter((r: any) => r.courtName?.toLowerCase().includes(sport.toLowerCase()));
        }
        
        setReservations(rows);
        setReservationsTotal(Number(result?.data?.pagination?.total ?? rows.length));
        setReservationsPage(page);
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
        ago = new Date(today);
        ago.setFullYear(today.getFullYear() - 1);
        break;
      default: ago.setDate(today.getDate() - 30);
    }
    
    return ago.toISOString().slice(0,10);
  };

  // Calcular métricas desde datos reales
  const metrics = useMemo(() => {
    const totalEffective = reservations.filter(r => r.status === 'PAID' || r.status === 'COMPLETED').length;
    const cancelled = reservations.filter(r => r.status === 'CANCELLED').length;
    const pending = reservations.filter(r => r.status === 'PENDING').length;
    const totalRevenue = reservations
      .filter(r => r.status === 'PAID' || r.status === 'COMPLETED')
      .reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    
    // Agrupar por deporte
    const sportGroups = reservations.reduce((acc: any, r: any) => {
      const sport = r.courtName || 'Sin especificar';
      acc[sport] = (acc[sport] || 0) + 1;
      return acc;
    }, {});
    
    const topSports = Object.entries(sportGroups)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([sport, count]) => ({
        sport,
        count: count as number,
        percentage: Math.round(((count as number) / reservations.length) * 100)
      }));
    
    return {
      totalEffective,
      cancelled,
      pending,
      totalRevenue,
      topSports,
      occupancyRate: totalEffective > 0 ? Math.round((totalEffective / (totalEffective + cancelled + pending)) * 100) : 0
    };
  }, [reservations]);

  const totalEffective = metrics.totalEffective;
  const cancelled = metrics.cancelled;
  const pending = metrics.pending;
  const totalRevenue = metrics.totalRevenue;
  const occupancyRate = metrics.occupancyRate;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header móvil */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Reporte de Reservas</h1>
            <p className="text-sm text-gray-600">Análisis de ocupación</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowReservationsTable(!showReservationsTable)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <EyeIcon className="w-4 h-4"/>
              {showReservationsTable ? 'Ocultar' : 'Ver'}
            </button>
            <button onClick={()=>exportFile('csv')} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <DocumentTextIcon className="w-4 h-4"/>CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filtros móviles */}
      <div className="px-4 py-3">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(['7d','30d','90d','1y'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-2 rounded-lg text-sm font-semibold ${period===p?'bg-blue-600 text-white':'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
                {p==='7d'?'7 Días':p==='30d'?'30 Días':p==='90d'?'90 Días':'1 Año'}
              </button>
            ))}
          </div>
          <button onClick={() => setPeriod('custom')} className={`w-full px-3 py-2 rounded-lg text-sm font-semibold ${period==='custom'?'bg-blue-600 text-white':'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
            Personalizado
          </button>
          {period==='custom' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <input type="date" value={dateRange.start} onChange={(e)=>setDateRange(r=>({...r,start:e.target.value}))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm"/>
              <input type="date" value={dateRange.end} onChange={(e)=>setDateRange(r=>({...r,end:e.target.value}))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm"/>
            </div>
          )}
        </div>
      </div>

      {/* Métricas principales móviles */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <CheckCircleIcon className="w-6 h-6 text-green-600"/>
              <span className="text-xs text-green-600 font-medium">+{occupancyRate}%</span>
            </div>
            <p className="text-xs text-gray-600 mb-1">Efectivas</p>
            <p className="text-lg font-bold text-gray-900">{totalEffective.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <XCircleIcon className="w-6 h-6 text-red-600"/>
              <span className="text-xs text-red-600 font-medium">{cancelled > 0 ? Math.round((cancelled / (totalEffective + cancelled + pending)) * 100) : 0}%</span>
            </div>
            <p className="text-xs text-gray-600 mb-1">Canceladas</p>
            <p className="text-lg font-bold text-gray-900">{cancelled.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600"/>
              <span className="text-xs text-yellow-600 font-medium">En proceso</span>
            </div>
            <p className="text-xs text-gray-600 mb-1">Pendientes</p>
            <p className="text-lg font-bold text-gray-900">{pending.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600"/>
              <span className="text-xs text-green-600 font-medium">Efectivas</span>
            </div>
            <p className="text-xs text-gray-600 mb-1">Ingresos</p>
            <p className="text-lg font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Calendario de ocupación móvil */}
      <div className="px-4 pb-3">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Calendario de Ocupación</h3>
          <OccupancyCalendar 
            reservations={reservations.map(r => ({
              id: r.id,
              date: r.date,
              startTime: r.startTime,
              endTime: r.endTime,
              courtName: r.courtName,
              status: r.status,
              userName: r.userName
            }))}
            onReservationClick={(reservation) => {
              const fullReservation = reservations.find(r => r.id === reservation.id);
              if (fullReservation) {
                setSelectedReservation(fullReservation);
                setShowReservationModal(true);
              }
            }}
          />
        </div>
      </div>

      {/* Gráficos móviles */}
      <div className="px-4 pb-3 space-y-3">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Por Estado</h3>
          <div className="space-y-2">
            {[
              { status: 'PAID', label: 'Pagadas', count: reservations.filter(r => r.status === 'PAID').length, color: 'bg-green-500' },
              { status: 'COMPLETED', label: 'Completadas', count: reservations.filter(r => r.status === 'COMPLETED').length, color: 'bg-blue-500' },
              { status: 'PENDING', label: 'Pendientes', count: reservations.filter(r => r.status === 'PENDING').length, color: 'bg-yellow-500' },
              { status: 'CANCELLED', label: 'Canceladas', count: reservations.filter(r => r.status === 'CANCELLED').length, color: 'bg-red-500' }
            ].map((item, i) => {
              const total = reservations.length;
              const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.count}</span>
                    <span className="text-xs text-gray-500">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Top Deportes</h3>
          <div className="space-y-2">
            {metrics.topSports.length > 0 ? metrics.topSports.map((item, i) => {
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 truncate">{item.sport}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.count}</span>
                    <span className="text-xs text-gray-500">({item.percentage}%)</span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-gray-500 text-sm text-center py-4">Sin datos</div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de reservas detallada móvil */}
      {showReservationsTable && (
        <div className="px-4 pb-3">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Reservas ({reservationsTotal.toLocaleString()})</h3>
              <button onClick={()=>exportFile('json')} className="flex items-center gap-1 px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-xs">
                <DocumentTextIcon className="w-3 h-3"/>JSON
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
                  onKeyPress={(e) => e.key === 'Enter' && loadReservations(1, e.currentTarget.value, reservationsStatus, reservationsSport)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={reservationsStatus}
                  onChange={(e) => {
                    setReservationsStatus(e.target.value);
                    loadReservations(1, reservationsSearch, e.target.value, reservationsSport);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Todos los estados</option>
                  <option value="PAID">Pagadas</option>
                  <option value="COMPLETED">Completadas</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="CANCELLED">Canceladas</option>
                </select>
                <select
                  value={reservationsSport}
                  onChange={(e) => {
                    setReservationsSport(e.target.value);
                    loadReservations(1, reservationsSearch, reservationsStatus, e.target.value);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Todos los deportes</option>
                  {Array.from(new Set(reservations.map(r => r.courtName))).map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
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
              ) : reservations.length > 0 ? reservations.slice(0, 10).map((reservation: any, i: number) => (
                <div key={reservation.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{reservation.userName}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      reservation.status === 'PAID' ? 'bg-green-100 text-green-800' :
                      reservation.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                      reservation.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
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
                    <div className="flex justify-between font-medium">
                      <span>Monto:</span>
                      <span className="text-gray-900">${Number(reservation.totalAmount).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setSelectedReservation(reservation);
                        setShowReservationModal(true);
                      }}
                      className="w-full text-center text-blue-600 hover:text-blue-800 text-xs font-medium py-1"
                    >
                      Ver detalles completos
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron reservas
                </div>
              )}
              {reservations.length > 10 && (
                <div className="text-center py-2 text-xs text-gray-500">
                  Mostrando 10 de {reservations.length} reservas
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles de reserva */}
      {showReservationModal && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalles de Reserva</h3>
              <button
                onClick={() => setShowReservationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6"/>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Usuario</label>
                  <p className="text-sm text-gray-900">{selectedReservation.userName}</p>
                  <p className="text-xs text-gray-500">{selectedReservation.userEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Cancha</label>
                  <p className="text-sm text-gray-900">{selectedReservation.courtName}</p>
                  <p className="text-xs text-gray-500">{selectedReservation.centerName}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha</label>
                  <p className="text-sm text-gray-900">{selectedReservation.date}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Horario</label>
                  <p className="text-sm text-gray-900">{selectedReservation.startTime} - {selectedReservation.endTime}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Duración</label>
                  <p className="text-sm text-gray-900">{selectedReservation.duration} horas</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Monto</label>
                  <p className="text-sm text-gray-900 font-semibold">${Number(selectedReservation.totalAmount).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Estado</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    selectedReservation.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    selectedReservation.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                    selectedReservation.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedReservation.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Método de Pago</label>
                  <p className="text-sm text-gray-900">{selectedReservation.paymentMethod || 'No especificado'}</p>
                </div>
              </div>
              
              {selectedReservation.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Notas</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedReservation.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-4 right-4 bg-white shadow rounded-lg px-3 py-2 flex items-center gap-2">
          <ClockIcon className="w-5 h-5 animate-spin"/><span className="text-sm">Cargando…</span>
        </div>
      )}
    </div>
  );

  function exportFile(format:'csv'|'json'){
    const payload = {
      period,
      dateRange,
      metrics: {
        totalEffective,
        cancelled,
        pending,
        totalRevenue,
        occupancyRate
      },
      reservations: reservations.map(r => ({
        id: r.id,
        userName: r.userName,
        userEmail: r.userEmail,
        courtName: r.courtName,
        centerName: r.centerName,
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime,
        duration: r.duration,
        totalAmount: r.totalAmount,
        status: r.status,
        paymentMethod: r.paymentMethod
      })),
      generatedAt: new Date().toISOString(),
    };
    
    const filename = `reservations_report_${new Date().toISOString().slice(0,10)}`;
    
    if (format === 'json') {
      exportUtils.downloadJSON(payload, `${filename}.json`);
    } else {
      // Para CSV, crear estructura específica para reservations
      const csvData = [
        ['ID', 'Usuario', 'Email', 'Cancha', 'Centro', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Duración (h)', 'Monto', 'Estado', 'Método Pago'],
        ...reservations.map((r: any) => [
          r.id,
          r.userName,
          r.userEmail,
          r.courtName,
          r.centerName,
          r.date,
          r.startTime,
          r.endTime,
          r.duration,
          r.totalAmount,
          r.status,
          r.paymentMethod || ''
        ])
      ];
      exportUtils.downloadCSV(csvData, `${filename}.csv`);
    }
  }
}




