'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MapPinIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAdminCenters } from '@/lib/hooks';
import { adminApi } from '@/lib/api';
import ScheduleEditor from '@/components/schedule/ScheduleEditor';

// Usar la interfaz del hook en lugar de duplicar




const statusColors = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800'
};
// Helper: normaliza '08:00 a.m.' | '10:00 p.m.' | '8:00 PM' -> 'HH:mm'
function normalizeToHHmm(input: string | undefined): string | undefined {
  if (!input) return undefined;
  let s = String(input).trim().toLowerCase();
  s = s.replace(/\s+/g, '');
  s = s.replace(/a\.?m\.?/, 'am').replace(/p\.?m\.?/, 'pm');
  const m = s.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
  if (!m) {
    const hhmm = String(input).match(/^(\d{2}):(\d{2})$/);
    return hhmm ? hhmm[0] : undefined;
  }
  let hour = parseInt(m[1] || '0', 10);
  const minute = m[2];
  const mer = m[3];
  if (mer === 'am') {
    if (hour === 12) hour = 0;
  } else if (mer === 'pm') {
    if (hour !== 12) hour += 12;
  }
  const hh = hour.toString().padStart(2, '0');
  return `${hh}:${minute}`;
}
// Helper: normaliza objeto operatingHours conservando flags
function normalizeOperatingHours(source: any, fallback: any) {
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const out: any = {};
  days.forEach((day) => {
    const d = (source && source[day]) || {};
    const fb = (fallback && fallback[day]) || {};
    const open = normalizeToHHmm(d.open) || fb.open || '08:00';
    const close = normalizeToHHmm(d.close) || fb.close || '22:00';
    out[day] = { open, close, closed: !!d.closed };
  });
  return out;
}

const statusLabels = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  MAINTENANCE: 'Mantenimiento'
};

