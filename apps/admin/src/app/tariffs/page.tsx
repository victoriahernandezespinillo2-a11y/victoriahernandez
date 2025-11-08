"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheckIcon,
  PlusIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { adminApi } from '@/lib/api';
import { useAdminCourts } from '@/lib/hooks';

interface AdminTariff {
  id: string;
  segment: string;
  minAge: number;
  maxAge: number | null;
  discountPercent: number;
  description?: string | null;
  requiresManualApproval: boolean;
  validFrom: string;
  validUntil?: string | null;
  isActive: boolean;
  courts?: Array<{
    courtId: string;
    court?: {
      id: string;
      name: string;
      centerId: string;
    };
  }>;
}

interface AdminTariffEnrollment {
  id: string;
  tariffId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAt: string;
  approvedAt?: string | null;
  notes?: string | null;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  approvedByUser?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  tariff?: AdminTariff;
}

const SEGMENT_OPTIONS = [
  { value: 'INFANTIL', label: 'Infantil (0-14 años)' },
  { value: 'JOVEN', label: 'Jóvenes (15-26 años)' },
  { value: 'SENIOR', label: 'Mayores (65+ años)' },
  { value: 'PERSONALIZADA', label: 'Personalizada' },
];

type TariffFormState = {
  segment: string;
  minAge: number;
  maxAge?: number;
  discountPercent: number;
  description: string;
  requiresManualApproval: boolean;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  courtIds: string[];
};

