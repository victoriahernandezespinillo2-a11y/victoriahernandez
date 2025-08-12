"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAdminCourts, useAdminCenters } from '@/lib/hooks';
import { adminApi } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import WeekCalendar from '@/components/WeekCalendar';

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
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1|2|3>(1);
  const [suggestions, setSuggestions] = useState<Array<{ dateISO: string; startISO: string; label: string; price?: number }>>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [confirmOverrideOpen, setConfirmOverrideOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - (day - 1));
    return d.toISOString().split('T')[0];
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

  // Calcular precio cuando cambian cancha/fecha/hora/duración/usuario
  useEffect(() => {
    const calc = async () => {
      try {
        if (!courtId || !date || !time) { setPrice({}); return; }
        const [hour, minute] = time.split(':').map(Number);
        const start = new Date(date + 'T00:00:00');
        start.setHours(hour, minute, 0, 0);
        const result: any = await adminApi.pricing.calculate({ courtId, startTime: start.toISOString(), duration, userId: userId || undefined });
        const p = result?.pricing || result;
        setPrice({ base: p?.basePrice, final: p?.finalPrice, breakdown: p?.breakdown || [] });
      } catch { setPrice({}); }
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
      const maxPct = Number(process.env.NEXT_PUBLIC_MAX_PRICE_OVERRIDE_PERCENT || '20');
      const allowed = Math.abs(amt) <= (baseTotal * maxPct) / 100;
      if (!allowed) return false;
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
      start.setHours(hour, minute, 0, 0);

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
      start.setHours(hour, minute, 0, 0);
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
        const avail2: any = await adminApi.courts.getAvailability(courtId, nextISO).catch(() => null);
        const s2 = avail2?.slots || [];
        await buildSuggestions(nextISO, s2);
        return;
      }
      await buildSuggestions(date, slotsList);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const buildSuggestions = async (dateISO: string, slotsList: Array<{ start: string; end: string; available: boolean }>) => {
    const desiredMinutes = (() => { const [h, m] = time.split(':').map(Number); return h*60+m; })();
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
      <h1 className="text-2xl font-bold">Nueva Reserva (Manual)</h1>
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
          <h2 className="text-lg font-semibold mb-2">1) Usuario</h2>
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
          <h2 className="text-lg font-semibold mb-2">2) Cancha y horario</h2>
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
              <div className="text-gray-500">Selecciona cancha y fecha para ver disponibilidad</div>
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
            <h3 className="text-sm font-medium text-gray-700">Disponibilidad semanal</h3>
            <div className="flex gap-2">
              <button className="px-2 py-1 border rounded" onClick={() => {
                const d = new Date(weekStart + 'T00:00:00');
                d.setDate(d.getDate() - 7);
                setWeekStart(d.toISOString().split('T')[0]);
              }}>◀</button>
              <button className="px-2 py-1 border rounded" onClick={() => {
                const d = new Date(weekStart + 'T00:00:00');
                d.setDate(d.getDate() + 7);
                setWeekStart(d.toISOString().split('T')[0]);
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
          <label className="block text-sm text-gray-700 mb-1">Notas</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} />
        </div>

        {/* Resumen de precio */}
        <div className="md:col-span-2 bg-white border rounded p-4">
          <h3 className="font-semibold mb-2">Resumen de precio</h3>
          {price?.final !== undefined ? (
            <div>
              <div className="text-sm text-gray-600 mb-1">Base: €{(price.base || price.basePrice || 0).toFixed(2)}</div>
              <ul className="text-xs text-gray-500 mb-2 list-disc pl-5">
                {(price.breakdown || []).map((b, i) => (
                  <li key={i}>{b.description}: €{(b.amount || 0).toFixed(2)}</li>
                ))}
              </ul>
              {typeof (price as any).taxRate === 'number' && (
                <div className="text-sm text-gray-600">Impuestos ({(price as any).taxRate}%): €{Number((price as any).taxAmount || 0).toFixed(2)}</div>
              )}
              <div className="text-lg font-bold">Total: €{(price.final || 0).toFixed(2)}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Selecciona cancha, fecha y hora para calcular el precio</div>
          )}
        </div>

        {/* Paso 3: Pago */}
        <div className="md:col-span-2 mt-2">
          <h2 className="text-lg font-semibold mb-2">3) Pago</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Método</label>
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
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={overrideEnabled} onChange={(e) => setOverrideEnabled(e.target.checked)} />
                  Aplicar ajuste de precio (override)
                </label>
                {overrideEnabled && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Ajuste (€ +/‑)</label>
                      <input type="number" step="0.01" value={overrideAmount} onChange={(e) => setOverrideAmount(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Ej: -5.00" />
                      <p className="text-xs text-gray-500 mt-1">Límite: ±{Number(process.env.NEXT_PUBLIC_MAX_PRICE_OVERRIDE_PERCENT || '20')}% del total</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-700 mb-1">Motivo (requerido)</label>
                      <input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Ej: Descuento fidelidad" />
                    </div>
                    {(() => {
                      const baseTotal = Number(price?.final || 0);
                      const amt = Number(overrideAmount || '0');
                      const maxPct = Number(process.env.NEXT_PUBLIC_MAX_PRICE_OVERRIDE_PERCENT || '20');
                      const allowed = Number.isFinite(amt) && Math.abs(amt) <= (baseTotal * maxPct) / 100;
                      const newTotal = baseTotal + (Number.isFinite(amt) ? amt : 0);
                      return (
                        <div className="md:col-span-3 text-xs mt-1">
                          <span className={`font-medium ${allowed ? 'text-emerald-700' : 'text-red-700'}`}>
                            Nuevo total estimado: €{newTotal.toFixed(2)} {allowed ? '' : '(excede el límite permitido)'}
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
        <button onClick={() => (window.location.href = '/reservations')} className="px-4 py-2 border rounded">Cancelar</button>
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

      <ConfirmDialog
        open={confirmOverrideOpen}
        title="Confirmar ajuste de precio"
        description={(() => {
          const baseTotal = Number(price?.final || 0);
          const amt = Number(overrideAmount || '0');
          const newTotal = baseTotal + (Number.isFinite(amt) ? amt : 0);
          return (
            <div className="text-sm">
              <p>Se aplicará un ajuste de €{(Number.isFinite(amt) ? amt : 0).toFixed(2)} con motivo:</p>
              <p className="mt-1 italic">“{overrideReason}”</p>
              <p className="mt-2">Total anterior: €{baseTotal.toFixed(2)} → Nuevo total: €{newTotal.toFixed(2)}</p>
            </div>
          ) as any;
        })()}
        confirmText="Confirmar y crear"
        variant="warning"
        onConfirm={confirmCreateWithOverride}
        onCancel={() => setConfirmOverrideOpen(false)}
      />
    </div>
  );
}


