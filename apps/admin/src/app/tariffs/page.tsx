"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheckIcon,
  PlusIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserPlusIcon,
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
    dateOfBirth?: string | null;
  };
  approvedByUser?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  tariff?: AdminTariff;
}

type EnrollmentFormState = {
  status: AdminTariffEnrollment['status'];
  notes: string;
  reason: string;
};

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
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<AdminTariffEnrollment | null>(null);
  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentFormState>({
    status: 'PENDING',
    notes: '',
    reason: '',
  });
  const [isSavingEnrollment, setIsSavingEnrollment] = useState(false);
  const [showNewEnrollmentModal, setShowNewEnrollmentModal] = useState(false);
  const [newEnrollmentForm, setNewEnrollmentForm] = useState({
    tariffId: '',
    notes: '',
    autoApprove: true,
  });
  const [enrollmentUserSearchTerm, setEnrollmentUserSearchTerm] = useState('');
  const [foundEnrollmentUsers, setFoundEnrollmentUsers] = useState<any[]>([]);
  const [selectedEnrollmentUser, setSelectedEnrollmentUser] = useState<any | null>(null);
  const [isSearchingEnrollmentUsers, setIsSearchingEnrollmentUsers] = useState(false);
  const [newEnrollmentError, setNewEnrollmentError] = useState<string | null>(null);
  const [isCreatingEnrollment, setIsCreatingEnrollment] = useState(false);
  const [selectedEnrollmentUserDetails, setSelectedEnrollmentUserDetails] = useState<any | null>(null);
  const [isLoadingEnrollmentUser, setIsLoadingEnrollmentUser] = useState(false);
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

  const enrollmentStatusOptions = useMemo(
    () =>
      (Object.keys(tariffStatusMetadata) as Array<AdminTariffEnrollment['status']>).map((status) => ({
        value: status,
        label: tariffStatusMetadata[status].label,
      })),
    [tariffStatusMetadata]
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

  const resetNewEnrollmentState = () => {
    setNewEnrollmentForm({
      tariffId: '',
      notes: '',
      autoApprove: true,
    });
    setEnrollmentUserSearchTerm('');
    setFoundEnrollmentUsers([]);
    setSelectedEnrollmentUser(null);
    setSelectedEnrollmentUserDetails(null);
    setIsLoadingEnrollmentUser(false);
    setNewEnrollmentError(null);
  };

  const openNewEnrollmentModal = () => {
    resetNewEnrollmentState();
    setShowNewEnrollmentModal(true);
  };

  const closeNewEnrollmentModal = () => {
    setShowNewEnrollmentModal(false);
    resetNewEnrollmentState();
  };

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

  const handleEnrollmentUserSearch = async (term: string) => {
    setEnrollmentUserSearchTerm(term);
    setNewEnrollmentError(null);
    setSelectedEnrollmentUser(null);
    setSelectedEnrollmentUserDetails(null);
    if (term.trim().length < 3) {
      setFoundEnrollmentUsers([]);
      setIsSearchingEnrollmentUsers(false);
      return;
    }

    setIsSearchingEnrollmentUsers(true);
    try {
      const response = await adminApi.users.getAll({
        search: term.trim(),
        limit: 5,
      });
      // adminApi.users.getAll devuelve { data: [...], pagination: {...} }
      const items = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray((response as any)?.items)
            ? (response as any).items
            : [];
      setFoundEnrollmentUsers(items);
    } catch (error) {
      console.error('Error buscando usuarios para tarifa regulada:', error);
      setFoundEnrollmentUsers([]);
      setNewEnrollmentError('No se pudo buscar usuarios. Intenta nuevamente.');
    } finally {
      setIsSearchingEnrollmentUsers(false);
    }
  };

  const handleSelectEnrollmentUser = async (user: any) => {
    setSelectedEnrollmentUser(user);
    const label = `${[user.firstName, user.lastName].filter(Boolean).join(' ')}`.trim();
    const display =
      label.length > 0 ? `${label}${user.email ? ` (${user.email})` : ''}` : user.email ?? '';
    if (display) {
      setEnrollmentUserSearchTerm(display);
    }
    setFoundEnrollmentUsers([]);
    setNewEnrollmentError(null);
    setSelectedEnrollmentUserDetails(null);

    if (!user?.id) return;
    try {
      setIsLoadingEnrollmentUser(true);
      const details = await adminApi.users.getById(user.id);
      setSelectedEnrollmentUserDetails(details);
    } catch (error) {
      console.error('Error obteniendo detalles del usuario:', error);
      setSelectedEnrollmentUserDetails(null);
    } finally {
      setIsLoadingEnrollmentUser(false);
    }
  };

  const existingActiveEnrollment = useMemo(() => {
    if (!selectedEnrollmentUser?.id) return null;
    return (
      enrollments.find(
        (enrollment) =>
          enrollment.user?.id === selectedEnrollmentUser.id &&
          (enrollment.status === 'PENDING' || enrollment.status === 'APPROVED')
      ) ?? null
    );
  }, [enrollments, selectedEnrollmentUser?.id]);

  const selectedTariff = useMemo(
    () => tariffs.find((tariff) => tariff.id === newEnrollmentForm.tariffId) ?? null,
    [tariffs, newEnrollmentForm.tariffId]
  );

  const calculatedUserAge = useMemo(() => {
    const dateValue = selectedEnrollmentUserDetails?.dateOfBirth;
    if (!dateValue) return null;
    const dob = new Date(dateValue);
    if (Number.isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  }, [selectedEnrollmentUserDetails]);

  const isAgeCompatible = useMemo(() => {
    if (!selectedTariff || calculatedUserAge === null) return true;
    if (calculatedUserAge < selectedTariff.minAge) return false;
    if (selectedTariff.maxAge !== null && calculatedUserAge > selectedTariff.maxAge) return false;
    return true;
  }, [selectedTariff, calculatedUserAge]);

  const estimatedTariffExpiry = useMemo(() => {
    if (!selectedTariff) return null;

    const candidates: Date[] = [];

    if (selectedTariff.validUntil) {
      const validUntilDate = new Date(selectedTariff.validUntil);
      if (!Number.isNaN(validUntilDate.getTime())) {
        candidates.push(validUntilDate);
      }
    }

    if (
      selectedTariff.maxAge !== null &&
      selectedTariff.maxAge !== undefined &&
      selectedEnrollmentUserDetails?.dateOfBirth
    ) {
      const dob = new Date(selectedEnrollmentUserDetails.dateOfBirth);
      if (!Number.isNaN(dob.getTime())) {
        const limit = new Date(dob);
        limit.setFullYear(limit.getFullYear() + selectedTariff.maxAge + 1);
        limit.setDate(limit.getDate() - 1);
        candidates.push(limit);
      }
    }

    if (candidates.length === 0) return null;

    return candidates.reduce((earliest, current) => (current < earliest ? current : earliest));
  }, [selectedTariff, selectedEnrollmentUserDetails]);

  const canCreateEnrollment =
    !!selectedEnrollmentUser?.id &&
    !!newEnrollmentForm.tariffId &&
    !existingActiveEnrollment &&
    isAgeCompatible &&
    !isCreatingEnrollment &&
    !isLoadingEnrollmentUser;

  const formatDateShort = (value?: string | Date | null) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('es-ES');
  };

  const calculateAgeFromDob = (dob?: string | null) => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  };

  const estimateEnrollmentExpiry = (enrollment: AdminTariffEnrollment, tariff?: AdminTariff | null) => {
    const referenceTariff = tariff ?? enrollment.tariff ?? null;
    const candidates: Date[] = [];

    if (referenceTariff?.validUntil) {
      const validUntil = new Date(referenceTariff.validUntil);
      if (!Number.isNaN(validUntil.getTime())) {
        candidates.push(validUntil);
      }
    }

    const maxAge = referenceTariff?.maxAge;
    const dob = enrollment.user?.dateOfBirth;
    if (typeof maxAge === 'number' && dob) {
      const birthDate = new Date(dob);
      if (!Number.isNaN(birthDate.getTime())) {
        const limit = new Date(birthDate);
        limit.setFullYear(limit.getFullYear() + maxAge + 1);
        limit.setDate(limit.getDate() - 1);
        candidates.push(limit);
      }
    }

    if (candidates.length === 0) return null;
    return candidates.reduce((earliest, current) => (current < earliest ? current : earliest));
  };

  const handleCreateNewEnrollment = async () => {
    try {
      setNewEnrollmentError(null);

      if (!selectedEnrollmentUser?.id) {
        setNewEnrollmentError('Debes seleccionar un usuario.');
        return;
      }

      if (!newEnrollmentForm.tariffId) {
        setNewEnrollmentError('Debes seleccionar una tarifa.');
        return;
      }

      if (existingActiveEnrollment) {
        setNewEnrollmentError('El usuario ya tiene una solicitud activa para una tarifa regulada.');
        return;
      }

      if (!isAgeCompatible) {
        setNewEnrollmentError(
          'La edad calculada del usuario no cumple con el rango permitido por la tarifa seleccionada.'
        );
        return;
      }

      setIsCreatingEnrollment(true);

      await adminApi.tariffs.createEnrollment({
        userId: selectedEnrollmentUser.id,
        tariffId: newEnrollmentForm.tariffId,
        notes: newEnrollmentForm.notes?.trim() || undefined,
        autoApprove: newEnrollmentForm.autoApprove,
      });

      await loadEnrollments();
      alert(
        newEnrollmentForm.autoApprove
          ? 'Tarifa asignada y aprobada correctamente.'
          : 'Solicitud creada correctamente en estado pendiente.'
      );
      setShowNewEnrollmentModal(false);
      resetNewEnrollmentState();
    } catch (error: any) {
      console.error('Error creando solicitud de tarifa:', error);
      const message =
        error?.message ||
        (error instanceof Error ? error.message : 'No se pudo crear la solicitud.');
      setNewEnrollmentError(message);
    } finally {
      setIsCreatingEnrollment(false);
    }
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

  const openEnrollmentEditModal = (enrollment: AdminTariffEnrollment) => {
    setEditingEnrollment(enrollment);
    setEnrollmentForm({
      status: enrollment.status,
      notes: enrollment.notes ?? '',
      reason: '',
    });
    setShowEnrollmentModal(true);
  };

  const closeEnrollmentModal = () => {
    setShowEnrollmentModal(false);
    setEditingEnrollment(null);
    setEnrollmentForm({ status: 'PENDING', notes: '', reason: '' });
  };

  const handleEnrollmentFormChange = (
    field: keyof EnrollmentFormState,
    value: string | AdminTariffEnrollment['status'],
  ) => {
    setEnrollmentForm((prev) => {
      if (field === 'status') {
        const nextStatus = value as AdminTariffEnrollment['status'];
        return {
          ...prev,
          status: nextStatus,
          reason: nextStatus === 'REJECTED' ? prev.reason : '',
        };
      }
      return {
        ...prev,
        [field]: value as string,
      };
    });
  };

  const handleSubmitEnrollmentUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingEnrollment) return;

    const payload: {
      status?: AdminTariffEnrollment['status'];
      notes?: string;
      reason?: string;
    } = {};

    if (enrollmentForm.status !== editingEnrollment.status) {
      payload.status = enrollmentForm.status;
    }

    const trimmedNotes = enrollmentForm.notes.trim();
    if (trimmedNotes !== (editingEnrollment.notes ?? '')) {
      payload.notes = trimmedNotes;
    }

    if (!payload.status && payload.notes === undefined) {
      closeEnrollmentModal();
      return;
    }

    if (payload.status === 'REJECTED') {
      const reason = enrollmentForm.reason.trim();
      if (!reason || reason.length < 3) {
        alert('Debes indicar un motivo de rechazo (mínimo 3 caracteres).');
        return;
      }
      payload.reason = reason;
    }

    setIsSavingEnrollment(true);
    try {
      await adminApi.tariffs.updateEnrollment(editingEnrollment.id, payload);
      await loadEnrollments();
      closeEnrollmentModal();
    } catch (error) {
      console.error('Error actualizando solicitud:', error);
      alert(error instanceof Error ? error.message : 'No se pudo actualizar la solicitud');
    } finally {
      setIsSavingEnrollment(false);
    }
  };

  const handleDeleteEnrollment = async (enrollment: AdminTariffEnrollment) => {
    const confirmation = window.confirm('¿Seguro que deseas eliminar esta solicitud? Esta acción no se puede deshacer.');
    if (!confirmation) return;

    setIsSavingEnrollment(true);
    try {
      await adminApi.tariffs.deleteEnrollment(enrollment.id);
      await loadEnrollments();
      if (editingEnrollment?.id === enrollment.id) {
        closeEnrollmentModal();
      }
    } catch (error) {
      console.error('Error eliminando solicitud:', error);
      alert(error instanceof Error ? error.message : 'No se pudo eliminar la solicitud');
    } finally {
      setIsSavingEnrollment(false);
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
            onClick={openNewEnrollmentModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100"
          >
            <UserPlusIcon className="w-4 h-4" />
            Asignar tarifa a usuario
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
                  const userAge = calculateAgeFromDob(enrollment.user?.dateOfBirth);
                  const estimatedExpiry = formatDateShort(estimateEnrollmentExpiry(enrollment, tariff));
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
                        <div>Solicitada: {formatDateShort(enrollment.requestedAt) ?? '—'}</div>
                        {enrollment.approvedAt && <div>Actualizada: {formatDateShort(enrollment.approvedAt)}</div>}
                        {userAge !== null && <div>Edad actual: {userAge} años</div>}
                        {estimatedExpiry && <div>Vence estimado: {estimatedExpiry}</div>}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 max-w-sm">
                        {enrollment.notes ? enrollment.notes : '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {enrollment.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApproveEnrollment(enrollment)}
                                disabled={isProcessingEnrollment || isSavingEnrollment}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-500 disabled:opacity-50"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                                Aprobar
                              </button>
                              <button
                                onClick={() => handleRejectEnrollment(enrollment)}
                                disabled={isProcessingEnrollment || isSavingEnrollment}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-500 disabled:opacity-50"
                              >
                                <XCircleIcon className="w-4 h-4" />
                                Rechazar
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openEnrollmentEditModal(enrollment)}
                            disabled={isProcessingEnrollment || isSavingEnrollment}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteEnrollment(enrollment)}
                            disabled={isProcessingEnrollment || isSavingEnrollment}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircleIcon className="w-4 h-4" />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showNewEnrollmentModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/50 px-4 py-6 sm:py-10">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Asignar tarifa regulada a usuario</h3>
              <button onClick={closeNewEnrollmentModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                ×
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {newEnrollmentError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {newEnrollmentError}
                </div>
              )}

              <div>
                <label htmlFor="enrollmentUserSearch" className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar usuario (nombre o correo)
                </label>
                <input
                  id="enrollmentUserSearch"
                  type="text"
                  value={enrollmentUserSearchTerm}
                  onChange={(e) => handleEnrollmentUserSearch(e.target.value)}
                  placeholder="Introduce al menos 3 caracteres"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {isSearchingEnrollmentUsers && (
                  <p className="mt-1 text-xs text-gray-500">Buscando usuarios...</p>
                )}
                {foundEnrollmentUsers.length > 0 && (
                  <ul className="mt-2 max-h-48 overflow-y-auto divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
                    {foundEnrollmentUsers.map((user) => (
                      <li
                        key={user.id}
                        className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-3"
                        onClick={() => void handleSelectEnrollmentUser(user)}
                      >
                        <span>
                          {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Usuario sin nombre'}
                        </span>
                        <span className="text-xs text-gray-500">{user.email}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {isLoadingEnrollmentUser && (
                  <p className="mt-2 text-xs text-gray-500">Cargando información del usuario…</p>
                )}
                {selectedEnrollmentUser && !isLoadingEnrollmentUser && (
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-emerald-700">
                      Usuario seleccionado:{' '}
                      {[selectedEnrollmentUser.firstName, selectedEnrollmentUser.lastName]
                        .filter(Boolean)
                        .join(' ') || selectedEnrollmentUser.email}
                    </p>
                    {calculatedUserAge !== null && (
                      <p className="text-gray-600">
                        Edad calculada: <span className="font-medium text-gray-800">{calculatedUserAge} años</span>
                      </p>
                    )}
                    {estimatedTariffExpiry && (
                      <p className="text-gray-600">
                        Vigencia estimada:{' '}
                        <span className="font-medium text-gray-800">
                          {new Intl.DateTimeFormat('es-ES', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          }).format(estimatedTariffExpiry)}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="enrollmentTariff" className="block text-sm font-medium text-gray-700 mb-1">
                  Tarifa regulada
                </label>
                <select
                  id="enrollmentTariff"
                  value={newEnrollmentForm.tariffId}
                  onChange={(e) =>
                    setNewEnrollmentForm((prev) => ({
                      ...prev,
                      tariffId: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecciona una tarifa</option>
                  {tariffs.map((tariff) => (
                    <option key={tariff.id} value={tariff.id}>
                      {tariff.segment} • {formatAgeRange(tariff)} • {tariff.discountPercent}% desc.
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="enrollmentNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notas internas (opcional)
                </label>
                <textarea
                  id="enrollmentNotes"
                  value={newEnrollmentForm.notes}
                  onChange={(e) =>
                    setNewEnrollmentForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notas internas sobre la verificación realizada."
                />
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="autoApprove"
                  type="checkbox"
                  checked={newEnrollmentForm.autoApprove}
                  onChange={(e) =>
                    setNewEnrollmentForm((prev) => ({
                      ...prev,
                      autoApprove: e.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="autoApprove" className="text-sm text-gray-700">
                  Aprobar automáticamente la solicitud después de crearla.
                </label>
              </div>

              {existingActiveEnrollment && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  El usuario ya tiene una solicitud {existingActiveEnrollment.status === 'APPROVED' ? 'aprobada' : 'pendiente'} para la tarifa{' '}
                  <strong>{existingActiveEnrollment.tariff?.segment ?? 'regulada'}</strong>. No puedes crear otra mientras siga activa.
                </div>
              )}

              {selectedTariff && calculatedUserAge !== null && !isAgeCompatible && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  La tarifa seleccionada aplica para edades entre {selectedTariff.minAge}
                  {selectedTariff.maxAge !== null ? ` y ${selectedTariff.maxAge}` : ' o más'} años. La edad calculada del usuario es{' '}
                  <strong>{calculatedUserAge}</strong> años.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={closeNewEnrollmentModal}
                className="px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-100"
                disabled={isCreatingEnrollment}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateNewEnrollment}
                disabled={!canCreateEnrollment}
                className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:bg-emerald-200 disabled:text-emerald-700/60 disabled:cursor-not-allowed"
              >
                {isCreatingEnrollment ? 'Asignando...' : 'Asignar tarifa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnrollmentModal && editingEnrollment && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/50 px-4 py-6 sm:py-10">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Editar solicitud de verificación</h3>
              <button onClick={closeEnrollmentModal} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleSubmitEnrollmentUpdate} className="space-y-6">
              <div className="px-6 pt-4 space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">{formatUserName(editingEnrollment.user)}</p>
                  <p className="text-xs text-gray-500">ID: {editingEnrollment.user?.id ?? '—'}</p>
                </div>

                <label className="block text-sm font-medium text-gray-700">
                  Estado
                  <select
                    value={enrollmentForm.status}
                    onChange={(event) => handleEnrollmentFormChange('status', event.target.value as AdminTariffEnrollment['status'])}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {enrollmentStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Notas internas
                  <textarea
                    value={enrollmentForm.notes}
                    onChange={(event) => handleEnrollmentFormChange('notes', event.target.value)}
                    rows={4}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Notas visibles para el equipo administrativo"
                  />
                </label>

                {enrollmentForm.status === 'REJECTED' && (
                  <label className="block text-sm font-medium text-gray-700">
                    Motivo del rechazo
                    <textarea
                      value={enrollmentForm.reason}
                      onChange={(event) => handleEnrollmentFormChange('reason', event.target.value)}
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Describe por qué se rechaza la solicitud"
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={closeEnrollmentModal}
                  className="px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-100"
                  disabled={isSavingEnrollment}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEnrollment}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSavingEnrollment ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
