"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAdminCourts, useAdminCenters } from '@/lib/hooks';
import { adminApi } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import WeekCalendar from '@/components/WeekCalendar';
import { MAX_OVERRIDE_PERCENT, validatePriceOverride } from '@/lib/constants';

export default function AdminNewReservationPage() {
  const { data: session } = useSession();
  const { courts, getCourts } = useAdminCourts();
  const { centers, getCenters } = useAdminCenters();
  const [centerId, setCenterId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slots, setSlots] = useState<Array<{ start: string; end: string; available: boolean }>>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTimer, setSearchTimer] = useState<any>(null);
  const [newUser, setNewUser] = useState<{ name: string; email?: string; phone?: string }>({ name: '' });
  const [paymentMethod, setPaymentMethod] = useState<'CASH'|'TPV'|'TRANSFER'|'CREDITS'|'COURTESY'|'LINK'>('CASH');
  const [paymentDetails, setPaymentDetails] = useState<{ amount?: string; reason?: string; authCode?: string; reference?: string }>(() => ({}));
  const [price, setPrice] = useState<{ base?: number; final?: number; breakdown?: { description: string; amount: number }[] }>({});
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const { showToast} = useToast();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1|2|3>(1);
  const [suggestions, setSuggestions] = useState<Array<{ dateISO: string; startISO: string; label: string; price?: number }>>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [confirmOverrideOpen, setConfirmOverrideOpen] = useState(false);
  const [weekStart, setWeekStart] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - (day - 1));
    const s = d.toISOString().split('T')[0] || '';
    return s;
  });

  useEffect(() => {
    getCenters({ page: 1, limit: 100 }).catch(() => {});
    getCourts({ includeStats: false, page: 1, limit: 500 }).catch(() => {});
  }, [getCenters, getCourts]);

  const filteredCourts = useMemo(() => {
    const list = Array.isArray(courts) ? courts : [];
    return centerId ? list.filter((c: any) => c.centerId === centerId) : list;
  }, [courts, centerId]);

  // Cargar slots de disponibilidad al seleccionar cancha/fecha
  useEffect(() => {
    const loadAvailability = async () => {
      try {
        if (!courtId || !date) { setSlots([]); return; }
        const avail = await adminApi.courts.getAvailability(courtId, date) as any;
        const mapped = (avail?.slots || []).map((s: any) => ({ start: new Date(s.start).toISOString(), end: new Date(s.end).toISOString(), available: s.available }));
        setSlots(mapped);
      } catch {
        setSlots([]);
      }
    };
    loadAvailability();
  }, [courtId, date]);

  // Sincronizar weekStart con la fecha seleccionada
  // Cuando el usuario cambia la fecha, el calendario semanal debe mostrar la semana que contiene esa fecha
  useEffect(() => {
    if (!date) return;
    
    try {
      // Parsear la fecha seleccionada
      const selectedDate = new Date(date + 'T00:00:00');
      
      // Validar que la fecha sea válida
      if (isNaN(selectedDate.getTime())) {
        console.warn('[WEEK_SYNC] Fecha inválida:', date);
        return;
      }
      
      // Calcular el lunes de la semana que contiene la fecha seleccionada
      // getDay() retorna 0 (domingo) a 6 (sábado)
      // Convertimos domingo (0) a 7 para facilitar el cálculo
      const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();
      
      // Calcular cuántos días retroceder para llegar al lunes (día 1)
      const daysToMonday = dayOfWeek - 1;
      
      // Crear nueva fecha para el lunes de esa semana
      const mondayDate = new Date(selectedDate);
      mondayDate.setDate(selectedDate.getDate() - daysToMonday);
      
      // Convertir a formato ISO (YYYY-MM-DD)
      const newWeekStart = mondayDate.toISOString().split('T')[0] || '';
      
      // Solo actualizar si el weekStart cambió (evitar re-renders innecesarios)
      if (newWeekStart !== weekStart) {
        console.log('[WEEK_SYNC] Sincronizando calendario semanal:', {
          fechaSeleccionada: date,
          diaSeleccionado: selectedDate.toLocaleDateString('es-ES', { weekday: 'long' }),
          nuevoLunes: newWeekStart,
          anteriorLunes: weekStart
        });
        setWeekStart(newWeekStart);
      }
    } catch (error) {
      console.error('[WEEK_SYNC] Error sincronizando weekStart:', error);
      // En caso de error, no actualizar weekStart para mantener estabilidad
    }
  }, [date, weekStart]);

  // Sincronizar selección con calendario semanal
  useEffect(() => {
    if (date && time) {
      // Normalizar hora para comparación
      let normalizedTime = time.trim();
      const time12hMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)/i);
      if (time12hMatch && time12hMatch[1] && time12hMatch[2] && time12hMatch[3]) {
        let hour = parseInt(time12hMatch[1], 10);
        const minute = parseInt(time12hMatch[2], 10);
        const period = time12hMatch[3].toLowerCase().replace(/\./g, '');
        if (period === 'pm' && hour !== 12) hour += 12;
        else if (period === 'am' && hour === 12) hour = 0;
        normalizedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
      
      // Disparar evento para sincronizar con WeekCalendar
      window.dispatchEvent(new CustomEvent('admin-reservation-slot', {
        detail: { type: 'SELECT_SLOT', dateISO: date, timeLabel: normalizedTime }
      }));
    }
  }, [date, time]);

  // Calcular precio cuando cambian cancha/fecha/hora/duración/usuario
  useEffect(() => {
    const calc = async () => {
      try {
        // Validación de campos requeridos
        if (!courtId || !date || !time) { 
          console.log('[PRICE_CALC] Campos faltantes:', { courtId: !!courtId, date: !!date, time: !!time });
          setPrice({});
          setPriceError(null);
          return; 
        }

        // Iniciar carga
        setPriceLoading(true);
        setPriceError(null);

        // Normalizar formato de hora (soportar tanto 12h como 24h)
        let normalizedTime = time.trim();
        
        // Detectar y convertir formato 12 horas (10:30 a.m. / 10:30 p.m.)
        const time12hMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)/i);
        if (time12hMatch && time12hMatch[1] && time12hMatch[2] && time12hMatch[3]) {
          let hour = parseInt(time12hMatch[1], 10);
          const minute = parseInt(time12hMatch[2], 10);
          const period = time12hMatch[3].toLowerCase().replace(/\./g, '');
          
          // Convertir a formato 24 horas
          if (period === 'pm' && hour !== 12) {
            hour += 12;
          } else if (period === 'am' && hour === 12) {
            hour = 0;
          }
          
          normalizedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          console.log('[PRICE_CALC] Hora convertida de 12h a 24h:', { original: time, normalized: normalizedTime });
        }

        // Parsear hora en formato 24h
        const timeParts = normalizedTime.split(':');
        if (timeParts.length !== 2 || !timeParts[0] || !timeParts[1]) {
          const errorMsg = 'Formato de hora inválido. Use HH:MM';
          console.error('[PRICE_CALC]', errorMsg, time);
          setPriceError(errorMsg);
          setPrice({});
          setPriceLoading(false);
          return;
        }

        const hour = parseInt(timeParts[0], 10);
        const minute = parseInt(timeParts[1], 10);

        // Validar que sean números válidos
        if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
          const errorMsg = 'Hora fuera de rango válido (00:00 - 23:59)';
          console.error('[PRICE_CALC]', errorMsg, { hour, minute, original: time });
          setPriceError(errorMsg);
          setPrice({});
          setPriceLoading(false);
          return;
        }

        // Construir fecha y hora en formato ISO
        const start = new Date(date + 'T00:00:00');
        start.setHours(hour, minute, 0, 0);

        // Validar que la fecha sea válida
        if (isNaN(start.getTime())) {
          const errorMsg = 'Fecha u hora inválida';
          console.error('[PRICE_CALC]', errorMsg, { date, time: normalizedTime });
          setPriceError(errorMsg);
          setPrice({});
          setPriceLoading(false);
          return;
        }

        console.log('[PRICE_CALC] Calculando precio:', {
          courtId,
          date,
          time: normalizedTime,
          startTime: start.toISOString(),
          duration,
          userId: userId || 'sin usuario'
        });

        // Llamar a la API de pricing
        const result: any = await adminApi.pricing.calculate({ 
          courtId, 
          startTime: start.toISOString(), 
          duration, 
          userId: userId || undefined 
        });

        console.log('[PRICE_CALC] Respuesta de API:', result);

        // Extraer datos de pricing (puede venir en diferentes formatos)
        const p = result?.pricing || result;
        
        if (!p || (p.finalPrice === undefined && p.total === undefined && p.totalPrice === undefined)) {
          const errorMsg = 'No se pudo calcular el precio. Verifique la configuración de precios.';
          console.warn('[PRICE_CALC] Respuesta sin precio válido:', result);
          setPriceError(errorMsg);
          setPrice({});
          setPriceLoading(false);
          return;
        }

        // Normalizar estructura de precio
        const finalPrice = p.finalPrice ?? p.total ?? p.totalPrice ?? 0;
        const basePrice = p.basePrice ?? p.base ?? finalPrice;
        const breakdown = p.breakdown || [];

        setPrice({ 
          base: basePrice, 
          final: finalPrice, 
          breakdown 
        });

        setPriceError(null);
        setPriceLoading(false);
        console.log('[PRICE_CALC] Precio calculado exitosamente:', { base: basePrice, final: finalPrice });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error al calcular el precio';
        console.error('[PRICE_CALC] Error calculando precio:', error);
        setPriceError(errorMsg);
        setPrice({});
        setPriceLoading(false);
      }
    };
    calc();
  }, [courtId, date, time, duration, userId]);

  // Debounced user search
  useEffect(() => {
    if (!userSearch || userId) { setUserResults([]); return; }
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res: any = await adminApi.users.getAll({ search: userSearch, limit: 8 });
        setUserResults(Array.isArray(res) ? res : []);
      } catch {
        setUserResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    setSearchTimer(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch]);

  const canProceedUser = () => !!(userId || (newUser.name && (newUser.email || newUser.phone)));
  const canProceedSchedule = () => !!(courtId && date && time && duration);
  const canProceedPayment = () => {
    if (paymentMethod === 'COURTESY') return !!(paymentDetails.reason || '').trim();
    if (overrideEnabled) {
      const amt = Number(overrideAmount);
      if (!Number.isFinite(amt)) return false;
      if ((overrideReason || '').trim().length < 5) return false;
      const baseTotal = Number(price?.final || 0);
      // Usar validación centralizada y robusta
      const validation = validatePriceOverride(amt, baseTotal);
      if (!validation.isValid) return false;
    }
    return true;
  };

  const handleCreate = async () => {
    try {
      setError(null);
      if (!canProceedUser()) { setStep(1); setError('Selecciona un usuario o ingresa los datos mínimos'); return; }
      if (!canProceedSchedule()) { setStep(2); setError('Selecciona cancha, fecha y hora'); return; }
      if (!canProceedPayment()) { setStep(3); setError('Completa los datos del método de pago y/o override'); return; }

      if (overrideEnabled) { setConfirmOverrideOpen(true); return; }
      const [hour, minute] = time.split(':').map(Number);
      const start = new Date(date + 'T00:00:00');
      start.setHours(hour || 0, minute || 0, 0, 0);

      setIsSubmitting(true);
      const res = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId || undefined,
          newUser: userId ? undefined : newUser,
          courtId,
          startTime: start.toISOString(),
          duration,
          notes,
              payment: {
                method: paymentMethod,
                amount: price?.final,
                reason: paymentDetails.reason,
                details: {
                  authCode: paymentDetails.authCode,
                  reference: paymentDetails.reference,
                }
              },
          sendNotifications: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (Array.isArray(body?.details) && body.details.length > 0) {
          const first = body.details[0];
          throw new Error(`${body.error}: ${first.field} - ${first.message}`);
        }
        if (body?.stack) {
          throw new Error(`${body?.error}`);
        }
        if (res.status === 409) {
          // Generar sugerencias de horarios alternativos
          generateSuggestions().catch(() => {});
          throw new Error(body?.error || 'Conflicto de disponibilidad. Te sugerimos horarios alternativos.');
        }
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      showToast({ variant: 'success', title: 'Reserva creada', message: 'La reserva se registró correctamente.' });
      window.location.href = '/reservations';
    } catch (e: any) {
      setError(e?.message || 'Error creando la reserva');
      showToast({ variant: 'error', title: 'No se pudo crear', message: e?.message || 'Error creando la reserva' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmCreateWithOverride = async () => {
    setConfirmOverrideOpen(false);
    try {
      setIsSubmitting(true);
      const [hour, minute] = time.split(':').map(Number);
      const start = new Date(date + 'T00:00:00');
      start.setHours(hour || 0, minute || 0, 0, 0);
      const res = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId || undefined,
          newUser: userId ? undefined : newUser,
          courtId,
          startTime: start.toISOString(),
          duration,
          notes,
          payment: { method: paymentMethod, amount: price?.final, reason: paymentDetails.reason, details: { authCode: paymentDetails.authCode, reference: paymentDetails.reference } },
          pricingOverride: { amount: Number(overrideAmount), reason: overrideReason },
          sendNotifications: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          generateSuggestions().catch(() => {});
          throw new Error(body?.error || 'Conflicto de disponibilidad. Te sugerimos horarios alternativos.');
        }
        if (Array.isArray(body?.details) && body.details.length > 0) {
          const first = body.details[0];
          throw new Error(`${body.error}: ${first.field} - ${first.message}`);
        }
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      showToast({ variant: 'success', title: 'Reserva creada', message: 'La reserva se registró correctamente.' });
      window.location.href = '/reservations';
    } catch (e: any) {
      setError(e?.message || 'Error creando la reserva');
      showToast({ variant: 'error', title: 'No se pudo crear', message: e?.message || 'Error creando la reserva' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sugerencias de horarios alternativos cercanos a la hora elegida
  const generateSuggestions = async () => {
    try {
      if (!courtId || !date || !time) return;
      setSuggestionsLoading(true);
      setSuggestions([]);
      const avail: any = await adminApi.courts.getAvailability(courtId, date);
      const slotsList: Array<{ start: string; end: string; available: boolean }> = avail?.slots || [];
      if (!Array.isArray(slotsList) || slotsList.length === 0) {
        // Intentar también siguiente día
        const nextDate = new Date(date + 'T00:00:00'); nextDate.setDate(nextDate.getDate() + 1);
        const nextISO = nextDate.toISOString().split('T')[0];
        const avail2: any = await adminApi.courts.getAvailability(courtId as string, nextISO as string).catch(() => null);
        const s2 = avail2?.slots || [];
        await buildSuggestions(nextISO as string, s2);
        return;
      }
      await buildSuggestions(date as string, slotsList);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const buildSuggestions = async (dateISO: string, slotsList: Array<{ start: string; end: string; available: boolean }>) => {
    const desiredMinutes = (() => {
      const [h, m] = (time || '00:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    })();
    const availableStarts = slotsList.filter(s => s.available).map(s => new Date(s.start));
    // Ordenar por cercanía a la hora deseada (misma fecha)
    const sorted = availableStarts.sort((a, b) => {
      const ma = a.getHours()*60 + a.getMinutes();
      const mb = b.getHours()*60 + b.getMinutes();
      return Math.abs(ma - desiredMinutes) - Math.abs(mb - desiredMinutes);
    }).slice(0, 8);
    const out: Array<{ dateISO: string; startISO: string; label: string; price?: number }> = [];
    for (const d of sorted) {
      const label = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const startISO = new Date(dateISO + 'T00:00:00');
      startISO.setHours(d.getHours(), d.getMinutes(), 0, 0);
      let priceNum: number | undefined = undefined;
      try {
        const p: any = await adminApi.pricing.calculate({ courtId, startTime: startISO.toISOString(), duration, userId: userId || undefined });
        const pc = p?.pricing || p;
        priceNum = Number(pc?.total || pc?.finalPrice || pc?.totalPrice || 0);
      } catch {}
      out.push({ dateISO, startISO: startISO.toISOString(), label, price: priceNum });
    }
    setSuggestions(out);
  };

  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-black">Nueva Reserva (Manual)</h1>
      <div className="flex items-center gap-3 text-xs">
        <span className={`px-2 py-1 rounded ${step>=1?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}>1 Usuario</span>
        <span className={`px-2 py-1 rounded ${step>=2?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}>2 Cancha</span>
        <span className={`px-2 py-1 rounded ${step>=3?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}>3 Pago</span>
      </div>
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded">{error}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {/* Paso 1: Usuario */}
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold mb-2 text-black">1) Usuario</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <label className="block text-sm text-gray-700 mb-1">Buscar usuario (email/teléfono)</label>
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Buscar..." className="w-full border rounded px-3 py-2" />
              {userSearch && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-56 overflow-auto">
                  {searchLoading && <div className="px-3 py-2 text-xs text-gray-500">Buscando...</div>}
                  {!searchLoading && userResults.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500">Sin resultados</div>
                  )}
                  {userResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setUserId(u.id);
                        setNewUser({ name: '' });
                        setUserSearch(`${u.firstName || ''} ${u.lastName || ''} - ${u.email}`.trim());
                        setUserResults([]);
                        showToast({ variant: 'info', message: `Seleccionado: ${u.email || u.firstName}` });
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      <div className="font-medium">{u.firstName || u.name || u.email}</div>
                      <div className="text-xs text-gray-500">{u.email} {u.phone ? `• ${u.phone}` : ''}</div>
                    </button>
                  ))}
                </div>
              )}
              {userId && <p className="text-xs text-green-700 mt-1">Usuario seleccionado</p>}
            </div>
            <div onFocus={() => setUserId('')}>
              <label className="block text-sm text-gray-700 mb-1">Nombre (nuevo usuario)</label>
              <input value={newUser.name} onChange={(e) => setNewUser((s) => ({ ...s, name: e.target.value }))} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email (opcional)</label>
              <input value={newUser.email || ''} onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Teléfono (opcional)</label>
              <input value={newUser.phone || ''} onChange={(e) => setNewUser((s) => ({ ...s, phone: e.target.value }))} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Si seleccionas un usuario, los campos de “nuevo usuario” serán ignorados.</p>
        </div>

        {/* Paso 2: Cancha y horario */}
        <div className="md:col-span-2 mt-2">
          <h2 className="text-lg font-semibold mb-2 text-black">2) Cancha y horario</h2>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Centro</label>
          <select value={centerId} onChange={(e) => setCenterId(e.target.value)} className="w-full border rounded px-3 py-2">
            <option value="">Todos</option>
            {(Array.isArray(centers) ? centers : []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Cancha</label>
          <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className="w-full border rounded px-3 py-2">
            <option value="">Selecciona</option>
            {filteredCourts.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Fecha</label>
          <input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Hora</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border rounded px-3 py-2" />
          <div className="mt-2 max-h-40 overflow-y-auto text-xs border rounded p-2 bg-gray-50">
            <div className="font-medium mb-1">Disponibilidad del día</div>
            {slots.length === 0 ? (
              <div className="text-black">Selecciona cancha y fecha para ver disponibilidad</div>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {slots.map((s, idx) => {
                  const label = new Date(s.start).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
                  const selected = time && label === time;
                  return (
                    <button
                      type="button"
                      key={idx}
                      disabled={!s.available}
                      onClick={() => setTime(label)}
                      className={`px-2 py-1 rounded border text-left ${
                        !s.available
                          ? 'bg-red-100 text-red-700 border-red-200 cursor-not-allowed'
                          : selected
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Calendario semanal */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-black">Disponibilidad semanal</h3>
            <div className="flex gap-2">
              <button className="px-2 py-1 border rounded text-black" onClick={() => {
                const d = new Date(weekStart + 'T00:00:00');
                d.setDate(d.getDate() - 7);
                const s = d.toISOString().split('T')[0] || '';
                setWeekStart(s);
              }}>◀</button>
              <button className="px-2 py-1 border rounded text-black" onClick={() => {
                const d = new Date(weekStart + 'T00:00:00');
                d.setDate(d.getDate() + 7);
                const s = d.toISOString().split('T')[0] || '';
                setWeekStart(s);
              }}>▶</button>
            </div>
          </div>
          <WeekCalendar
            courtId={courtId}
            weekStartISO={weekStart}
            durationMinutes={duration}
            onSelect={(dateISO, hhmm) => {
              setDate(dateISO);
              setTime(hhmm);
            }}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Duración</label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full border rounded px-3 py-2">
            <option value={60}>1 hora</option>
            <option value={90}>1.5 horas</option>
            <option value={120}>2 horas</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-black mb-1">Notas</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} />
        </div>

        {/* Resumen de precio */}
        <div className="md:col-span-2 bg-white border rounded p-4">
          <h3 className="font-semibold mb-2 text-black">Resumen de precio</h3>
          
          {/* Estado de carga */}
          {priceLoading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculando precio...
            </div>
          )}
          
          {/* Error en el cálculo */}
          {!priceLoading && priceError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              <strong>Error:</strong> {priceError}
            </div>
          )}
          
          {/* Precio calculado exitosamente */}
          {!priceLoading && !priceError && price?.final !== undefined ? (
            <div>
              <div className="text-sm text-gray-600 mb-1">Base: €{(price.base ?? 0).toFixed(2)}</div>
              <ul className="text-xs text-gray-500 mb-2 list-disc pl-5">
                {(price.breakdown || []).map((b, i) => (
                  <li key={i}>{b.description}: €{(b.amount || 0).toFixed(2)}</li>
                ))}
              </ul>
              {/* Mostrar nota sobre iluminación nocturna si aplica */}
              {price.breakdown?.some((b: any) => b.description?.includes('Iluminación nocturna')) && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-2">
                  💡 La iluminación nocturna se cobra automáticamente
                </div>
              )}
              {typeof (price as any).taxRate === 'number' && (
                <div className="text-sm text-gray-600">Impuestos ({(price as any).taxRate}%): €{Number((price as any).taxAmount || 0).toFixed(2)}</div>
              )}
              <div className="text-lg font-bold text-green-700">Total: €{(price.final || 0).toFixed(2)}</div>
            </div>
          ) : !priceLoading && !priceError && (
            <div className="text-sm text-gray-500">
              <p>Selecciona cancha, fecha y hora para calcular el precio</p>
              <ul className="text-xs mt-2 space-y-1">
                <li className={courtId ? 'text-green-600' : 'text-gray-400'}>
                  {courtId ? '✓' : '○'} Cancha seleccionada
                </li>
                <li className={date ? 'text-green-600' : 'text-gray-400'}>
                  {date ? '✓' : '○'} Fecha seleccionada
                </li>
                <li className={time ? 'text-green-600' : 'text-gray-400'}>
                  {time ? '✓' : '○'} Hora seleccionada
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Paso 3: Pago */}
        <div className="md:col-span-2 mt-2">
          <h2 className="text-lg font-semibold mb-2 text-black">3) Pago</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-black mb-1">Método</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full border rounded px-3 py-2">
                <option value="CASH">Efectivo</option>
                <option value="TPV">Tarjeta (TPV)</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CREDITS">Créditos</option>
                <option value="COURTESY">Cortesía</option>
                <option value="LINK">Enlace de pago</option>
              </select>
            </div>
            {/* Subformularios por método */}
            {paymentMethod === 'TPV' && (
              <div>
                <label className="block text-sm text-gray-700 mb-1">Código de autorización (TPV)</label>
                <input value={paymentDetails.authCode || ''} onChange={(e) => setPaymentDetails({ ...paymentDetails, authCode: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
            )}
            {paymentMethod === 'TRANSFER' && (
              <div>
                <label className="block text-sm text-gray-700 mb-1">Referencia de transferencia</label>
                <input value={paymentDetails.reference || ''} onChange={(e) => setPaymentDetails({ ...paymentDetails, reference: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
            )}
            {paymentMethod === 'COURTESY' && (
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1">Motivo de cortesía (requerido)</label>
                <input value={paymentDetails.reason || ''} onChange={(e) => setPaymentDetails({ ...paymentDetails, reason: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
            )}
            {paymentMethod === 'CREDITS' && (
              <div className="md:col-span-2 text-xs text-gray-600">
                Se descontarán créditos del usuario equivalentes a €{(price?.final || 0).toFixed(2)} según la configuración del centro.
              </div>
            )}
            {paymentMethod === 'LINK' && (
              <div className="md:col-span-2 text-xs text-gray-600">
                Se generará un enlace de pago (Stripe Checkout) para enviar al cliente.
              </div>
            )}
            {/* Override de precio (solo ADMIN) */}
            {((session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'SUPER_ADMIN') && (
              <div className="md:col-span-3 mt-4 border rounded p-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-black">
                  <input type="checkbox" checked={overrideEnabled} onChange={(e) => setOverrideEnabled(e.target.checked)} />
                  Aplicar ajuste de precio (override)
                </label>
                {overrideEnabled && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Ajuste (€ +/‑)</label>
                      <input type="number" step="0.01" value={overrideAmount} onChange={(e) => setOverrideAmount(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Ej: -5.00" />
                      <p className="text-xs text-gray-500 mt-1">Límite: ±{MAX_OVERRIDE_PERCENT}% del total</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-700 mb-1">Motivo (requerido)</label>
                      <input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Ej: Descuento fidelidad" />
                    </div>
                    {(() => {
                      const baseTotal = Number(price?.final || 0);
                      const amt = Number(overrideAmount || '0');
                      const validation = validatePriceOverride(amt, baseTotal);
                      const newTotal = baseTotal + (Number.isFinite(amt) ? amt : 0);
                      return (
                        <div className="md:col-span-3 text-xs mt-1">
                          <span className={`font-medium ${validation.isValid ? 'text-emerald-700' : 'text-red-700'}`}>
                            Nuevo total estimado: €{newTotal.toFixed(2)} {validation.isValid ? '' : `(${validation.error})`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Sugerencias tras conflicto */}
      {(error?.includes('Conflicto') || suggestions.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-amber-900">Sugerencias de horarios alternativos</h3>
            {suggestionsLoading && <span className="text-xs text-amber-700">Calculando...</span>}
          </div>
          {suggestions.length === 0 ? (
            <p className="text-sm text-amber-800 mt-1">No encontramos alternativas inmediatas. Prueba cambiando de fecha o duración.</p>
          ) : (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  className="text-left border rounded p-2 hover:bg-amber-100"
                  onClick={() => {
                    setDate(s.dateISO);
                    const d = new Date(s.startISO);
                    const label = d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
                    setTime(label);
                    setSuggestions([]);
                    setError(null);
                  }}
                >
                  <div className="font-medium">{s.dateISO}</div>
                  <div className="text-sm text-gray-700">{s.label}</div>
                  {typeof s.price === 'number' && <div className="text-xs text-gray-500">€{s.price?.toFixed(2)}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2 items-center">
        <button onClick={() => (window.location.href = '/reservations')} className="px-4 py-2 border rounded text-black">Cancelar</button>
        {step < 3 && (
          <button
            onClick={() => setStep((s) => (s===1 ? (canProceedUser()?2:1) : (canProceedSchedule()?3:2)))}
            className="px-4 py-2 bg-gray-800 text-white rounded"
          >
            Siguiente
          </button>
        )}
        {step === 3 && (
          <button onClick={handleCreate} disabled={isSubmitting || !canProceedUser() || !canProceedSchedule() || !canProceedPayment()} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {isSubmitting ? 'Creando...' : 'Crear Reserva'}
          </button>
        )}
      </div>

      {confirmOverrideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar ajuste de precio</h3>
            <div className="text-sm text-gray-600 mb-6">
              <p>Se aplicará un ajuste de €{(Number.isFinite(Number(overrideAmount)) ? Number(overrideAmount) : 0).toFixed(2)} con motivo:</p>
              <p className="mt-1 italic">"{overrideReason}"</p>
              <p className="mt-2">Total anterior: €{(Number(price?.final || 0)).toFixed(2)} → Nuevo total: €{(Number(price?.final || 0) + (Number.isFinite(Number(overrideAmount)) ? Number(overrideAmount) : 0)).toFixed(2)}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmOverrideOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmCreateWithOverride}
                className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700"
              >
                Confirmar y crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