const INITIAL_TARIFF_FORM: TariffFormState = {
  segment: 'INFANTIL',
  minAge: 0,
  maxAge: 14,
  discountPercent: 40,
  description: '',
  requiresManualApproval: true,
  validFrom: '',
  validUntil: '',
  isActive: true,
  courtIds: [],
};

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState<AdminTariff[]>([]);
  const [loadingTariffs, setLoadingTariffs] = useState(true);
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState<AdminTariff | null>(null);
  const [isSavingTariff, setIsSavingTariff] = useState(false);
  const [tariffForm, setTariffForm] = useState<TariffFormState>({ ...INITIAL_TARIFF_FORM });
  const [applyToAllCourts, setApplyToAllCourts] = useState(true);
  const [manualCourtSelection, setManualCourtSelection] = useState<string[]>([]);

  const [enrollments, setEnrollments] = useState<AdminTariffEnrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [isProcessingEnrollment, setIsProcessingEnrollment] = useState(false);
  const { courts: availableCourts, getCourts, loading: loadingCourts } = useAdminCourts();

  const tariffStatusMetadata: Record<AdminTariffEnrollment['status'], { label: string; className: string }> = useMemo(
    () => ({
      PENDING: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800' },
      APPROVED: { label: 'Aprobada', className: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Rechazada', className: 'bg-red-100 text-red-800' },
      EXPIRED: { label: 'Expirada', className: 'bg-gray-200 text-gray-600' },
    }),
    []
  );

  const PAGE_LIMIT = 100;

  const loadTariffs = useCallback(async () => {
    setLoadingTariffs(true);
    try {
      const { items } = await adminApi.tariffs.list({ limit: PAGE_LIMIT });
      setTariffs(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Error cargando tarifas:', error);
      setTariffs([]);
    } finally {
      setLoadingTariffs(false);
    }
  }, []);

  const loadEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    try {
      const { items } = await adminApi.tariffs.listEnrollments({ limit: PAGE_LIMIT });
      setEnrollments(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Error cargando solicitudes de tarifas:', error);
      setEnrollments([]);
    } finally {
      setLoadingEnrollments(false);
    }
  }, []);

  useEffect(() => {
    loadTariffs();
    loadEnrollments();
  }, [loadTariffs, loadEnrollments]);

  const resetForm = () => {
    setEditingTariff(null);
    setTariffForm({ ...INITIAL_TARIFF_FORM });
    setApplyToAllCourts(true);
    setManualCourtSelection([]);
  };

  useEffect(() => {
    getCourts({ limit: 500 }).catch(() => {});
  }, [getCourts]);

  const centerLookup = useMemo(() => {
    const map = new Map<string, string>();
    (availableCourts ?? []).forEach((court: any) => {
      map.set(court.id, court.centerName || '');
    });
    return map;
  }, [availableCourts]);

  const openCreateModal = () => {
    resetForm();
    setShowTariffModal(true);
  };

  const openEditModal = (tariff: AdminTariff) => {
    setEditingTariff(tariff);
    const courtIds = Array.isArray(tariff.courts) ? tariff.courts.map((court) => court.courtId) : [];
    setTariffForm({
      segment: tariff.segment,
      minAge: tariff.minAge,
      maxAge: tariff.maxAge ?? undefined,
      discountPercent: Number(((tariff.discountPercent > 1 ? tariff.discountPercent : tariff.discountPercent * 100)).toFixed(0)),
      description: tariff.description ?? '',
      requiresManualApproval: tariff.requiresManualApproval,
      validFrom: tariff.validFrom ? tariff.validFrom.slice(0, 10) : '',
      validUntil: tariff.validUntil ? tariff.validUntil.slice(0, 10) : '',
      isActive: tariff.isActive,
      courtIds,
    });
    setManualCourtSelection(courtIds);
    setApplyToAllCourts(courtIds.length === 0);
    setShowTariffModal(true);
  };

  const handleTariffFormChange = (field: keyof TariffFormState, value: any) => {
    setTariffForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (field === 'courtIds' && Array.isArray(value) && value.length > 0) {
      setManualCourtSelection(value);
    }
  };

  const handleApplyAllCourtsChange = (checked: boolean) => {
    if (checked) {
      setApplyToAllCourts(true);
      setTariffForm((prev) => ({ ...prev, courtIds: [] }));
      return;
    }

    setApplyToAllCourts(false);
    setTariffForm((prev) => ({
      ...prev,
      courtIds: manualCourtSelection.length > 0 ? manualCourtSelection : [],
    }));
  };

  const handleSubmitTariff = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingTariff(true);
    try {
      const normalizedMaxAge =
        typeof tariffForm.maxAge === 'number' && !Number.isNaN(tariffForm.maxAge)
          ? tariffForm.maxAge
          : undefined;

      if (!applyToAllCourts && tariffForm.courtIds.length === 0) {
        alert('Selecciona al menos una cancha o marca la opción "Aplicar a todas".');
        setIsSavingTariff(false);
        return;
      }

      const payload = {
        segment: tariffForm.segment,
        minAge: Number(tariffForm.minAge),
        maxAge: normalizedMaxAge,
        discountPercent: Number(tariffForm.discountPercent),
        description: tariffForm.description?.trim() || undefined,
        requiresManualApproval: tariffForm.requiresManualApproval,
        validFrom: tariffForm.validFrom ? new Date(tariffForm.validFrom).toISOString() : undefined,
        validUntil: tariffForm.validUntil ? new Date(tariffForm.validUntil).toISOString() : undefined,
        isActive: tariffForm.isActive,
        courtIds: applyToAllCourts ? [] : Array.isArray(tariffForm.courtIds) ? tariffForm.courtIds : [],
      };

      if (editingTariff) {
        await adminApi.tariffs.update(editingTariff.id, payload);
      } else {
        await adminApi.tariffs.create(payload);
      }

      await loadTariffs();
      setShowTariffModal(false);
      alert('Tarifa guardada correctamente');
    } catch (error) {
      console.error('Error guardando tarifa:', error);
      alert(error instanceof Error ? error.message : 'No se pudo guardar la tarifa');
    } finally {
      setIsSavingTariff(false);
    }
  };

  const handleApproveEnrollment = async (enrollment: AdminTariffEnrollment) => {
    const notes = window.prompt('Notas opcionales para la aprobación', enrollment.notes ?? '');
    setIsProcessingEnrollment(true);
    try {
      await adminApi.tariffs.approveEnrollment(enrollment.id, notes ? { notes } : undefined);
      await Promise.all([loadEnrollments(), loadTariffs()]);
      alert('Solicitud aprobada correctamente');
    } catch (error) {
      console.error('Error aprobando solicitud:', error);
      alert(error instanceof Error ? error.message : 'No se pudo aprobar la solicitud');
    } finally {
      setIsProcessingEnrollment(false);
    }
  };

  const handleRejectEnrollment = async (enrollment: AdminTariffEnrollment) => {
    const reason = window.prompt('Indica el motivo del rechazo (obligatorio)');
    if (!reason || reason.trim().length < 5) {
      alert('Debes indicar un motivo de al menos 5 caracteres.');
      return;
    }
    const notes = window.prompt('Notas adicionales (opcional)', enrollment.notes ?? '');
    setIsProcessingEnrollment(true);
    try {
      await adminApi.tariffs.rejectEnrollment(enrollment.id, {
        reason,
        notes: notes ?? undefined,
      });
      await loadEnrollments();
      alert('Solicitud rechazada correctamente');
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      alert(error instanceof Error ? error.message : 'No se pudo rechazar la solicitud');
    } finally {
      setIsProcessingEnrollment(false);
    }
  };

  const formatDiscount = (value: number) => {
    const normalized = value > 1 ? value : value * 100;
    return `${Number(normalized.toFixed(0))}%`;
  };

  const formatCourts = (tariff: AdminTariff) => {
    const count = tariff.courts?.length ?? 0;
    if (!count) return 'Todas las canchas';
    if (count === 1) {
      const court = tariff.courts?.[0]?.court;
      return court ? court.name : '1 cancha';
    }
    return `${count} canchas`;
  };

  const toggleCourtSelection = (courtId: string) => {
    setApplyToAllCourts(false);
    setTariffForm((prev) => {
      const exists = prev.courtIds.includes(courtId);
      const next = exists ? prev.courtIds.filter((id) => id !== courtId) : [...prev.courtIds, courtId];
      setManualCourtSelection(next);
      return { ...prev, courtIds: next };
    });
  };

  const formatAgeRange = (tariff: AdminTariff) => {
    if (tariff.maxAge !== null && tariff.maxAge >= tariff.minAge) {
      return `${tariff.minAge} - ${tariff.maxAge} años`;
    }
    return `${tariff.minAge}+ años`;
  };

  const formatUserName = (user?: AdminTariffEnrollment['user']) => {
    if (!user) return 'Usuario sin nombre';
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name.length > 0 ? name : (user.email ?? 'Usuario');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheckIcon className="w-7 h-7 text-blue-600" />
            Tarifas Reguladas
          </h1>
          <p className="text-gray-500">
            Administra los descuentos obligatorios y gestiona las solicitudes de verificación manual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTariffs}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={loadingTariffs}
          >
            <ArrowPathIcon className={`w-4 h-4 ${loadingTariffs ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-500"
          >
            <PlusIcon className="w-4 h-4" />
            Nueva tarifa
          </button>
        </div>
      </header>

      <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tarifas configuradas</h2>
          <p className="text-sm text-gray-500">Controla los tramos disponibles, porcentajes de descuento y vigencias.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segmento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rango de edad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descuento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vigencia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aplicación</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingTariffs ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    Cargando tarifas...
                  </td>
                </tr>
              ) : tariffs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No hay tarifas registradas todavía.
                  </td>
                </tr>
              ) : (
                tariffs.map((tariff) => (
                  <tr key={tariff.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {SEGMENT_OPTIONS.find((option) => option.value === tariff.segment)?.label ?? tariff.segment}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatAgeRange(tariff)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDiscount(tariff.discountPercent)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tariff.validFrom ? new Date(tariff.validFrom).toLocaleDateString('es-ES') : '—'}
                      {tariff.validUntil ? ` → ${new Date(tariff.validUntil).toLocaleDateString('es-ES')}` : ''}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatCourts(tariff)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${tariff.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {tariff.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => openEditModal(tariff)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Solicitudes de verificación</h2>
            <p className="text-sm text-gray-500">Aprueba o rechaza las solicitudes presentadas por los usuarios en la sede.</p>
          </div>
          <button
            onClick={loadEnrollments}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={loadingEnrollments}
          >
            <ArrowPathIcon className={`w-4 h-4 ${loadingEnrollments ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarifa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingEnrollments ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    Cargando solicitudes...
                  </td>
                </tr>
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No hay solicitudes registradas.
                  </td>
                </tr>
              ) : (
                enrollments.map((enrollment) => {
                  const statusMeta = tariffStatusMetadata[enrollment.status] ?? { label: enrollment.status, className: 'bg-gray-200 text-gray-600' };
                  const tariff = enrollment.tariff || tariffs.find((item) => item.id === enrollment.tariffId);
                  return (
                    <tr key={enrollment.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{formatUserName(enrollment.user)}</div>
                        <div className="text-xs text-gray-500">ID: {enrollment.user?.id ?? '—'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {tariff ? SEGMENT_OPTIONS.find((option) => option.value === tariff.segment)?.label ?? tariff.segment : 'Tarifa eliminada'}
                        <div className="text-xs text-gray-500">Descuento: {tariff ? formatDiscount(tariff.discountPercent) : '—'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div>Solicitada: {new Date(enrollment.requestedAt).toLocaleDateString('es-ES')}</div>
                        {enrollment.approvedAt && (
                          <div>Actualizada: {new Date(enrollment.approvedAt).toLocaleDateString('es-ES')}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 max-w-sm">
                        {enrollment.notes ? enrollment.notes : '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        {enrollment.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveEnrollment(enrollment)}
                              disabled={isProcessingEnrollment}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-500 disabled:opacity-50"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleRejectEnrollment(enrollment)}
                              disabled={isProcessingEnrollment}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-500 disabled:opacity-50"
                            >
                              <XCircleIcon className="w-4 h-4" />
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">Sin acciones</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showTariffModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/50 px-4 py-6 sm:py-10">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTariff ? 'Editar tarifa regulada' : 'Nueva tarifa regulada'}
              </h3>
              <button
                onClick={() => {
                  setShowTariffModal(false);
                  setEditingTariff(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmitTariff} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1 text-sm text-gray-600">
                    Segmento
                    <select
                      value={tariffForm.segment}
                      onChange={(event) => handleTariffFormChange('segment', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      {SEGMENT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-sm text-gray-600">
                      Edad mínima
                      <input
                        type="number"
                        min={0}
                        value={tariffForm.minAge}
                        onChange={(event) => handleTariffFormChange('minAge', Number(event.target.value))}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-gray-600">
                      Edad máxima
                      <input
                        type="number"
                        min={tariffForm.minAge}
                        value={tariffForm.maxAge ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          handleTariffFormChange('maxAge', value === '' ? undefined : Number(value));
                        }}
                        placeholder="Ilimitado"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-sm text-gray-600">
                    Descuento (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={tariffForm.discountPercent}
                      onChange={(event) => handleTariffFormChange('discountPercent', Number(event.target.value))}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-gray-600">
                    Vigente desde
                    <input
                      type="date"
                      value={tariffForm.validFrom}
                      onChange={(event) => handleTariffFormChange('validFrom', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-gray-600">
                    Vigente hasta
                    <input
                      type="date"
                      value={tariffForm.validUntil}
                      onChange={(event) => handleTariffFormChange('validUntil', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={tariffForm.requiresManualApproval}
                      onChange={(event) => handleTariffFormChange('requiresManualApproval', event.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Requiere validación manual
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={tariffForm.isActive}
                      onChange={(event) => handleTariffFormChange('isActive', event.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Tarifa activa
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-sm text-gray-600">
                  Descripción (opcional)
                  <textarea
                    value={tariffForm.description}
                    onChange={(event) => handleTariffFormChange('description', event.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Información adicional que verán los usuarios al solicitar la tarifa"
                  />
                </label>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Aplicación por cancha</label>
                      <p className="text-xs text-gray-500">
                        Selecciona las canchas donde se aplicará esta tarifa. Si no seleccionas ninguna, se aplicará a todas.
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={applyToAllCourts}
                        onChange={(event) => handleApplyAllCourtsChange(event.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Aplicar a todas
                    </label>
                  </div>

                  {!applyToAllCourts && (
                    <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
                      {loadingCourts ? (
                        <div className="p-3 text-sm text-gray-500">Cargando canchas...</div>
                      ) : (availableCourts?.length ?? 0) === 0 ? (
                        <div className="p-3 text-sm text-gray-500">No hay canchas disponibles.</div>
                      ) : (
                        (availableCourts ?? []).map((court: any) => {
                          const checked = tariffForm.courtIds.includes(court.id);
                          return (
                            <label
                              key={court.id}
                              className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                            >
                              <div>
                                <span className="font-medium text-gray-800">{court.name}</span>
                                {centerLookup.get(court.id) && (
                                  <span className="ml-2 text-xs text-gray-500">({centerLookup.get(court.id)})</span>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCourtSelection(court.id)}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

            <div className="sticky bottom-0 inset-x-0 flex items-center justify-end gap-3 px-5 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-white shadow-[0_-2px_12px_rgba(15,23,42,0.08)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowTariffModal(false);
                    setEditingTariff(null);
                  }}
                  className="px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingTariff}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSavingTariff ? 'Guardando...' : 'Guardar tarifa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
