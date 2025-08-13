"use client";

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../lib/api';
import {
  MagnifyingGlassIcon as Search,
  PlusIcon as Plus,
  PencilIcon as Edit,
  TrashIcon as Trash2,
  ClockIcon as Clock,
  MapPinIcon as MapPin,
  CurrencyDollarIcon as DollarSign,
  CalendarDaysIcon as Calendar,
  CheckIcon as Save,
  XMarkIcon as X,
} from '@heroicons/react/24/outline';

// Tipos basados en el backend
interface ApiPricingRule {
  id: string;
  name: string;
  courtId?: string | null;
  timeStart?: string;
  timeEnd?: string;
  daysOfWeek?: number[];
  priceMultiplier?: number;
  memberDiscount?: number; // decimal 0..1
  isActive: boolean;
}

interface ApiCourt {
  id: string;
  name: string;
  sportType: string;
  center: { name: string };
  basePricePerHour: string | number;
}

const dayLetters: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' };

function formatDays(days?: number[]): string[] {
  if (!Array.isArray(days) || days.length === 0) return [];
  return days.map((d) => dayLetters[d] || String(d));
}

function toNumber(n: string | number | undefined): number {
  if (n === undefined) return 0;
  return typeof n === 'number' ? n : Number(n);
}

export default function PricingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [courtTypeFilter, setCourtTypeFilter] = useState<string>('all');
  const [centerFilter, setCenterFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<ApiPricingRule[]>([]);
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCourtId, setFormCourtId] = useState('');
  const [formTimeStart, setFormTimeStart] = useState('08:00');
  const [formTimeEnd, setFormTimeEnd] = useState('18:00');
  const [formDaysOfWeek, setFormDaysOfWeek] = useState<number[]>([1,2,3,4,5]);
  const [formMultiplier, setFormMultiplier] = useState(1.0);
  const [formMemberDiscountPct, setFormMemberDiscountPct] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Cargar reglas
        const rulesResp: any = await adminApi.pricing.getRules({ page: 1, limit: 100 });
        const list: ApiPricingRule[] = (rulesResp?.pricingRules || rulesResp || []) as ApiPricingRule[];
        setRules(list);
        // Cargar canchas (vía endpoint público para evitar depender de admin/*)
        const res = await fetch('/api/courts', { credentials: 'include' });
        const data = await res.json();
        const courtsList: ApiCourt[] = Array.isArray(data?.courts)
          ? data.courts
          : Array.isArray(data?.data?.courts)
            ? data.data.courts
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data)
                ? data
                : [];
        setCourts(courtsList);
      } catch (e: any) {
        setError(e?.message || 'Error cargando reglas de precio');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const courtById = useMemo(() => {
    const map = new Map<string, ApiCourt>();
    const list = Array.isArray(courts) ? courts : [];
    for (const c of list) map.set(c.id, c);
    return map;
  }, [courts]);
  const itemsPerPage = 10;

  const enrichedRules = useMemo(() => {
    return rules.map((r) => {
      const court = r.courtId ? courtById.get(r.courtId) : undefined;
      return {
        id: r.id,
        name: r.name,
        courtType: court?.sportType || '-',
        center: court?.center?.name || '-',
        timeStart: r.timeStart || '00:00',
        timeEnd: r.timeEnd || '23:59',
        daysOfWeek: r.daysOfWeek || [],
        basePrice: toNumber(court?.basePricePerHour),
        priceMultiplier: typeof r.priceMultiplier === 'number' ? r.priceMultiplier : 1.0,
        memberDiscountPct: typeof r.memberDiscount === 'number' ? Math.round(Number(r.memberDiscount) * 100) : 0,
        isActive: !!r.isActive,
      };
    });
  }, [rules, courtById]);

  const filteredRules = enrichedRules.filter((rule) => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.courtType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourtType = courtTypeFilter === 'all' || rule.courtType === courtTypeFilter;
    const matchesCenter = centerFilter === 'all' || rule.center === centerFilter;
    const matchesStatus = statusFilter === 'all' || (rule.isActive ? 'active' : 'inactive') === statusFilter;
    return matchesSearch && matchesCourtType && matchesCenter && matchesStatus;
  });

  const totalPages = Math.ceil(filteredRules.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRules = filteredRules.slice(startIndex, startIndex + itemsPerPage);

  const calculateFinalPrice = (
    rule: { basePrice: number; priceMultiplier: number; memberDiscountPct: number },
    membershipType: 'vip' | 'none' = 'none'
  ) => {
    let price = (rule.basePrice || 0) * (rule.priceMultiplier || 1);
    if (membershipType === 'vip' && rule.memberDiscountPct) {
      price = price * (1 - rule.memberDiscountPct / 100);
    }
    return Math.round(price);
  };

  const uniqueCourtTypes = useMemo(() => [...new Set(enrichedRules.map(rule => rule.courtType).filter(Boolean))], [enrichedRules]);
  const uniqueCenters = useMemo(() => [...new Set(enrichedRules.map(rule => rule.center).filter(Boolean))], [enrichedRules]);

  const resetForm = () => {
    setFormName('');
    setFormCourtId('');
    setFormTimeStart('08:00');
    setFormTimeEnd('18:00');
    setFormDaysOfWeek([1,2,3,4,5]);
    setFormMultiplier(1.0);
    setFormMemberDiscountPct(0);
    setFormIsActive(true);
    setEditingRuleId(null);
  };

  const submitForm = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload: any = {
        name: formName,
        courtId: formCourtId || undefined,
        timeStart: formTimeStart,
        timeEnd: formTimeEnd,
        daysOfWeek: formDaysOfWeek,
        priceMultiplier: formMultiplier,
        membershipDiscount: formMemberDiscountPct, // %; el servicio normaliza
        isActive: formIsActive,
      };
      if (editingRuleId) {
        await adminApi.pricing.updateRule(editingRuleId, payload);
      } else {
        await adminApi.pricing.createRule(payload);
      }
      // Recargar
      const rulesResp: any = await adminApi.pricing.getRules({ page: 1, limit: 100 });
      const list: ApiPricingRule[] = (rulesResp?.pricingRules || rulesResp || []) as ApiPricingRule[];
      setRules(list);
      setShowCreateForm(false);
      resetForm();
    } catch (e: any) {
      setError(e?.message || 'Error guardando la regla');
    } finally {
      setLoading(false);
    }
  };

  const onDeleteRule = async (id: string) => {
    if (!confirm('¿Eliminar esta regla de precios?')) return;
    try {
      setLoading(true);
      await adminApi.pricing.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e?.message || 'Error eliminando la regla');
    } finally {
      setLoading(false);
    }
  };

  const onEditRule = (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    setEditingRuleId(id);
    setFormName(rule.name);
    setFormCourtId(rule.courtId || '');
    setFormTimeStart(rule.timeStart || '08:00');
    setFormTimeEnd(rule.timeEnd || '18:00');
    setFormDaysOfWeek(rule.daysOfWeek || []);
    setFormMultiplier(typeof rule.priceMultiplier === 'number' ? rule.priceMultiplier : 1.0);
    setFormMemberDiscountPct(typeof rule.memberDiscount === 'number' ? Math.round(rule.memberDiscount * 100) : 0);
    setFormIsActive(!!rule.isActive);
    setShowCreateForm(true);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuración de Precios</h1>
            <p className="text-gray-600">Gestiona las reglas de precios para canchas y servicios</p>
          </div>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nueva Regla de Precio
          </button>
        </div>
        {loading && (
          <p className="mt-2 text-sm text-gray-500">Cargando…</p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-600">Reglas Activas</p>
               <p className="text-2xl font-bold text-gray-900">{enrichedRules.filter(r => r.isActive).length}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-600">Precio Promedio (aplicado)</p>
               <p className="text-2xl font-bold text-gray-900">
                 ${(() => {
                   const list = enrichedRules;
                   if (list.length === 0) return 0;
                   const sum = list.reduce((acc, r) => acc + calculateFinalPrice({ basePrice: r.basePrice, priceMultiplier: r.priceMultiplier || 1, memberDiscountPct: r.memberDiscountPct || 0 }), 0);
                   return Math.round(sum / list.length).toLocaleString();
                 })()}
               </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tipos de Cancha</p>
               <p className="text-2xl font-bold text-gray-900">{uniqueCourtTypes.length}</p>
            </div>
            <MapPin className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Centros</p>
               <p className="text-2xl font-bold text-gray-900">{uniqueCenters.length}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar reglas de precio..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={courtTypeFilter}
              onChange={(e) => setCourtTypeFilter(e.target.value)}
            >
              <option value="all">Todos los tipos</option>
              {uniqueCourtTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
            >
              <option value="all">Todos los centros</option>
              {uniqueCenters.map(center => (
                <option key={center} value={center}>{center}</option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de reglas de precio */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Regla
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo de Cancha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Días
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Base
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Final
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
               {paginatedRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                      <div className="text-sm text-gray-500">{rule.center}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.courtType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.timeStart} - {rule.timeEnd}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-1">
                      {formatDays(rule.daysOfWeek).map((letter, idx) => (
                        <span key={idx} className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                           {letter}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     ${rule.basePrice.toLocaleString()}
                      {rule.priceMultiplier !== 1.0 && (
                      <div className="text-xs text-gray-500">
                         x{rule.priceMultiplier}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                       ${calculateFinalPrice({ basePrice: rule.basePrice, priceMultiplier: rule.priceMultiplier || 1, memberDiscountPct: rule.memberDiscountPct || 0 }).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                       VIP: ${calculateFinalPrice({ basePrice: rule.basePrice, priceMultiplier: rule.priceMultiplier || 1, memberDiscountPct: rule.memberDiscountPct || 0 }, 'vip').toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      rule.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {rule.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                       <button className="text-green-600 hover:text-green-900" onClick={() => onEditRule(rule.id)}>
                        <Edit className="w-4 h-4" />
                      </button>
                       <button className="text-red-600 hover:text-red-900" onClick={() => onDeleteRule(rule.id)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredRules.length)}</span> de{' '}
                  <span className="font-medium">{filteredRules.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
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
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para crear nueva regla */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingRuleId ? 'Editar' : 'Nueva'} Regla de Precio</h2>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la regla</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Fútbol - Horario Normal"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cancha</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={formCourtId} onChange={(e) => setFormCourtId(e.target.value)}>
                    <option value="">Selecciona una cancha</option>
                    {courts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.center?.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Centro</label>
                  <input disabled value={formCourtId ? (courtById.get(formCourtId)?.center?.name || '-') : ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formTimeStart}
                    onChange={(e) => setFormTimeStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formTimeEnd}
                    onChange={(e) => setFormTimeEnd(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Multiplicador</label>
                  <input type="number" step="0.1" min="0.1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={formMultiplier} onChange={(e) => setFormMultiplier(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descuento membresía (%)</label>
                  <input type="number" min="0" max="100" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={formMemberDiscountPct} onChange={(e) => setFormMemberDiscountPct(Number(e.target.value))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Días de la semana</label>
                <div className="flex flex-wrap gap-2">
                  {[1,2,3,4,5,6,7].map((d) => (
                    <label key={d} className={`px-3 py-1 rounded border cursor-pointer ${formDaysOfWeek.includes(d) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-700'}`}>
                      <input type="checkbox" className="hidden" checked={formDaysOfWeek.includes(d)} onChange={() => setFormDaysOfWeek((prev) => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])} />
                      {dayLetters[d]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input id="active" type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
                <label htmlFor="active" className="text-sm text-gray-700">Activa</label>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button onClick={submitForm} disabled={!formName || !formCourtId} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  Guardar Regla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}