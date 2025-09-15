'use client';

import { useEffect, useState } from 'react';
import { useAdminMaintenance, useAdminCourts, useAdminCenters } from '@/lib/hooks';
import { useToast } from '@/components/ToastProvider';
import {
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function MaintenancePage() {
  const {
    maintenanceRecords,
    loading,
    error,
    getMaintenanceRecords,
    createMaintenanceRecord,
    startMaintenance,
    completeMaintenance,
  } = useAdminMaintenance();
  
  const { courts, getCourts } = useAdminCourts();
  const { centers, getCenters } = useAdminCenters();
  const { showToast } = useToast();

  // Estado para el modal de nueva tarea
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [newTaskForm, setNewTaskForm] = useState({
    courtId: '',
    type: '',
    description: '',
    scheduledAt: '',
    estimatedDuration: 60,
    assignedTo: '',
    cost: '',
    notes: '',
  });

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
    setNewTaskForm({
      courtId: '',
      type: '',
      description: '',
      scheduledAt: new Date().toISOString().slice(0, 16),
      estimatedDuration: 60,
      assignedTo: '',
      cost: '',
      notes: '',
    });
    setSelectedCenterId('');
    setShowNewTaskModal(true);
  };

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setShowNewTaskModal(false);
    setNewTaskForm({
      courtId: '',
      type: '',
      description: '',
      scheduledAt: '',
      estimatedDuration: 60,
      assignedTo: '',
      cost: '',
      notes: '',
    });
    setSelectedCenterId('');
  };

  // Función para manejar el envío del formulario
  const handleSubmitNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTaskForm.courtId || !newTaskForm.type || !newTaskForm.description || !newTaskForm.scheduledAt) {
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

    setIsSubmitting(true);
    
    // Preparar datos para envío
    const scheduledDate = new Date(newTaskForm.scheduledAt);
    const maintenanceData = {
      courtId: newTaskForm.courtId,
      type: newTaskForm.type,
      description: newTaskForm.description,
      scheduledAt: scheduledDate.toISOString(), // Asegurar formato ISO 8601
      // assignedTo debe ser un UUID válido, no un email
      // Por ahora lo omitimos hasta implementar la búsqueda de usuarios
      // assignedTo: newTaskForm.assignedTo || undefined,
      cost: newTaskForm.cost ? parseFloat(newTaskForm.cost) : undefined,
      estimatedDuration: newTaskForm.estimatedDuration,
      notes: newTaskForm.notes || undefined,
    };

    console.log('🔍 [MAINTENANCE] Datos a enviar:', maintenanceData);
    console.log('🔍 [MAINTENANCE] Formulario completo:', newTaskForm);
    console.log('🔍 [MAINTENANCE] Fecha original:', newTaskForm.scheduledAt);
    console.log('🔍 [MAINTENANCE] Fecha convertida:', new Date(newTaskForm.scheduledAt).toISOString());
    console.log('🔍 [MAINTENANCE] Tipo de courtId:', typeof maintenanceData.courtId);
    console.log('🔍 [MAINTENANCE] Tipo de type:', typeof maintenanceData.type);
    console.log('🔍 [MAINTENANCE] Tipo de description:', typeof maintenanceData.description);
    console.log('🔍 [MAINTENANCE] Tipo de scheduledAt:', typeof maintenanceData.scheduledAt);
    
    // Validar que courtId sea un CUID válido (formato Prisma)
    const cuidRegex = /^c[0-9a-z]{24}$/i;
    if (!cuidRegex.test(maintenanceData.courtId)) {
      console.error('❌ [MAINTENANCE] courtId no es un CUID válido:', maintenanceData.courtId);
      showToast({
        title: 'Error',
        message: 'ID de cancha inválido',
        variant: 'error'
      });
      return;
    }
    
    // Validar que la fecha sea válida
    if (isNaN(scheduledDate.getTime())) {
      console.error('❌ [MAINTENANCE] Fecha inválida:', maintenanceData.scheduledAt);
      showToast({
        title: 'Error',
        message: 'Fecha programada inválida',
        variant: 'error'
      });
      return;
    }
    
    // Validar formato datetime de Zod (debe ser ISO 8601 con Z o timezone)
    const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!datetimeRegex.test(maintenanceData.scheduledAt)) {
      console.error('❌ [MAINTENANCE] Formato datetime inválido para Zod:', maintenanceData.scheduledAt);
      showToast({
        title: 'Error',
        message: 'Formato de fecha inválido',
        variant: 'error'
      });
      return;
    }
    
    try {
      await createMaintenanceRecord(maintenanceData);
      
      showToast({
        title: 'Éxito',
        message: 'Tarea de mantenimiento creada correctamente',
        variant: 'success'
      });
      
      handleCloseModal();
      
      // Recargar la lista de tareas
      await getMaintenanceRecords({ limit: 50 });
      
    } catch (error) {
      console.error('Error creating maintenance record:', error);
      showToast({
        title: 'Error',
        message: 'Error al crear la tarea de mantenimiento',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mantenimiento</h1>
            <p className="text-gray-600">Gestión de tareas de mantenimiento de instalaciones</p>
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
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Tareas de Mantenimiento</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarea
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
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Cargando...</td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-red-600">{String(error)}</td>
                </tr>
              )}
              {!loading && !error && (maintenanceRecords || []).map((record: any) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{record.title}</div>
                      <div className="text-sm text-gray-500">{record.description}</div>
                    </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Mantenimiento *
                  </label>
                  <select
                    value={newTaskForm.type}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    required
                  >
                    <option value="">Selecciona el tipo</option>
                    <option value="CLEANING">Limpieza</option>
                    <option value="REPAIR">Reparación</option>
                    <option value="INSPECTION">Inspección</option>
                    <option value="RENOVATION">Renovación</option>
                  </select>
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
                    required
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
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Duración en minutos (15-480 min)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asignado a (Técnico)
                </label>
                <input
                  type="text"
                  value={newTaskForm.assignedTo}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, assignedTo: e.target.value }))}
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
                    disabled={isSubmitting}
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
    </div>
  );
}