export default function CentersPage() {
  const { centers, loading, error, createCenter, updateCenter, deleteCenter, getCenters } = useAdminCenters();
  
  // Inicializar centros al montar el componente
  useEffect(() => {
    getCenters().catch(console.error);
  }, [getCenters]);
  
  // Helper function para asegurar que centers sea un array
  const getSafeCenters = () => {
    if (Array.isArray(centers)) return centers;
    if (centers && typeof centers === 'object' && 'data' in centers && Array.isArray((centers as any).data)) {
      return (centers as any).data;
    }
    return [];
  };
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingCenterId, setEditingCenterId] = useState<string | null>(null);

  // Función para validar excepciones antes de enviar
  const validateExceptions = (exceptions: any[]) => {
    const errors: string[] = [];
    
    exceptions.forEach((ex, index) => {
      if (!ex.date || ex.date.trim() === '') {
        errors.push(`Excepción ${index + 1}: La fecha es requerida`);
        return;
      }
      
      // Validar formato de fecha
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(ex.date)) {
        errors.push(`Excepción ${index + 1}: Formato de fecha inválido (debe ser YYYY-MM-DD)`);
      }
      
      if (!ex.closed) {
        // Si no está cerrado, debe tener horarios válidos
        if (!ex.start || !ex.end || ex.start.trim() === '' || ex.end.trim() === '') {
          errors.push(`Excepción ${index + 1}: Si no está cerrado, debe especificar horarios de inicio y fin`);
        } else {
          // Validar formato de hora
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(ex.start) || !timeRegex.test(ex.end)) {
            errors.push(`Excepción ${index + 1}: Formato de hora inválido (debe ser HH:MM)`);
          } else if (ex.start >= ex.end) {
            errors.push(`Excepción ${index + 1}: La hora de inicio debe ser anterior a la hora de fin`);
          }
        }
      }
    });
    
    return errors;
  };
  const [ohForm, setOhForm] = useState<any>({
    slotMinutes: 30,
    operatingHours: {
      monday: { open: '08:00', close: '22:00', closed: false },
      tuesday: { open: '08:00', close: '22:00', closed: false },
      wednesday: { open: '08:00', close: '22:00', closed: false },
      thursday: { open: '08:00', close: '22:00', closed: false },
      friday: { open: '08:00', close: '23:00', closed: false },
      saturday: { open: '08:00', close: '23:00', closed: false },
      sunday: { open: '08:00', close: '20:00', closed: false },
    },
    scheduleSlots: {
      monday: { closed: false, slots: [{ start: '08:00', end: '22:00' }] },
      tuesday: { closed: false, slots: [{ start: '08:00', end: '22:00' }] },
      wednesday: { closed: false, slots: [{ start: '08:00', end: '22:00' }] },
      thursday: { closed: false, slots: [{ start: '08:00', end: '22:00' }] },
      friday: { closed: false, slots: [{ start: '08:00', end: '23:00' }] },
      saturday: { closed: false, slots: [{ start: '08:00', end: '23:00' }] },
      sunday: { closed: false, slots: [{ start: '08:00', end: '20:00' }] },
    },
    exceptions: [] as Array<{ date: string; closed?: boolean; ranges?: Array<{ start: string; end: string }> }>,
    timezone: 'Europe/Madrid',
    dayStart: '06:00',
    nightStart: '18:00',
  });
  const [receiptForm, setReceiptForm] = useState<{ 
    legalName?: string;
    taxId?: string;
    fiscalAddress?: string;
    contactEmail?: string;
    contactPhone?: string;
    footerNotes?: string;
    showStripeReferences?: boolean;
  }>({});
  const [creditsForm, setCreditsForm] = useState<{ euroPerCredit?: string }>({});
  const [reservationsForm, setReservationsForm] = useState<{ maxAdvanceDays?: string; minAdvanceHours?: string }>({});
  const [taxesForm, setTaxesForm] = useState<{ rate?: string; included?: boolean }>({});
  // Datos básicos del centro (edición)
  const [centerEditForm, setCenterEditForm] = useState<{ 
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    description?: string;
    website?: string;
  }>({ name: '' });
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    description: '',
    website: '',
  });
  // Capacidad por centro calculada desde canchas
  const [capacityByCenter, setCapacityByCenter] = useState<Record<string, number>>({});
  const [totalCapacityComputed, setTotalCapacityComputed] = useState<number>(0);

  const itemsPerPage = 6;

  // Cargar centros al montar (con guard para StrictMode)
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getCenters({ page: 1, limit: 50 }).catch(() => {});
    // Cargar capacidades desde canchas una sola vez
    (async () => {
      try {
        const courts: any[] = await adminApi.courts.getAll({ page: 1, limit: 1000 });
        const map: Record<string, number> = {};
        let total = 0;
        courts.forEach((court: any) => {
          const centerId = court.centerId || court.center_id;
          const cap = Number(court.capacity ?? court.maxPlayers ?? 0) || 0;
          if (centerId) {
            map[centerId] = (map[centerId] || 0) + cap;
          }
          total += cap;
        });
        setCapacityByCenter(map);
        setTotalCapacityComputed(total);
      } catch (e) {
        // noop
      }
    })();
  }, [getCenters]);

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircleIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error al cargar los centros
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filtrar centros
  const safeCenters = getSafeCenters();
  const filteredCenters = safeCenters.filter((center: any) => {
    const matchesSearch = 
      center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || center.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Paginación
  const totalPages = Math.ceil(filteredCenters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCenters = filteredCenters.slice(startIndex, startIndex + itemsPerPage);

  const handleDeleteCenter = async (centerId: string) => {
    const { confirm } = await import('@/components/ConfirmDialog');
    const ok = await confirm({
      title: 'Eliminar centro',
      description: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
      tone: 'danger',
      confirmText: 'Eliminar',
    });
    if (ok) {
      try {
        await deleteCenter(centerId);
      } catch (error) {
        console.error('Error al eliminar el centro:', error);
        alert('Error al eliminar el centro. Por favor, inténtalo de nuevo.');
      }
    }
  };

  const totalCourts = safeCenters.reduce((sum: number, center: any) => sum + (center.courtsCount || 0), 0);
  const totalCapacity = totalCapacityComputed || safeCenters.reduce((sum: number, center: any) => sum + (center.capacity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 mr-3 text-blue-600" />
            Gestión de Centros
          </h1>
          <p className="mt-2 text-gray-600">
            Administra los centros deportivos del polideportivo
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Centro
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Centros</p>
              <p className="text-2xl font-semibold text-gray-900">{safeCenters.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-green-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Centros Activos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {safeCenters.filter((c: any) => c.status === 'ACTIVE').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-purple-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Canchas</p>
              <p className="text-2xl font-semibold text-gray-900">{totalCourts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-orange-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Capacidad Total</p>
              <p className="text-2xl font-semibold text-gray-900">{totalCapacity}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar centros..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="MAINTENANCE">Mantenimiento</option>
            </select>
          </div>
        </div>
      </div>

      {/* Centers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedCenters.map((center: any) => {
          const centerSettings = (center as any)?.settings || {};
          const reservationsSettings = centerSettings?.reservations || {};
          const maxAdvanceDaysBadge = (center as any)?.bookingPolicy?.maxAdvanceDays ?? reservationsSettings?.maxAdvanceDays;
          return (
          <div key={center.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {center.name}
                  </h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    statusColors[center.status as keyof typeof statusColors]
                  }`}>
                    {statusLabels[center.status as keyof typeof statusLabels]}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <button
                    className="text-blue-600 hover:text-blue-900 p-1"
                    title="Ver detalles"
                    onClick={async () => {
                      try {
                        setIsLoading(true);
                        const res = await fetch(`/api/admin/centers/${center.id}`, { credentials: 'include' });
                        const data = await res.json();
                        // Cargar datos en el modal de edición en modo sólo-lectura
                        setEditingCenterId(center.id);
                        setCenterEditForm({
                          name: data?.name || center.name,
                          address: data?.address || center.address,
                          phone: data?.phone || center.phone,
                          email: data?.email || center.email,
                          description: data?.settings?.description || '',
                          website: data?.settings?.website || '',
                        });
                        const s = (data?.settings || {}) as any;
                        setOhForm((prev: any) => ({
                          ...prev,
                          timezone: data?.timezone || s.timezone || prev.timezone,
                          dayStart: data?.dayStart || s.dayStart || prev.dayStart,
                          nightStart: data?.nightStart || s.nightStart || prev.nightStart,
                          operatingHours: s.operatingHours || prev.operatingHours,
                          scheduleSlots: s.schedule_slots || prev.scheduleSlots, // ✅ AGREGAR schedule_slots
                          exceptions: Array.isArray(s.exceptions) ? s.exceptions : prev.exceptions,
                        }));
                        const rc = s?.receipt || {};
                        setReceiptForm({
                          legalName: rc.legalName || s.legalName || '',
                          taxId: rc.taxId || s.taxId || '',
                          fiscalAddress: rc.fiscalAddress || s.fiscalAddress || '',
                          contactEmail: rc.contactEmail || s.contactEmail || center.email || '',
                          contactPhone: rc.contactPhone || s.contactPhone || center.phone || '',
                          footerNotes: rc.footerNotes || '',
                          showStripeReferences: !!rc.showStripeReferences,
                        });
                        const cr = s?.credits || {};
                        setCreditsForm({ euroPerCredit: cr?.euroPerCredit != null ? String(cr.euroPerCredit) : '' });
                        const rs = s?.reservations || {};
                        setReservationsForm({
                          maxAdvanceDays: rs?.maxAdvanceDays != null ? String(rs.maxAdvanceDays) : '',
                          minAdvanceHours: rs?.minAdvanceHours != null ? String(rs.minAdvanceHours) : '',
                        });
                        const tx = s?.taxes || {};
                        setTaxesForm({ rate: tx?.rate != null ? String(tx.rate) : '', included: !!tx.included });
                        setShowEdit(true);
                      } catch (e) {
                        alert('No se pudieron cargar los detalles del centro');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="text-green-600 hover:text-green-900 p-1"
                    onClick={async () => {
                      try {
                        setIsLoading(true);
                        setEditingCenterId(center.id);
                        // Cargar detalles del centro para leer settings actuales
                        // Reutilizamos getCenters o hacemos un fetch puntual a /api/admin/centers/[id] vía hooks
                        // Para simplicidad, consultamos el endpoint público de centros (siempre autenticado) no está disponible aquí,
                        // usamos updateCenter con datos existentes; mejor: haremos una llamada manual
                        const res = await fetch(`/api/admin/centers/${center.id}`, { credentials: 'include' });
                        const json = await res.json();
                        const centerData = (json?.data || json);
                        // Cargar datos básicos editables
                        setCenterEditForm({
                          name: centerData?.name || center?.name || '',
                          address: centerData?.address || center?.address || '',
                          phone: centerData?.phone || center?.phone || '',
                          email: centerData?.email || center?.email || '',
                          description: centerData?.description || center?.description || '',
                          website: centerData?.website || center?.website || '',
                        });
                        const settings = centerData?.settings || {};
                        // Mapear valores existentes
                        const slotMinutes = settings?.slot?.minutes || settings?.booking?.slotMinutes || 30;
                        const operatingHours = normalizeOperatingHours(settings?.operatingHours, ohForm.operatingHours);
                        // Transformar excepciones de la estructura de BD a la estructura del frontend
                        const exceptions = Array.isArray(settings?.exceptions) ? settings.exceptions.map((ex: any) => {
                          if (ex.closed) {
                            return { date: ex.date, closed: true, start: '', end: '' };
                          } else if (ex.ranges && ex.ranges.length > 0) {
                            // Si tiene ranges, usar el primero para start/end (compatibilidad con UI actual)
                            const firstRange = ex.ranges[0];
                            return { 
                              date: ex.date, 
                              closed: false, 
                              start: firstRange.start, 
                              end: firstRange.end 
                            };
                          } else {
                            // Fallback si no tiene estructura válida
                            return { date: ex.date, closed: true, start: '', end: '' };
                          }
                        }) : [];
                        
                        setOhForm({
                          slotMinutes,
                          operatingHours,
                          scheduleSlots: settings?.schedule_slots || {}, // ✅ AGREGAR schedule_slots
                          exceptions,
                          timezone: centerData?.timezone || center?.timezone || 'Europe/Madrid',
                          dayStart: centerData?.dayStart || center?.dayStart || '06:00',
                          nightStart: centerData?.nightStart || center?.nightStart || '18:00',
                        });
                        const rc = settings?.receipt || {};
                        setReceiptForm({
                          legalName: rc.legalName || settings.legalName || '',
                          taxId: rc.taxId || settings.taxId || '',
                          fiscalAddress: rc.fiscalAddress || settings.fiscalAddress || '',
                          contactEmail: rc.contactEmail || settings.contactEmail || center.email || '',
                          contactPhone: rc.contactPhone || settings.contactPhone || center.phone || '',
                          footerNotes: rc.footerNotes || '',
                          showStripeReferences: !!rc.showStripeReferences,
                        });
                        const cr = settings?.credits || {};
                        setCreditsForm({ euroPerCredit: cr?.euroPerCredit != null ? String(cr.euroPerCredit) : '' });
                        const rs = settings?.reservations || {};
                        setReservationsForm({
                          maxAdvanceDays: rs?.maxAdvanceDays != null ? String(rs.maxAdvanceDays) : '',
                          minAdvanceHours: rs?.minAdvanceHours != null ? String(rs.minAdvanceHours) : '',
                        });
                        const tx = settings?.taxes || {};
                        setTaxesForm({ rate: tx?.rate != null ? String(tx.rate) : '', included: !!tx.included });
                        setShowEdit(true);
                      } catch (e) {
                        alert('No se pudieron cargar los detalles del centro');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button 
                    className="text-red-600 hover:text-red-900 p-1"
                    onClick={() => handleDeleteCenter(center.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center text-gray-600 mb-3">
                <MapPinIcon className="h-4 w-4 mr-2" />
                <span className="text-sm">
                  {(center as any).address}, {(center as any).city}
                </span>
              </div>

              {/* Hours (apertura/cierre) */}
              <div className="flex items-center text-gray-600 mb-1">
                <ClockIcon className="h-4 w-4 mr-2" />
                <span className="text-sm">
                  {(center as any).businessOpen || '-'} - {(center as any).businessClose || '-'}
                </span>
              </div>
              {typeof maxAdvanceDaysBadge === 'number' && maxAdvanceDaysBadge > 0 && (
                <div className="flex items-center text-gray-600 mb-3">
                  <span className="inline-flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    📅 Reservas hasta {maxAdvanceDaysBadge} días
                  </span>
                </div>
              )}
              {/* Tramo de iluminación (día/noche) */}
              <div className="flex items-center text-gray-600 mb-3">
                <span className="inline-flex items-center text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
                  💡 Día: {(center as any).dayStart || '-'} · Noche: {(center as any).nightStart || '-'}
                </span>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {(center as any).description}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-blue-600">
                    {(center as any).courtsCount}
                  </p>
                  <p className="text-xs text-gray-500">Canchas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-green-600">
                    {capacityByCenter[center.id] ?? (center as any).capacity ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Capacidad</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <p>📞 {(center as any).phone}</p>
                  <p>✉️ {(center as any).email}</p>
                </div>
              </div>
            </div>
          </div>
        );
        })}
      </div>

      {/* Empty State */}
      {filteredCenters.length === 0 && (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay centros</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron centros que coincidan con los filtros aplicados.
          </p>
        </div>
      )}

      {/* Modal Crear Centro */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Nuevo Centro</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Nombre</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Zona horaria</label>
                  <select value={ohForm.timezone} onChange={(e) => setOhForm({ ...ohForm, timezone: e.target.value })} className="w-full border rounded px-3 py-2">
                    <option value="America/Bogota">America/Bogota</option>
                    <option value="Europe/Madrid">Europe/Madrid</option>
                    <option value="America/Mexico_City">America/Mexico_City</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Inicio del día</label>
                  <input type="time" value={ohForm.dayStart} onChange={(e) => setOhForm({ ...ohForm, dayStart: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Inicio de la noche</label>
                  <input type="time" value={ohForm.nightStart} onChange={(e) => setOhForm({ ...ohForm, nightStart: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Dirección</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Teléfono</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Sitio web</label>
                <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await createCenter({
                      name: form.name,
                      address: form.address,
                      phone: form.phone,
                      email: form.email,
                      description: form.description,
                      website: form.website,
                    } as any);
                    // Guardar TZ/horarios día-noche como actualización inmediata sobre el centro recién creado
                    try {
                      const latest = (await getCenters({ page: 1, limit: 1 })) as any;
                    } catch {}
                    setShowCreate(false);
                    setForm({ name: '', address: '', city: '', phone: '', email: '', description: '', openingHours: '', closingHours: '', status: 'ACTIVE', courtsCount: 0, capacity: 0, createdAt: '' } as any);
                    getCenters({ page: 1, limit: 50 }).catch(() => {});
                  } catch (e) {
                    alert('Error al crear el centro');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                disabled={isLoading || !form.name}
              >
                {isLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Horarios */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Editar Centro</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
              <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Datos básicos */}
              <div className="border rounded p-4 space-y-3">
                <h4 className="text-md font-semibold text-gray-900">Datos del centro</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">Nombre</label>
                    <input value={centerEditForm.name} onChange={(e)=>setCenterEditForm({ ...centerEditForm, name: e.target.value })} className="w-full border rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Zona horaria</label>
                    <select
                      value={ohForm.timezone}
                      onChange={(e)=>setOhForm({ ...ohForm, timezone: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="Europe/Madrid">Europe/Madrid</option>
                      <option value="America/Bogota">America/Bogota</option>
                      <option value="America/Mexico_City">America/Mexico_City</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Inicio del día</label>
                    <input type="time" value={ohForm.dayStart || ''} onChange={(e)=>setOhForm({ ...ohForm, dayStart: e.target.value })} className="w-full border rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Inicio de la noche</label>
                    <input type="time" value={ohForm.nightStart || ''} onChange={(e)=>setOhForm({ ...ohForm, nightStart: e.target.value })} className="w-full border rounded px-3 py-2" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">Dirección</label>
                    <input value={centerEditForm.address || ''} onChange={(e)=>setCenterEditForm({ ...centerEditForm, address: e.target.value })} className="w-full border rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Teléfono</label>
                    <input value={centerEditForm.phone || ''} onChange={(e)=>setCenterEditForm({ ...centerEditForm, phone: e.target.value })} className="w-full border rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Email</label>
                    <input type="email" value={centerEditForm.email || ''} onChange={(e)=>setCenterEditForm({ ...centerEditForm, email: e.target.value })} className="w-full border rounded px-3 py-2" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">Descripción</label>
                    <textarea value={centerEditForm.description || ''} onChange={(e)=>setCenterEditForm({ ...centerEditForm, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">Sitio web</label>
                    <input value={centerEditForm.website || ''} onChange={(e)=>setCenterEditForm({ ...centerEditForm, website: e.target.value })} className="w-full border rounded px-3 py-2" />
                  </div>
                </div>
              </div>
              {/* Configuración de horarios y slots */}
              {/* Slot size */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Tamaño de slot (minutos)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={ohForm.slotMinutes}
                  onChange={(e) => setOhForm({ ...ohForm, slotMinutes: Number(e.target.value) })}
                  className="w-32 border rounded px-3 py-2"
                />
              </div>
                {/* Datos fiscales y recibos */}
                <div className="border rounded p-4 space-y-3">
                  <h4 className="text-md font-semibold text-gray-900">Datos fiscales y recibos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Nombre fiscal (legalName)</label>
                      <input
                        value={receiptForm.legalName || ''}
                        onChange={(e) => setReceiptForm({ ...receiptForm, legalName: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">CIF/NIF (taxId)</label>
                      <input
                        value={receiptForm.taxId || ''}
                        onChange={(e) => setReceiptForm({ ...receiptForm, taxId: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">Dirección fiscal (fiscalAddress)</label>
                      <textarea
                        value={receiptForm.fiscalAddress || ''}
                        onChange={(e) => setReceiptForm({ ...receiptForm, fiscalAddress: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Email de contacto</label>
                      <input
                        type="email"
                        value={receiptForm.contactEmail || ''}
                        onChange={(e) => setReceiptForm({ ...receiptForm, contactEmail: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Teléfono de contacto</label>
                      <input
                        value={receiptForm.contactPhone || ''}
                        onChange={(e) => setReceiptForm({ ...receiptForm, contactPhone: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">Notas de pie de página (footerNotes)</label>
                      <textarea
                        value={receiptForm.footerNotes || ''}
                        onChange={(e) => setReceiptForm({ ...receiptForm, footerNotes: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        rows={2}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!receiptForm.showStripeReferences}
                          onChange={(e) => setReceiptForm({ ...receiptForm, showStripeReferences: e.target.checked })}
                        />
                        <span className="text-gray-900">Mostrar referencias de Stripe (PaymentIntent/Refund) en recibo</span>
                      </label>
                    </div>
                  </div>
                </div>
                {/* Reservas */}
                <div className="border rounded p-4 space-y-3">
                  <h4 className="text-md font-semibold text-gray-900">Reservas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Días máximos de anticipación</label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={reservationsForm.maxAdvanceDays || ''}
                        onChange={(e) => setReservationsForm(prev => ({ ...prev, maxAdvanceDays: e.target.value }))}
                        className="w-32 border rounded px-3 py-2"
                        placeholder="Ej: 90"
                      />
                      <p className="text-xs text-gray-700 mt-1">Controla hasta cuántos días en el futuro se pueden abrir reservas (1-365).</p>
                    </div>
                  </div>
                </div>

                {/* Créditos */}
                <div className="border rounded p-4 space-y-3">
                  <h4 className="text-md font-semibold text-gray-900">Créditos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Euros por crédito (euroPerCredit)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={creditsForm.euroPerCredit || ''}
                        onChange={(e) => setCreditsForm({ euroPerCredit: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Ej: 1.00"
                      />
                      <p className="text-xs text-gray-700 mt-1">Se usarán créditos en reservas con método "Créditos". Debe ser mayor que 0.</p>
                    </div>
                  </div>
                </div>
                {/* Impuestos (IVA/IGIC) */}
                <div className="border rounded p-4 space-y-3">
                  <h4 className="text-md font-semibold text-gray-900">Impuestos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Tasa (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={taxesForm.rate || ''}
                        onChange={(e) => setTaxesForm({ ...taxesForm, rate: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Ej: 21.00"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!taxesForm.included}
                          onChange={(e) => setTaxesForm({ ...taxesForm, included: e.target.checked })}
                        />
                        <span className="text-gray-900">Impuestos incluidos en el precio</span>
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700">Si marcas "incluidos", el precio calculado ya incorpora impuestos; el recibo mostrará el componente impositivo.</p>
                </div>
              {/* Horarios de operación - Enterprise */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900">Horarios de operación</h4>
                <ScheduleEditor
                  scheduleSlots={ohForm.scheduleSlots}
                  operatingHours={ohForm.operatingHours}
                  onChange={(scheduleSlots) => setOhForm({ ...ohForm, scheduleSlots })}
                  onLegacyChange={(operatingHours) => setOhForm({ ...ohForm, operatingHours })}
                  showLegacyMode={true}
                  className="space-y-4"
                />
              </div>
              {/* Exceptions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Excepciones</span>
                  <button
                    className="text-sm px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    onClick={() => setOhForm({ ...ohForm, exceptions: [...ohForm.exceptions, { date: '', closed: true, start: '', end: '' }] })}
                  >
                    <span className="text-gray-900">Añadir excepción</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {ohForm.exceptions.map((ex: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Fecha</label>
                        <input
                          type="date"
                          value={ex.date || ''}
                          onChange={(e) => {
                            const next = [...ohForm.exceptions];
                            next[idx] = { ...next[idx], date: e.target.value };
                            setOhForm({ ...ohForm, exceptions: next });
                          }}
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Cerrado</label>
                        <input
                          type="checkbox"
                          checked={!!ex.closed}
                          onChange={(e) => {
                            const next = [...ohForm.exceptions];
                            next[idx] = { ...next[idx], closed: e.target.checked };
                            setOhForm({ ...ohForm, exceptions: next });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Desde</label>
                        <input
                          type="time"
                          value={ex.start || ''}
                          onChange={(e) => {
                            const next = [...ohForm.exceptions];
                            next[idx] = { ...next[idx], start: e.target.value };
                            setOhForm({ ...ohForm, exceptions: next });
                          }}
                          disabled={ex.closed}
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Hasta</label>
                        <input
                          type="time"
                          value={ex.end || ''}
                          onChange={(e) => {
                            const next = [...ohForm.exceptions];
                            next[idx] = { ...next[idx], end: e.target.value };
                            setOhForm({ ...ohForm, exceptions: next });
                          }}
                          disabled={ex.closed}
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => {
                            const next = ohForm.exceptions.filter((_: any, i: number) => i !== idx);
                            setOhForm({ ...ohForm, exceptions: next });
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar excepción"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                disabled={!editingCenterId}
                onClick={async () => {
                  if (!editingCenterId) return;
                  
                  // Validar excepciones antes de enviar
                  const exceptionErrors = validateExceptions(ohForm.exceptions);
                  if (exceptionErrors.length > 0) {
                    alert(`Errores en las excepciones:\n${exceptionErrors.join('\n')}`);
                    return;
                  }
                  
                  setIsLoading(true);
                  try {
                    const normalizedHours = normalizeOperatingHours(ohForm.operatingHours, ohForm.operatingHours);
                    const parsedMaxAdvance = reservationsForm.maxAdvanceDays ? Number(reservationsForm.maxAdvanceDays) : undefined;
                    const parsedMinAdvance = reservationsForm.minAdvanceHours ? Number(reservationsForm.minAdvanceHours) : undefined;
                    const reservationsSettings: Record<string, number> = {};
                    if (parsedMaxAdvance && Number.isFinite(parsedMaxAdvance)) {
                      reservationsSettings.maxAdvanceDays = Math.min(Math.max(Math.trunc(parsedMaxAdvance), 1), 365);
                    }
                    if (parsedMinAdvance && Number.isFinite(parsedMinAdvance)) {
                      reservationsSettings.minAdvanceHours = Math.max(Math.trunc(parsedMinAdvance), 0);
                    }
                    const payload: any = {
                      // Datos básicos (opcionales si no cambian)
                      name: centerEditForm.name?.trim(),
                      address: centerEditForm.address?.trim() || undefined,
                      phone: centerEditForm.phone?.trim() || undefined,
                      email: centerEditForm.email?.trim() || undefined,
                      description: centerEditForm.description?.trim() || undefined,
                      website: centerEditForm.website?.trim() || undefined,
                      timezone: ohForm.timezone,
                      dayStart: ohForm.dayStart,
                      nightStart: ohForm.nightStart,
                      operatingHours: normalizedHours, // <-- raíz para API
                      settings: {
                        // Normalizar antes de guardar para asegurar HH:mm
                        operatingHours: normalizedHours,
                        slot: { minutes: Number(ohForm.slotMinutes) || 30 },
                        exceptions: ohForm.exceptions
                          .filter((ex: any) => ex.date && ex.date.trim() !== '') // Solo excepciones con fecha válida
                          .map((ex: any) => {
                            if (ex.closed) {
                              return { date: ex.date, closed: true };
                            } else if (ex.ranges && ex.ranges.length > 0) {
                              // Si ya tiene ranges, usarlos
                              return { date: ex.date, ranges: ex.ranges };
                            } else if (ex.start && ex.end && ex.start.trim() !== '' && ex.end.trim() !== '') {
                              // Si tiene start/end, convertirlos a ranges
                              return { date: ex.date, ranges: [{ start: ex.start, end: ex.end }] };
                            } else {
                              // Si no tiene datos válidos, omitir esta excepción
                              return null;
                            }
                          })
                          .filter((ex: any) => ex !== null), // Filtrar excepciones nulas
                        receipt: {
                          legalName: (receiptForm.legalName || '').trim() || undefined,
                          taxId: (receiptForm.taxId || '').trim() || undefined,
                          fiscalAddress: (receiptForm.fiscalAddress || '').trim() || undefined,
                          contactEmail: (receiptForm.contactEmail || '').trim() || undefined,
                          contactPhone: (receiptForm.contactPhone || '').trim() || undefined,
                          footerNotes: (receiptForm.footerNotes || '').trim() || undefined,
                          showStripeReferences: !!receiptForm.showStripeReferences,
                        },
                        credits: {
                          euroPerCredit: creditsForm.euroPerCredit && Number(creditsForm.euroPerCredit) > 0
                            ? Number(creditsForm.euroPerCredit)
                            : undefined,
                        },
                        taxes: {
                          rate: taxesForm.rate && Number(taxesForm.rate) >= 0 ? Number(taxesForm.rate) : undefined,
                          included: !!taxesForm.included,
                        },
                        timezone: ohForm.timezone,
                      },
                      scheduleSlots: ohForm.scheduleSlots, // 🆕 AGREGAR SCHEDULE SLOTS
                    };
                    if (Object.keys(reservationsSettings).length > 0) {
                      (payload.settings as any).reservations = reservationsSettings;
                    }
                    await updateCenter(editingCenterId, payload as any);
                    setShowEdit(false);
                    setEditingCenterId(null);
                    getCenters({ page: 1, limit: 50 }).catch(() => {});
                  } catch (e) {
                    alert('No se pudo guardar la configuración de horarios');
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
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
                Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                <span className="font-medium">
                  {Math.min(startIndex + itemsPerPage, filteredCenters.length)}
                </span>{' '}
                de <span className="font-medium">{filteredCenters.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === currentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}