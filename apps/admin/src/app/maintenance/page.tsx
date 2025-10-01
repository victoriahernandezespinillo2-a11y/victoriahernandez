'use client';

import { useEffect, useMemo, useState } from 'react';
// Helper local para formatear HH:mm en una zona horaria específica sin dependencias adicionales
const formatHHmmInTz = (date: Date, timeZone: string): string => {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(date);
  } catch {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
};
import { z } from 'zod';
import { useAdminMaintenance, useAdminCourts, useAdminCenters } from '@/lib/hooks';
import { useToast } from '@/components/ToastProvider';
import { getCategoryFieldLabel, getCategoryOptions } from '@/lib/activityCategories';
import {
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

export default function MaintenancePage() {
  const {
    maintenanceRecords,
    loading,
    error,
    getMaintenanceRecords,
    createMaintenanceRecord,
    updateMaintenanceRecord,
    deleteMaintenanceRecord,
    startMaintenance,
    completeMaintenance,
  } = useAdminMaintenance();
  
  const { courts, getCourts } = useAdminCourts();
  const { centers, getCenters } = useAdminCenters();
  const { showToast } = useToast();

  // --- Utilidades de validación y mapeo ----------------------------

  const CATEGORY_MAP: Record<string, string> = {
    // Entrenamientos / deportes
    'Fútbol': 'FOOTBALL',
    'Baloncesto': 'BASKETBALL',
    'Natación': 'SWIMMING',
    // Mantenimiento
    Pintura: 'PAINT',
    Limpieza: 'CLEANING',
    Reparación: 'REPAIR',
  };

  const MaintenanceBase = z.object({
    courtId: z.string().regex(/^c[0-9a-z]{24}$/i, 'ID de cancha inválido'),
    description: z.string().min(10, 'Descripción mínima de 10 caracteres'),
    scheduledAt: z.string().datetime(),
    assignedTo: z.string().optional(),
    cost: z.number().nonnegative('Costo inválido').optional(),
    estimatedDuration: z.number().int().min(15).max(480),
    notes: z.string().optional(),
    activityType: z.enum(['MAINTENANCE','TRAINING','CLASS','WARMUP','EVENT','MEETING','OTHER']),
    capacity: z.number().int().positive().optional(),
    instructor: z.string().optional(),
    isPublic: z.boolean().optional(),
    requirements: z.string().optional(),
  });

  const MaintenanceSchema = z.discriminatedUnion('activityType', [
    MaintenanceBase.extend({
      activityType: z.literal('MAINTENANCE'),
      type: z.string().min(1, 'Tipo de mantenimiento requerido'),
    }),
    MaintenanceBase.extend({
      activityType: z.enum(['TRAINING','CLASS','WARMUP','EVENT','MEETING','OTHER']),
      activityCategory: z.string().min(1, 'Categoría requerida'),
    }),
  ]);

  // Validación de recurrencia (solo UI)
  const RecurrenceSchema = z.object({
    type: z.literal('WEEKLY').default('WEEKLY'),
    daysOfWeek: z.array(z.number().int().min(1).max(7)).nonempty('Selecciona al menos un día'),
    startDate: z.string().min(10, 'Desde requerido'),
    endDate: z.string().min(10, 'Hasta requerido'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/,'Hora inicio HH:mm'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/,'Hora fin HH:mm'),
    timezone: z.string().optional(),
    skipHolidays: z.boolean().optional(),
    skipConflicts: z.boolean().optional(),
  }).refine((r) => r.startTime < r.endTime, { message: 'La hora fin debe ser mayor que la hora inicio' });

  // Estado para el modal de nueva tarea
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const makeDefaultNewTaskForm = () => ({
    courtId: '',
    type: '',
    activityType: 'MAINTENANCE',
    activityCategory: '',
    description: '',
    scheduledAt: '',
    estimatedDuration: 60,
    assignedTo: '',
    instructor: '',
    capacity: '',
    requirements: '',
    isPublic: true,
    cost: '',
    notes: '',
    // Recurrencia UI
    repeat: false,
    daysOfWeek: [] as number[],
    startDate: '',
    endDate: '',
    startTime: '16:00',
    endTime: '17:00',
    skipHolidays: true,
    skipConflicts: true,
  });
  const [newTaskForm, setNewTaskForm] = useState(makeDefaultNewTaskForm());

  // Zona horaria del centro seleccionada dinámicamente
  const centerTz = (() => {
    try {
      const c: any = (centers || []).find((ctr: any) => ctr.id === selectedCenterId);
      return (c?.timezone || (c?.settings as any)?.timezone || 'Europe/Madrid') as string;
    } catch {
      return 'Europe/Madrid';
    }
  })();

  const handleTimeChange = (field: 'startTime' | 'endTime') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateVal = e.target.valueAsDate; // fecha en TZ del navegador
      if (dateVal) {
        const hhmm = formatHHmmInTz(dateVal, centerTz);
        setNewTaskForm(prev => ({ ...prev, [field]: hhmm }));
      } else {
        setNewTaskForm(prev => ({ ...prev, [field]: e.target.value }));
      }
    };

  // Preview de recurrencia
  const [recurrencePreview, setRecurrencePreview] = useState<string[]>([]);
  const [recurrenceTotal, setRecurrenceTotal] = useState<number>(0);

  useEffect(() => {
    if (!newTaskForm.repeat) {
      setRecurrencePreview([]);
      setRecurrenceTotal(0);
      return;
    }
    // Validar entradas mínimas
    if (!newTaskForm.startDate || !newTaskForm.endDate || newTaskForm.daysOfWeek.length === 0) {
      setRecurrencePreview([]);
      setRecurrenceTotal(0);
      return;
    }
    try {
      const start = new Date(`${newTaskForm.startDate}T00:00:00`);
      const end = new Date(`${newTaskForm.endDate}T23:59:59`);
      const days = new Set(newTaskForm.daysOfWeek);
      const preview: string[] = [];
      let total = 0;
      const fmt = (d: Date) => d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const weekday = ((d.getDay() + 6) % 7) + 1; // 1..7 L-D
        if (!days.has(weekday)) continue;
        total += 1;
        if (preview.length < 10) preview.push(`${fmt(new Date(d))} · ${newTaskForm.startTime}–${newTaskForm.endTime}`);
      }
      setRecurrencePreview(preview);
      setRecurrenceTotal(total);
    } catch {
      setRecurrencePreview([]);
      setRecurrenceTotal(0);
    }
  }, [newTaskForm.repeat, newTaskForm.startDate, newTaskForm.endDate, newTaskForm.daysOfWeek, newTaskForm.startTime, newTaskForm.endTime]);

  // Estado para edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    type: '',
    activityType: 'MAINTENANCE',
    activityCategory: '',
    description: '',
    scheduledAt: '',
    estimatedDuration: 60,
    assignedTo: '',
    instructor: '',
    capacity: '',
    requirements: '',
    isPublic: true,
    cost: '',
    notes: '',
  });

  // Estado para eliminación
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingMaintenance, setDeletingMaintenance] = useState<any>(null);

  // Agrupación UI por serie (sin cambiar backend)
  const [groupBySeries, setGroupBySeries] = useState(true);

  const recordsToRender = useMemo(() => {
    const list = Array.isArray(maintenanceRecords) ? (maintenanceRecords as any[]) : [];
    if (!groupBySeries) return list;
    // Agrupar por seriesId cuando exista; de lo contrario, por id
    const now = new Date();
    const map = new Map<string, any[]>();
    for (const rec of list) {
      const key = (rec as any).seriesId || (rec as any).id;
      const arr = map.get(key) || [];
      arr.push(rec);
      map.set(key, arr);
    }
    // Para cada grupo, elegir la próxima ocurrencia (>= ahora); si no hay, la más cercana pasada
    const pickBest = (arr: any[]) => {
      const sorted = [...arr].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      const upcoming = sorted.find((r) => new Date(r.scheduledAt) >= now);
      const chosen = upcoming || sorted[0];
      // anotar conteo total para mostrar si se desea
      return { ...chosen, __seriesCount: arr.length };
    };
    return Array.from(map.values()).map(pickBest);
  }, [maintenanceRecords, groupBySeries]);

  useEffect(() => {
    getMaintenanceRecords({ limit: 50 }).catch(() => {});
    getCourts({ page: 1, limit: 100 }).catch(() => {});
    getCenters({ page: 1, limit: 100 }).catch(() => {});
  }, [getMaintenanceRecords, getCourts, getCenters]);

  const formatPriority = (priority?: string) => {
    switch ((priority || '').toUpperCase()) {
      case 'CRITICAL': return 'Urgente';
      case 'HIGH': return 'Alta';
      case 'MEDIUM': return 'Media';
      case 'LOW': return 'Baja';
      default: return 'N/D';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch ((priority || '').toUpperCase()) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch ((status || '').toUpperCase()) {
      case 'COMPLETED': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'IN_PROGRESS': return <ClockIcon className="h-5 w-5 text-blue-600" />;
      case 'SCHEDULED': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      default: return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch ((status || '').toUpperCase()) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'SCHEDULED': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (value?: string | Date) => {
    if (!value) return '—';
    const d = new Date(value);
    return d.toLocaleString('es-ES');
  };

  const formatDuration = (minutes?: number | null) => {
    if (!minutes && minutes !== 0) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h} h ${m} min`;
    if (h > 0) return `${h} h`;
    return `${m} min`;
  };

  // Función para abrir el modal de nueva tarea
  const handleNewTask = () => {
    const base = makeDefaultNewTaskForm();
    base.scheduledAt = new Date().toISOString().slice(0, 16);
    setNewTaskForm(base);
    setSelectedCenterId('');
    setShowNewTaskModal(true);
  };

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setShowNewTaskModal(false);
    setNewTaskForm(makeDefaultNewTaskForm());
    setSelectedCenterId('');
  };

  // Función para manejar el envío del formulario
  const handleSubmitNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isMaintenance = newTaskForm.activityType === 'MAINTENANCE';
    const categoryFilled = isMaintenance ? newTaskForm.type : newTaskForm.activityCategory;

    if (!newTaskForm.courtId || !categoryFilled || !newTaskForm.description || (!newTaskForm.repeat && !newTaskForm.scheduledAt)) {
      showToast({
        title: 'Error',
        message: 'Por favor completa todos los campos obligatorios',
        variant: 'error'
      });
      return;
    }

    // Validar longitud mínima de descripción (requerido por backend)
    if (newTaskForm.description.length < 10) {
      showToast({
        title: 'Error',
        message: 'La descripción debe tener al menos 10 caracteres',
        variant: 'error'
      });
      return;
    }

    // Validar costo si se proporciona
    if (newTaskForm.cost && (isNaN(parseFloat(newTaskForm.cost)) || parseFloat(newTaskForm.cost) < 0)) {
      showToast({
        title: 'Error',
        message: 'El costo debe ser un número positivo válido',
        variant: 'error'
      });
      return;
    }

    // Validaciones adicionales de UX antes del parseo
    if (!newTaskForm.repeat) {
      const scheduledDate = new Date(newTaskForm.scheduledAt);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        showToast({ title: 'Error', message: 'La fecha programada debe ser futura', variant: 'error' });
        return;
      }
    } else {
      // En modo recurrente, ignorar totalmente scheduledAt (no debe validar ni enviarse)
      // Validar solo campos de recurrencia
      if (!newTaskForm.startDate || !newTaskForm.endDate) {
        showToast({ title: 'Error', message: 'Indica fechas Desde y Hasta', variant: 'error' });
        return;
      }
      if (newTaskForm.daysOfWeek.length === 0) {
        showToast({ title: 'Error', message: 'Selecciona al menos un día para la recurrencia', variant: 'error' });
        return;
      }
      if ((newTaskForm.startTime || '') >= (newTaskForm.endTime || '')) {
        showToast({ title: 'Error', message: 'La hora fin debe ser mayor que la hora inicio', variant: 'error' });
        return;
      }
      if (new Date(newTaskForm.startDate) > new Date(newTaskForm.endDate)) {
        showToast({ title: 'Error', message: 'El rango de fechas es inválido (Desde debe ser anterior o igual a Hasta)', variant: 'error' });
        return;
      }
    }

    setIsSubmitting(true);
    
    // Preparar datos para envío
    const scheduledDate = new Date(newTaskForm.repeat ? new Date() : newTaskForm.scheduledAt);
    // Mapear categoría/ tipo visible al valor esperado por backend
    const uiValue = newTaskForm.activityType === 'MAINTENANCE' ? newTaskForm.type : newTaskForm.activityCategory;
    const apiType = CATEGORY_MAP[uiValue] ?? uiValue;

    const isUuid = /^[0-9a-fA-F-]{32,36}$/.test(newTaskForm.assignedTo.trim());
    const manualAssignee = newTaskForm.assignedTo && !isUuid ? newTaskForm.assignedTo.trim() : '';

    const base = {
      courtId: newTaskForm.courtId.trim(),
      description: newTaskForm.description.trim(),
      scheduledAt: scheduledDate.toISOString(),
      assignedTo: isUuid ? newTaskForm.assignedTo.trim() : undefined,
      cost: newTaskForm.cost ? parseFloat(newTaskForm.cost) : undefined,
      estimatedDuration: Math.round(newTaskForm.estimatedDuration),
      notes: (() => {
        const n = newTaskForm.notes?.trim() || '';
        return manualAssignee ? `${n ? n + '\n' : ''}Asignado a (manual): ${manualAssignee}` : (n || undefined);
      })(),
      activityType: newTaskForm.activityType as any,
      ...(newTaskForm.capacity ? { capacity: parseInt(newTaskForm.capacity) } : {}),
      ...(newTaskForm.instructor?.trim() ? { instructor: newTaskForm.instructor.trim() } : {}),
      isPublic: !!newTaskForm.isPublic,
      ...(newTaskForm.requirements?.trim() ? { requirements: newTaskForm.requirements.trim() } : {}),
    } as const;

    const maintenanceDataRaw: any = {
      ...base,
      type: apiType?.trim(),
      ...(newTaskForm.activityType !== 'MAINTENANCE' ? { activityCategory: apiType?.trim() } : {}),
    };

    // Adjuntar recurrencia si aplica
    if (newTaskForm.repeat) {
      maintenanceDataRaw.recurrence = {
        type: 'WEEKLY',
        daysOfWeek: newTaskForm.daysOfWeek,
        startDate: newTaskForm.startDate,
        endDate: newTaskForm.endDate,
        startTime: newTaskForm.startTime,
        endTime: newTaskForm.endTime,
        skipHolidays: !!newTaskForm.skipHolidays,
        skipConflicts: !!newTaskForm.skipConflicts,
      };
    }

    // Validar con Zod con manejo de errores amigable (sin regla global de fecha futura)
    let maintenanceData: any;
    try {
      maintenanceData = MaintenanceSchema.parse(maintenanceDataRaw);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const first = err.issues?.[0];
        const msg = first?.message || 'Datos inválidos. Revisa los campos.';
        showToast({ title: 'Error', message: msg, variant: 'error' });
        setIsSubmitting(false);
        return;
      }
      // Otros errores inesperados
      showToast({ title: 'Error', message: err?.message || 'Error validando datos', variant: 'error' });
      setIsSubmitting(false);
      return;
    }

    // Si es recurrente, validar y adjuntar recurrencia explícitamente (no dejar que Zod la elimine)
    let payloadToSend: any = maintenanceData;
    if (newTaskForm.repeat) {
      try {
        const recurrencePayload = RecurrenceSchema.parse({
          type: 'WEEKLY',
          daysOfWeek: newTaskForm.daysOfWeek,
          startDate: newTaskForm.startDate,
          endDate: newTaskForm.endDate,
          startTime: newTaskForm.startTime,
          endTime: newTaskForm.endTime,
          timezone: centerTz,
          skipHolidays: !!newTaskForm.skipHolidays,
          skipConflicts: !!newTaskForm.skipConflicts,
        });
        payloadToSend = { ...maintenanceData, recurrence: recurrencePayload };
      } catch (err: any) {
        const msg = err instanceof z.ZodError ? (err.issues?.[0]?.message || 'Recurrencia inválida') : (err?.message || 'Recurrencia inválida');
        showToast({ title: 'Error', message: msg, variant: 'error' });
        setIsSubmitting(false);
        return;
      }
    }

    console.log('🔍 [MAINTENANCE] Datos a enviar:', maintenanceData);
    console.log('🔍 [MAINTENANCE] Formulario completo:', newTaskForm);
    console.log('🔍 [MAINTENANCE] Fecha original:', newTaskForm.scheduledAt);
    console.log('🔍 [MAINTENANCE] Fecha convertida:', new Date(newTaskForm.scheduledAt).toISOString());
    console.log('🔍 [MAINTENANCE] Tipo de courtId:', typeof maintenanceData.courtId);
    console.log('🔍 [MAINTENANCE] Tipo de type:', typeof (maintenanceData as any).type);
    console.log('🔍 [MAINTENANCE] Tipo de description:', typeof maintenanceData.description);
    console.log('🔍 [MAINTENANCE] Tipo de scheduledAt:', typeof maintenanceData.scheduledAt);
    
    // Validaciones específicas ya las hace Zod
    
    try {
      await createMaintenanceRecord(payloadToSend as any);
      
      showToast({
        title: 'Éxito',
        message: 'Tarea de mantenimiento creada correctamente',
        variant: 'success'
      });
      
      handleCloseModal();
      
      // Recargar la lista de tareas
      await getMaintenanceRecords({ limit: 50 });
      
    } catch (error: any) {
      console.error('Error creating maintenance record:', error);
      const backendDetails = Array.isArray(error?.details) ? error.details.join(', ') : undefined;
      showToast({
        title: 'Error',
        message: backendDetails || error?.message || 'Error al crear la tarea de mantenimiento',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obtener canchas filtradas por centro
  const getCourtsByCenter = (centerId: string) => {
    return courts?.filter(court => court.centerId === centerId) || [];
  };

  // Función para iniciar mantenimiento
  const handleStartMaintenance = async (id: string) => {
    try {
      await startMaintenance(id);
      showToast({
        title: 'Éxito',
        message: 'Mantenimiento iniciado correctamente',
        variant: 'success'
      });
      await getMaintenanceRecords({ limit: 50 });
    } catch (error: any) {
      showToast({
        title: 'Error',
        message: error.message || 'Error al iniciar mantenimiento',
        variant: 'error'
      });
    }
  };

  // Función para completar mantenimiento
  const handleCompleteMaintenance = async (id: string) => {
    try {
      await completeMaintenance(id, {});
      showToast({
        title: 'Éxito',
        message: 'Mantenimiento completado correctamente',
        variant: 'success'
      });
      await getMaintenanceRecords({ limit: 50 });
    } catch (error: any) {
      showToast({
        title: 'Error',
        message: error.message || 'Error al completar mantenimiento',
        variant: 'error'
      });
    }
  };

  // Función para editar mantenimiento
  const handleEditMaintenance = (maintenance: any) => {
    setEditingMaintenance(maintenance);
    const maintTypes = new Set(['CLEANING','REPAIR','INSPECTION','RENOVATION']);
    const inferredActivityType = (() => {
      if (maintenance.activityType) return maintenance.activityType;
      const t = String(maintenance.type || '').toUpperCase();
      if (t && maintTypes.has(t)) return 'MAINTENANCE';
      if (maintenance.activityCategory) return 'TRAINING';
      return 'OTHER';
    })();
    setEditForm({
      type: inferredActivityType === 'MAINTENANCE' ? (maintenance.type || '') : '',
      activityType: maintenance.activityType || inferredActivityType,
      activityCategory: maintenance.activityCategory || (inferredActivityType !== 'MAINTENANCE' ? (maintenance.activityCategory || '') : ''),
      description: maintenance.description || '',
      // Mostrar en zona local para datetime-local
      scheduledAt: (() => {
        if (!maintenance.scheduledAt) return '';
        const d = new Date(maintenance.scheduledAt);
        const pad = (n: number) => String(n).padStart(2, '0');
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mi = pad(d.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
      })(),
      estimatedDuration: maintenance.estimatedDuration || 60,
      assignedTo: maintenance.assignedTo || '',
      instructor: maintenance.instructor || '',
      capacity: maintenance.capacity || '',
      requirements: maintenance.requirements || '',
      isPublic: maintenance.isPublic !== undefined ? maintenance.isPublic : true,
      cost: maintenance.cost || '',
      notes: maintenance.notes || '',
    });
    setShowEditModal(true);
  };

  // Función para guardar edición
  const handleSaveEdit = async () => {
    if (!editingMaintenance) return;
    
    try {
      setIsSubmitting(true);
      // Mapear scheduledAt a scheduledDate para el backend
      const { scheduledAt, ...restForm } = editForm;
      const updateData = {
        ...restForm,
        scheduledDate: editForm.scheduledAt,
      };
      
      await updateMaintenanceRecord(editingMaintenance.id, updateData);
      showToast({
        title: 'Éxito',
        message: 'Mantenimiento actualizado correctamente',
        variant: 'success'
      });
      await getMaintenanceRecords({ limit: 50 });
      setShowEditModal(false);
      setEditingMaintenance(null);
    } catch (error: any) {
      showToast({
        title: 'Error',
        message: error.message || 'Error al actualizar el mantenimiento',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para eliminar mantenimiento
  const handleDeleteMaintenance = (maintenance: any) => {
    setDeletingMaintenance(maintenance);
    setShowDeleteDialog(true);
  };

  // Función para confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!deletingMaintenance) return;
    
    try {
      setIsSubmitting(true);
      await deleteMaintenanceRecord(deletingMaintenance.id);
      showToast({
        title: 'Éxito',
        message: 'Mantenimiento eliminado correctamente',
        variant: 'success'
      });
      await getMaintenanceRecords({ limit: 50 });
      setShowDeleteDialog(false);
      setDeletingMaintenance(null);
    } catch (error: any) {
      showToast({
        title: 'Error',
        message: error.message || 'Error al eliminar el mantenimiento',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Instalaciones</h1>
            <p className="text-gray-600">Gestión de mantenimiento, entrenamientos, clases y eventos</p>
          </div>
        </div>
        <button 
          onClick={handleNewTask}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tareas Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{maintenanceRecords?.filter(r => (r as any).status === 'SCHEDULED').length || 0}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Progreso</p>
              <p className="text-2xl font-bold text-gray-900">{maintenanceRecords?.filter(r => (r as any).status === 'IN_PROGRESS').length || 0}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <ClockIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completadas</p>
              <p className="text-2xl font-bold text-gray-900">{maintenanceRecords?.filter(r => (r as any).status === 'COMPLETED').length || 0}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tareas</p>
              <p className="text-2xl font-bold text-gray-900">{maintenanceRecords?.length || 0}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <WrenchScrewdriverIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Tareas de Instalaciones</h2>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={groupBySeries}
              onChange={(e) => setGroupBySeries(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Agrupar por serie
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarea
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Serie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Instalación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prioridad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asignado a
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Límite
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duración
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">Cargando...</td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-red-600">{String(error)}</td>
                </tr>
              )}
              {!loading && !error && (recordsToRender || []).map((record: any) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      record.activityType === 'MAINTENANCE' ? 'bg-blue-100 text-blue-800' :
                      record.activityType === 'TRAINING' ? 'bg-green-100 text-green-800' :
                      record.activityType === 'CLASS' ? 'bg-purple-100 text-purple-800' :
                      record.activityType === 'WARMUP' ? 'bg-orange-100 text-orange-800' :
                      record.activityType === 'EVENT' ? 'bg-pink-100 text-pink-800' :
                      record.activityType === 'MEETING' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {record.activityType === 'MAINTENANCE' ? 'Mantenimiento' :
                       record.activityType === 'TRAINING' ? 'Entrenamiento' :
                       record.activityType === 'CLASS' ? 'Clase' :
                       record.activityType === 'WARMUP' ? 'Calentamiento' :
                       record.activityType === 'EVENT' ? 'Evento' :
                       record.activityType === 'MEETING' ? 'Reunión' :
                       'Otro'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{record.title}</div>
                      <div className="text-sm text-gray-500">{record.description}</div>
                      {record.activityCategory && (
                        <div className="text-xs text-blue-600 mt-1">
                          {record.activityCategory}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.seriesId ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800" title="Actividad recurrente">
                        Recurrente{record.__seriesCount ? ` · ${record.__seriesCount}` : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.court?.name || '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(record.priority)}`}>
                      {formatPriority(record.priority)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(record.status)}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                        {(() => {
                          switch ((record.status || '').toUpperCase()) {
                            case 'COMPLETED': return 'Completada';
                            case 'IN_PROGRESS': return 'En Progreso';
                            case 'SCHEDULED': return 'Programada';
                            case 'CANCELLED': return 'Cancelada';
                            default: return '—';
                          }
                        })()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.assignedUser ? `${record.assignedUser.firstName || ''} ${record.assignedUser.lastName || ''}`.trim() || record.assignedUser.email : '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate((record as any).scheduledAt || (record as any).scheduledDate)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDuration(record.estimatedDuration)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {record.status === 'SCHEDULED' && (
                        <button
                          onClick={() => handleStartMaintenance(record.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Iniciar
                        </button>
                      )}
                      {record.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleCompleteMaintenance(record.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Completar
                        </button>
                      )}
                      {record.status !== 'COMPLETED' && (
                        <>
                          <button
                            onClick={() => handleEditMaintenance(record)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            title="Editar mantenimiento"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMaintenance(record)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            title="Eliminar mantenimiento"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Nueva Tarea de Mantenimiento */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            {/* Header móvil */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">Nueva Tarea de Mantenimiento</h2>
                <button 
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmitNewTask} className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Información básica */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Centro Deportivo *
                  </label>
                  <select
                    value={selectedCenterId}
                    onChange={(e) => {
                      const centerId = e.target.value;
                      setSelectedCenterId(centerId);
                      setNewTaskForm(prev => ({ ...prev, courtId: '' }));
                    }}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    required
                  >
                    <option value="">Selecciona un centro</option>
                    {centers?.map((center) => (
                      <option key={center.id} value={center.id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cancha *
                  </label>
                  <select
                    value={newTaskForm.courtId}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, courtId: e.target.value }))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    required
                    disabled={!selectedCenterId}
                  >
                    <option value="">Selecciona una cancha</option>
                    {getCourtsByCenter(selectedCenterId).map((court) => (
                      <option key={court.id} value={court.id}>
                        {court.name} - {court.type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Actividad *
                    </label>
                    <select
                      value={newTaskForm.activityType}
                      onChange={(e) => {
                        const newActivityType = e.target.value;
                        setNewTaskForm(prev => ({ 
                          ...prev, 
                          activityType: newActivityType,
                          activityCategory: '', // Reset category when activity type changes
                          type: newActivityType === 'MAINTENANCE' ? prev.type : '' // Reset type if not maintenance
                        }));
                      }}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      required
                    >
                      <option value="MAINTENANCE">Mantenimiento</option>
                      <option value="TRAINING">Entrenamiento</option>
                      <option value="CLASS">Clase</option>
                      <option value="WARMUP">Calentamiento</option>
                      <option value="EVENT">Evento</option>
                      <option value="MEETING">Reunión</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {getCategoryFieldLabel(newTaskForm.activityType)} *
                    </label>
                    <select
                      value={newTaskForm.activityType === 'MAINTENANCE' ? newTaskForm.type : newTaskForm.activityCategory}
                      onChange={(e) => {
                        if (newTaskForm.activityType === 'MAINTENANCE') {
                          setNewTaskForm(prev => ({ ...prev, type: e.target.value }));
                        } else {
                          setNewTaskForm(prev => ({ ...prev, activityCategory: e.target.value }));
                        }
                      }}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      required
                    >
                      <option value="">Selecciona una opción</option>
                      {getCategoryOptions(newTaskForm.activityType).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo Estimado (€)
                  </label>
                  <input
                    type="number"
                    value={newTaskForm.cost}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, cost: e.target.value }))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción *
                </label>
                <textarea
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  rows={3}
                  placeholder="Describe detalladamente la tarea de mantenimiento a realizar..."
                  required
                />
              </div>

              {/* Recurrencia */}
              <div className="border-t pt-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="block text-sm font-medium text-gray-700">Tipo de programación</span>
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold rounded-full bg-gray-200 text-gray-700 cursor-help"
                      title={
                        'Única: usa “Fecha y Hora Programada” y “Duración”.\n' +
                        'Recurrente: crea ocurrencias entre “Desde/Hasta” solo en los días seleccionados y con la franja “Hora inicio/fin”.\n' +
                        'Debes seleccionar al menos un día. Las ocurrencias creadas bloquean el calendario.\n' +
                        '“Omitir cierres” y “Omitir solapes” solo afectan la creación (se recomienda dejarlos activados).'
                      }
                      aria-label="Ayuda sobre tipo de programación"
                    >
                      ?
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="scheduleType"
                        value="single"
                        checked={!newTaskForm.repeat}
                        onChange={()=> setNewTaskForm(prev=>({ ...prev, repeat: false }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">Única (una fecha)</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="scheduleType"
                        value="recurring"
                        checked={newTaskForm.repeat}
                        onChange={()=> setNewTaskForm(prev=>({ ...prev, repeat: true }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">Recurrente (semanal)</span>
                    </label>
                  </div>
                </div>
                {newTaskForm.repeat && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
                        <input type="date" value={newTaskForm.startDate} onChange={(e)=>setNewTaskForm(prev=>({ ...prev, startDate: e.target.value }))} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
                        <input type="date" value={newTaskForm.endDate} onChange={(e)=>setNewTaskForm(prev=>({ ...prev, endDate: e.target.value }))} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Días</label>
                        <div className="grid grid-cols-7 gap-1">
                          {['L','M','X','J','V','S','D'].map((d,idx)=>{
                            const val = idx+1; // 1..7
                            const on = newTaskForm.daysOfWeek.includes(val);
                            return (
                              <button type="button" key={val} onClick={()=>{
                                  setNewTaskForm(prev=>({ ...prev, daysOfWeek: on ? prev.daysOfWeek.filter(x=>x!==val) : [...prev.daysOfWeek, val] }));
                                }}
                                className={`px-2 py-2 rounded border ${on? 'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300'}`}
                              >{d}</button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hora inicio</label>
                        <input type="time" value={newTaskForm.startTime} onChange={handleTimeChange('startTime')} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hora fin</label>
                        <input type="time" value={newTaskForm.endTime} onChange={handleTimeChange('endTime')} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base" />
                      </div>
                      <div className="flex items-center gap-6 mt-7">
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={newTaskForm.skipHolidays} onChange={(e)=>setNewTaskForm(prev=>({ ...prev, skipHolidays: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm text-gray-700">Omitir cierres del centro</span></label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={newTaskForm.skipConflicts} onChange={(e)=>setNewTaskForm(prev=>({ ...prev, skipConflicts: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm text-gray-700">Omitir solapes</span></label>
                      </div>
                    </div>
                    {recurrenceTotal > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-900 mb-2">Previsualización ({recurrenceTotal} ocurrencias)</div>
                        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                          {recurrencePreview.map((it, idx) => (
                            <li key={idx}>{it}</li>
                          ))}
                          {recurrenceTotal > recurrencePreview.length && (
                            <li>… y {recurrenceTotal - recurrencePreview.length} más</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!newTaskForm.repeat && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha y Hora Programada *
                    </label>
                    <input
                      type="datetime-local"
                      value={newTaskForm.scheduledAt}
                      onChange={(e) => setNewTaskForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      required={!newTaskForm.repeat}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duración Estimada (minutos) *
                    </label>
                    <input
                      type="number"
                      value={newTaskForm.estimatedDuration}
                      onChange={(e) => setNewTaskForm(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 60 }))}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      min="15"
                      max="480"
                      step="15"
                      required={!newTaskForm.repeat}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Duración en minutos (15-480 min)
                    </p>
                  </div>
                </div>
              )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Asignado a (Técnico)
                    </label>
                    <input
                      type="text"
                      value={newTaskForm.assignedTo}
                      onChange={(e) => setNewTaskForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="Nombre o email del técnico (opcional)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Si no existe un ID de técnico, se registrará en notas como asignación manual.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instructor/Responsable
                    </label>
                    <input
                      type="text"
                      value={newTaskForm.instructor}
                      onChange={(e) => setNewTaskForm(prev => ({ ...prev, instructor: e.target.value }))}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="Nombre del instructor o responsable"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Capacidad (participantes)
                    </label>
                    <input
                      type="number"
                      value={newTaskForm.capacity}
                      onChange={(e) => setNewTaskForm(prev => ({ ...prev, capacity: e.target.value }))}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="Número de participantes"
                      min="1"
                      max="1000"
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newTaskForm.isPublic}
                        onChange={(e) => setNewTaskForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Actividad Pública</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requerimientos Especiales
                  </label>
                  <textarea
                    value={newTaskForm.requirements}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, requirements: e.target.value }))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    rows={2}
                    placeholder="Equipamiento especial, materiales, etc."
                  />
                </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  value={newTaskForm.notes}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  rows={2}
                  placeholder="Notas adicionales sobre la tarea de mantenimiento..."
                />
              </div>

              {/* Botones */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 -mx-4 md:-mx-6 px-4 md:px-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full sm:w-auto px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (newTaskForm.repeat && (!newTaskForm.startDate || !newTaskForm.endDate || newTaskForm.daysOfWeek.length === 0 || (newTaskForm.startTime || '') >= (newTaskForm.endTime || '')))}
                    className="w-full sm:w-auto px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creando...
                      </div>
                    ) : (
                      'Crear Tarea'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edición de Mantenimiento */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                  Editar Mantenimiento
                  {editingMaintenance?.seriesId && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800" title="Esta tarea pertenece a una serie (recurrente)">Recurrente</span>
                  )}
                </h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Actividad *
                  </label>
                  <select
                    value={editForm.activityType}
                    onChange={(e) => {
                      const newActivityType = e.target.value;
                      setEditForm(prev => ({ 
                        ...prev, 
                        activityType: newActivityType,
                        activityCategory: '', // Reset category when activity type changes
                        type: newActivityType === 'MAINTENANCE' ? prev.type : '' // Reset type if not maintenance
                      }));
                    }}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    required
                  >
                    <option value="MAINTENANCE">Mantenimiento</option>
                    <option value="TRAINING">Entrenamiento</option>
                    <option value="CLASS">Clase</option>
                    <option value="WARMUP">Calentamiento</option>
                    <option value="EVENT">Evento</option>
                    <option value="MEETING">Reunión</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {getCategoryFieldLabel(editForm.activityType)} *
                  </label>
                  <select
                    value={editForm.activityType === 'MAINTENANCE' ? editForm.type : editForm.activityCategory}
                    onChange={(e) => {
                      if (editForm.activityType === 'MAINTENANCE') {
                        setEditForm(prev => ({ ...prev, type: e.target.value }));
                      } else {
                        setEditForm(prev => ({ ...prev, activityCategory: e.target.value }));
                      }
                    }}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    required
                  >
                    <option value="">Selecciona una opción</option>
                    {getCategoryOptions(editForm.activityType).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha y Hora Programada *
                </label>
                <input
                  type="datetime-local"
                  value={editForm.scheduledAt}
                  onChange={(e) => setEditForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción *
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duración Estimada (minutos) *
                  </label>
                  <input
                    type="number"
                    value={editForm.estimatedDuration}
                    onChange={(e) => setEditForm(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 60 }))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    min="15"
                    max="480"
                    step="15"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Duración en minutos (15-480 min)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo Estimado (€)
                  </label>
                  <input
                    type="number"
                    value={editForm.cost}
                    onChange={(e) => setEditForm(prev => ({ ...prev, cost: e.target.value }))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asignado a (Técnico)
                </label>
                <input
                  type="text"
                  value={editForm.assignedTo}
                  onChange={(e) => setEditForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="Próximamente disponible"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Asignación de técnicos estará disponible próximamente
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  rows={2}
                  placeholder="Información adicional sobre el mantenimiento..."
                />
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-full sm:w-auto px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </div>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación de Eliminación */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Confirmar Eliminación</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                ¿Estás seguro de que quieres eliminar este mantenimiento? Esta acción no se puede deshacer.
              </p>
              {deletingMaintenance && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-gray-900">{deletingMaintenance.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(deletingMaintenance.scheduledAt)}
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Eliminando...
                  </div>
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}