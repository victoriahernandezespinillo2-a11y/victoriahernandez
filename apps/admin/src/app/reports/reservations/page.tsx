'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminReports } from '@/lib/hooks';
import { CalendarDaysIcon, UserGroupIcon, DocumentTextIcon, BoltIcon } from '@heroicons/react/24/outline';

export default function ReservationsReportPage() {
  const { getUsageReport } = useAdminReports();
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
        const res = await getUsageReport(params);
        if (!active) return; setData(res as any);
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [getUsageReport, params]);

  const totalEffective = Number(data?.summary?.totalReservations || 0);
  const cancelled = (Array.isArray(data?.byStatus)? data.byStatus.find((s:any)=>s.status==='CANCELLED')?._count?.id || 0 : 0) as number;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte de Reservas</h1>
          <p className="text-gray-600">Estadísticas de reservas y ocupación</p>
        </div>
        <div className="flex gap-3">
          <button onClick={()=>exportFile('csv')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><DocumentTextIcon className="w-4 h-4"/>Exportar CSV</button>
          <button onClick={()=>exportFile('json')} className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50"><DocumentTextIcon className="w-4 h-4"/>Exportar JSON</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-wrap gap-3 items-center">
          {(['7d','30d','90d','1y'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${period===p?'bg-blue-600 text-white':'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>{p==='7d'?'7 Días':p==='30d'?'30 Días':p==='90d'?'90 Días':'1 Año'}</button>
          ))}
          <button onClick={() => setPeriod('custom')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${period==='custom'?'bg-blue-600 text-white':'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>Personalizado</button>
          {period==='custom' && (
            <div className="flex items-center gap-3 ml-auto">
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
              <p className="text-sm text-gray-600">Reservas Efectivas</p>
              <p className="text-2xl font-bold text-gray-900">{totalEffective.toLocaleString()}</p>
            </div>
            <CalendarDaysIcon className="w-8 h-8 text-blue-600"/>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Canceladas</p>
              <p className="text-2xl font-bold text-gray-900">{Number(cancelled).toLocaleString()}</p>
            </div>
            <BoltIcon className="w-8 h-8 text-red-600"/>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Deportes (Top)</p>
              <p className="text-2xl font-bold text-gray-900">{Array.isArray(data?.bySport)?data.bySport.length:0}</p>
            </div>
            <UserGroupIcon className="w-8 h-8 text-purple-600"/>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Estado</h3>
          <div className="space-y-2">
            {Array.isArray(data?.byStatus)&&data.byStatus.length>0?data.byStatus.map((s:any,i:number)=>{
              const count = Number(s?._count?.id||0);
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-800">{s?.status}</span>
                  <span className="font-medium text-gray-900">{count.toLocaleString()}</span>
                </div>
              );
            }):(<div className="text-gray-500">Sin datos</div>)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Deporte/Cancha</h3>
          <div className="space-y-2">
            {Array.isArray(data?.bySport)&&data.bySport.length>0?data.bySport.map((c:any,i:number)=>{
              const count = Number(c?.count||c?._count?.id||0);
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-800">{c?.sportType || c?.court}</span>
                  <span className="font-medium text-gray-900">{count.toLocaleString()}</span>
                </div>
              );
            }):(<div className="text-gray-500">Sin datos</div>)}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle (resumen por estado)</h3>
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-right">Reservas</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(data?.byStatus)&&data.byStatus.length>0?data.byStatus.map((s:any,i:number)=>{
                const count = Number(s?._count?.id||0);
                return (
                  <tr key={i} className={i%2?'bg-white':'bg-gray-50'}>
                    <td className="px-4 py-2 text-gray-800">{s?.status}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">{count.toLocaleString()}</td>
                  </tr>
                );
              }):(<tr><td colSpan={2} className="px-4 py-4 text-center text-gray-500">Sin datos</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  function exportFile(format:'csv'|'json'){
    const payload = {
      period,
      dateRange,
      usageData: {
        summary: data?.summary||{},
        byStatus: Array.isArray(data?.byStatus)?data.byStatus:[],
        bySport: Array.isArray(data?.bySport)?data.bySport:[],
      },
      generatedAt: new Date().toISOString(),
    };
    if (format==='json'){
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`reservations_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); return;
    }
    const esc=(v:any)=>`"${String(v??'').replace(/"/g,'""')}"`;
    const lines:string[]=[];
    lines.push(['Sección','Label','Valor','Período','Inicio','Fin'].map(esc).join(','));
    lines.push(['Resumen','Reservas efectivas',payload.usageData.summary.totalReservations||0,period,dateRange.start,dateRange.end].map(esc).join(','));
    lines.push(['','','','','',''].map(esc).join(','));
    lines.push(['Por estado','Estado','Reservas','','',''].map(esc).join(','));
    (payload.usageData.byStatus||[]).forEach((s:any)=>{ lines.push(['Por estado',s?.status,(s?._count?.id||0)].map(esc).join(',')); });
    lines.push(['','','','','',''].map(esc).join(','));
    lines.push(['Por deporte/cancha','Label','Reservas','','',''].map(esc).join(','));
    (payload.usageData.bySport||[]).forEach((c:any)=>{ lines.push(['Por deporte/cancha', (c?.sportType||c?.court), (c?.count||c?._count?.id||0)].map(esc).join(',')); });
    const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`reservations_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }
}


