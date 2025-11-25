'use client';

import { useState, useEffect, useRef } from 'react';
import {
  RectangleStackIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAdminCourts, useAdminCenters } from '@/lib/hooks';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';

interface Court {
  id: string;
  name: string;
  type: 'FOOTBALL7' | 'PADDLE' | 'TENNIS' | 'FUTSAL' | 'BASKETBALL' | 'VOLLEYBALL' | 'MULTIPURPOSE';
  centerId: string;
  centerName: string;
  description: string;
  hourlyRate: number;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
  features: string[];
  dimensions: string;
  surface: string;
  lighting: boolean;
  lightingExtraPerHour?: number;
  covered: boolean;
  createdAt: string;
  isMultiuse?: boolean;
  allowedSports?: string[];
  primarySport?: string;
}




const typeColors: Record<string, string> = {
  FOOTBALL7: 'bg-green-100 text-green-800',
  PADDLE: 'bg-teal-100 text-teal-800',
  TENNIS: 'bg-yellow-100 text-yellow-800',
  FUTSAL: 'bg-emerald-100 text-emerald-800',
  BASKETBALL: 'bg-orange-100 text-orange-800',
  VOLLEYBALL: 'bg-purple-100 text-purple-800',
  MULTIPURPOSE: 'bg-blue-100 text-blue-800'
};

const typeLabels: Record<string, string> = {
  FOOTBALL7: 'Fútbol 7',
  PADDLE: 'Pádel',
  TENNIS: 'Tenis',
  FUTSAL: 'Fútbol Sala / Balonmano',
  BASKETBALL: 'Baloncesto',
  VOLLEYBALL: 'Voleibol',
  MULTIPURPOSE: 'Multiusos'
};

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  OCCUPIED: 'bg-red-100 text-red-800',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800',
  INACTIVE: 'bg-gray-100 text-gray-800'
};

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Disponible',
  OCCUPIED: 'Ocupada',
  MAINTENANCE: 'Mantenimiento',
  INACTIVE: 'Inactiva'
};

export default function CourtsPage() {
  const { courts, loading, error, getCourts, createCourt, updateCourt, deleteCourt } = useAdminCourts();
  const { centers, getCenters } = useAdminCenters();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [centerFilter, setCenterFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Estado para el modal de confirmación de eliminación
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState<{ id: string; name: string } | null>(null);

  // Estado para el modal de edición
  const [showEdit, setShowEdit] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [editForm, setEditForm] = useState<Partial<Court>>({});

  // Estado para el modal de visualización
  const [showView, setShowView] = useState(false);
  const [viewingCourt, setViewingCourt] = useState<Court | null>(null);

  const itemsPerPage = 8;

  // Modal crear cancha
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    centerId: '',
    sport: 'FOOTBALL7',
    surface: 'synthetic',
    isIndoor: false,
    hasLighting: true,
    lightingExtraPerHour: 0,
    maxPlayers: 10,
    hourlyRate: 20000,
    isMultiuse: false,
    allowedSports: [] as string[],
  });

  // Cargar datos al montar el componente (guard reentrada StrictMode)
  const didLoadRef = useRef(false);
  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    console.log('[CourtsPage] useEffect running for initial data load.');
    getCourts({}).catch(() => { });
    getCenters({}).catch(() => { });
  }, [getCourts, getCenters]);

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
              Error al cargar las canchas
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Obtener centros únicos para el filtro
  const safeCourts = Array.isArray(courts) ? courts : [];
  const uniqueCenters = Array.from(new Set(safeCourts.map((court: any) => court.centerName)));

  // Filtrar canchas
  const filteredCourts = safeCourts.filter((court: any) => {
    const matchesSearch =
      court.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      court.centerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      court.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || court.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || court.status === statusFilter;
    const matchesCenter = centerFilter === 'ALL' || court.centerName === centerFilter;

    return matchesSearch && matchesType && matchesStatus && matchesCenter;
  }) || [];

  // Paginación
  const totalPages = Math.ceil(filteredCourts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCourts = filteredCourts.slice(startIndex, startIndex + itemsPerPage);

  const handleDeleteCourt = (court: Court) => {
    setCourtToDelete({ id: court.id, name: court.name });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteCourt = async () => {
    if (!courtToDelete) return;

    try {
      await deleteCourt(courtToDelete.id);
      toast.success(`Cancha "${courtToDelete.name}" eliminada exitosamente`);
      setDeleteConfirmOpen(false);
      setCourtToDelete(null);
    } catch (error) {
      console.error('Error al eliminar cancha:', error);
      toast.error('Error al eliminar la cancha. Por favor, inténtalo de nuevo.');
    }
  };

  const cancelDeleteCourt = () => {
    setDeleteConfirmOpen(false);
    setCourtToDelete(null);
  };

  const handleViewCourt = (court: Court) => {
    setViewingCourt(court);
    setShowView(true);
  };

  const handleEditCourt = (court: Court) => {
    setEditingCourt(court);

    // 🔍 DEBUG: Log de datos recibidos
    console.log('🔍 [DEBUG] Datos de la cancha recibidos:', {
      name: court.name,
      lighting: court.lighting,
      lightingExtraPerHour: court.lightingExtraPerHour,
      court: court
    });

    // Poblar el estado del formulario de edición con los datos de la cancha seleccionada
    const formData = {
      name: court.name,
      type: court.type, // ✅ Agregar el deporte
      hourlyRate: court.hourlyRate,
      status: court.status,
      isMultiuse: court.isMultiuse ?? false,
      allowedSports: (court.allowedSports ?? []) as any,
      primarySport: (court as any).primarySport || null,
      lighting: court.lighting as any,
      lightingExtraPerHour: court.lightingExtraPerHour ?? undefined,
      // Se pueden añadir aquí todos los demás campos editables
    };

    // 🔍 DEBUG: Log de datos del formulario
    console.log('🔍 [DEBUG] Datos del formulario:', {
      lighting: formData.lighting,
      lightingExtraPerHour: formData.lightingExtraPerHour,
      formData: formData
    });

    setEditForm(formData);
    setShowEdit(true);
  };

  const handleUpdateCourt = async () => {
    if (!editingCourt || !editForm) return;

    try {
      setIsLoading(true);

      // Preparar datos asegurando que primarySport siempre se incluya si la cancha es multiuso
      const dataToSend = { ...editForm };
      if ((editForm as any).isMultiuse) {
        // Si es multiuso, siempre incluir primarySport explícitamente
        // Esto asegura que el valor seleccionado se envíe correctamente al backend
        dataToSend.primarySport = (editForm as any).primarySport || null;
      } else {
        // Si no es multiuso, limpiar primarySport
        dataToSend.primarySport = undefined;
      }

      console.log('🔍 [HANDLE-UPDATE] Datos a enviar:', {
        courtId: editingCourt.id,
        isMultiuse: (dataToSend as any).isMultiuse,
        primarySport: (dataToSend as any).primarySport,
        primarySportType: typeof (dataToSend as any).primarySport,
        allowedSports: (dataToSend as any).allowedSports,
        fullData: dataToSend
      });

      await updateCourt(editingCourt.id, dataToSend);
      toast.success(`Cancha "${editForm.name || editingCourt.name}" actualizada exitosamente.`);
      setShowEdit(false);
      setEditingCourt(null);
    } catch (error) {
      console.error('Error al actualizar la cancha:', error);
      toast.error('Error al actualizar la cancha. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = courts?.reduce((sum, court) => sum + court.hourlyRate, 0) || 0;
  const averageRate = (courts?.length || 0) > 0 ? totalRevenue / (courts?.length || 1) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <RectangleStackIcon className="h-8 w-8 mr-3 text-blue-600" />
            Gestión de Canchas
          </h1>
          <p className="mt-2 text-gray-600">
            Administra las canchas deportivas del polideportivo
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <PlusIcon className="h-4 w-4 mr-2" />
            Nueva Cancha
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <RectangleStackIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Canchas</p>
              <p className="text-2xl font-semibold text-gray-900">{courts?.length || 0}</p>
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
              <p className="text-sm font-medium text-gray-500">Disponibles</p>
              <p className="text-2xl font-semibold text-gray-900">
                {courts?.filter(c => c.status === 'AVAILABLE').length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tarifa Promedio</p>
              <p className="text-2xl font-semibold text-gray-900">
                €{averageRate.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-red-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">En Uso</p>
              <p className="text-2xl font-semibold text-gray-900">
                {courts?.filter(c => c.status === 'OCCUPIED').length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Crear Cancha */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl text-gray-900">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Nueva Cancha</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nombre</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2 text-gray-900 placeholder:text-gray-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Centro</label>
                <select value={form.centerId} onChange={(e) => setForm({ ...form, centerId: e.target.value })} className="w-full border rounded px-3 py-2 text-gray-900">
                  <option value="">Selecciona un centro</option>
                  {Array.isArray(centers) ? centers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  )) : null}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Deporte</label>
                  <select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} className="w-full border rounded px-3 py-2 text-gray-900">
                    <option value="FOOTBALL7">Fútbol 7</option>
                    <option value="PADDLE">Pádel</option>
                    <option value="TENNIS">Tenis</option>
                    <option value="FUTSAL">Fútbol Sala / Balonmano</option>
                    <option value="BASKETBALL">Baloncesto</option>
                    <option value="VOLLEYBALL">Voleibol</option>
                    <option value="MULTIPURPOSE">Multiusos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Multiuso</label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={(form as any).isMultiuse || false} onChange={(e) => setForm({ ...form, isMultiuse: e.target.checked, allowedSports: e.target.checked ? ((form as any).allowedSports || []) : [] })} />
                    Habilitar
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Superficie</label>
                  <input value={form.surface} onChange={(e) => setForm({ ...form, surface: e.target.value })} className="w-full border rounded px-3 py-2 text-gray-900 placeholder:text-gray-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isIndoor} onChange={(e) => setForm({ ...form, isIndoor: e.target.checked })} /> Cubierta</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.hasLighting} onChange={(e) => setForm({ ...form, hasLighting: e.target.checked })} /> Iluminación</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Máx. jugadores</label>
                  <input
                    type="number"
                    min={1}
                    value={(form as any).maxPlayers}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, maxPlayers: v === '' ? ('' as any) : Number(v) });
                    }}
                    className="w-full border rounded px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Precio por hora</label>
                  <input
                    type="number"
                    min={0}
                    value={(form as any).hourlyRate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, hourlyRate: v === '' ? ('' as any) : Number(v) });
                    }}
                    className="w-full border rounded px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
              {form.hasLighting && (
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Precio adicional iluminación (por hora)</label>
                  <input
                    type="number"
                    min={0}
                    value={(form as any).lightingExtraPerHour ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, lightingExtraPerHour: v === '' ? ('' as any) : Number(v) });
                    }}
                    className="w-full border rounded px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              )}
              {((form as any).isMultiuse) && (
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Deportes permitidos</label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {['FOOTBALL7', 'PADDLE', 'TENNIS', 'FUTSAL', 'BASKETBALL', 'VOLLEYBALL'].map((code) => (
                      <label key={code} className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(((form as any).allowedSports || []) as string[]).includes(code)}
                          onChange={(e) => {
                            const current = new Set<string>(((form as any).allowedSports || []) as string[]);
                            if (e.target.checked) current.add(code); else current.delete(code);
                            setForm({ ...form, allowedSports: Array.from(current) as any });
                          }}
                        />
                        {typeLabels[code] || code}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded">Cancelar</button>
              <button
                onClick={async () => {
                  if (!form.name || !form.centerId) return;
                  // Normalizar números antes de enviar
                  const maxPlayers = Number(((form as any).maxPlayers === '' ? 0 : (form as any).maxPlayers) || 0);
                  const hourlyRate = Number(((form as any).hourlyRate === '' ? 0 : (form as any).hourlyRate) || 0);
                  const lightingExtraPerHour = Number((((form as any).lightingExtraPerHour === '' ? 0 : (form as any).lightingExtraPerHour) || 0));
                  await createCourt({
                    name: form.name,
                    centerId: form.centerId,
                    sport: form.sport,
                    surface: form.surface,
                    isIndoor: form.isIndoor,
                    hasLighting: form.hasLighting,
                    lightingExtraPerHour,
                    maxPlayers: maxPlayers as any,
                    hourlyRate: hourlyRate as any,
                    isMultiuse: (form as any).isMultiuse || false,
                    allowedSports: (form as any).isMultiuse ? (((form as any).allowedSports || []) as string[]) : [],
                  });
                  setShowCreate(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Cancha (Componente Controlado) */}
      {showEdit && editingCourt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Editar Cancha: {editingCourt.name}</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto text-gray-900">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deporte</label>
                <select
                  value={editForm.type || ''}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value as Court['type'] })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="FOOTBALL7">Fútbol 7</option>
                  <option value="PADDLE">Pádel</option>
                  <option value="TENNIS">Tenis</option>
                  <option value="FUTSAL">Fútbol Sala / Balonmano</option>
                  <option value="BASKETBALL">Baloncesto</option>
                  <option value="VOLLEYBALL">Voleibol</option>
                  <option value="MULTIPURPOSE">Multiusos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa por Hora (€)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.hourlyRate ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditForm({
                      ...editForm,
                      hourlyRate: value === '' ? undefined : Number(value)
                    });
                  }}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={editForm.status || ''}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Court['status'] })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="AVAILABLE">Disponible</option>
                  <option value="MAINTENANCE">Mantenimiento</option>
                  <option value="INACTIVE">Inactiva</option>
                </select>
              </div>
              {/* Iluminación y extra */}
              <div className="grid grid-cols-2 gap-4">
                <label className="inline-flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean((editForm as any).lighting)}
                    onChange={(e) => setEditForm({ ...editForm, lighting: e.target.checked as any })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  Iluminación
                </label>
                {(editForm as any).lighting && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio adicional iluminación (por hora)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={editForm.lightingExtraPerHour ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log('🔍 [DEBUG] Input onChange:', {
                          oldValue: editForm.lightingExtraPerHour,
                          newValue: value
                        });
                        setEditForm({
                          ...editForm,
                          lightingExtraPerHour: value === '' ? undefined : Number(value)
                        });
                      }}
                      onFocus={() => {
                        console.log('🔍 [DEBUG] Input onFocus:', {
                          currentValue: editForm.lightingExtraPerHour,
                          editForm: editForm
                        });
                      }}
                      placeholder="0.00"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Multiuso</label>
                <label className="inline-flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean((editForm as any).isMultiuse)}
                    onChange={(e) => setEditForm({ ...editForm, isMultiuse: e.target.checked, allowedSports: e.target.checked ? ((editForm as any).allowedSports || []) : [] })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  Habilitar
                </label>
              </div>
              {Boolean((editForm as any).isMultiuse) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deportes permitidos</label>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {['FOOTBALL7', 'PADDLE', 'TENNIS', 'FUTSAL', 'BASKETBALL', 'VOLLEYBALL'].map((code) => (
                        <label key={code} className="inline-flex items-center gap-2 text-gray-700">
                          <input
                            type="checkbox"
                            checked={Array.isArray((editForm as any).allowedSports) ? ((editForm as any).allowedSports as string[]).includes(code) : false}
                            onChange={(e) => {
                              const current = new Set<string>(Array.isArray((editForm as any).allowedSports) ? (((editForm as any).allowedSports) as string[]) : []);
                              if (e.target.checked) current.add(code); else current.delete(code);
                              setEditForm({ ...editForm, allowedSports: Array.from(current) as any });
                            }}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          {typeLabels[code] || code}
                        </label>
                      ))}
                    </div>
                  </div>
                  {Array.isArray((editForm as any).allowedSports) && ((editForm as any).allowedSports as string[]).length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deporte principal</label>
                      <select
                        value={(editForm as any).primarySport || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Siempre establecer el valor, incluso si está vacío (se enviará como null)
                          setEditForm({
                            ...editForm,
                            primarySport: value === '' ? undefined : value
                          });
                          console.log('🔍 [EDIT-FORM] primarySport cambiado:', {
                            value,
                            result: value === '' ? null : value,
                            editFormPrimarySport: (editForm as any).primarySport
                          });
                        }}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seleccionar deporte principal</option>
                        {Array.isArray((editForm as any).allowedSports) && ((editForm as any).allowedSports as string[]).map((code: string) => (
                          <option key={code} value={code}>
                            {typeLabels[code] || code}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        El deporte principal bloquea todos los demás deportes cuando está reservado.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateCourt}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Cancha */}
      {showView && viewingCourt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Detalles de la Cancha</h3>
              <button
                onClick={() => setShowView(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header con nombre y badges */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">{viewingCourt.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${typeColors[viewingCourt.type]
                      }`}>
                      {typeLabels[viewingCourt.type]}
                    </span>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusColors[viewingCourt.status]
                      }`}>
                      {statusLabels[viewingCourt.status]}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">
                    €{Number(viewingCourt.hourlyRate || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">por hora</div>
                </div>
              </div>

              {/* Información del centro */}
              <div className="flex items-center text-gray-600">
                <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">{viewingCourt.centerName}</span>
              </div>

              {/* Descripción */}
              {viewingCourt.description && (
                <div>
                  <h5 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h5>
                  <p className="text-gray-600">{viewingCourt.description}</p>
                </div>
              )}

              {/* Detalles técnicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-lg font-semibold text-gray-900 mb-3">Especificaciones Técnicas</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dimensiones:</span>
                      <span className="font-medium">{viewingCourt.dimensions || 'No especificado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Superficie:</span>
                      <span className="font-medium">{viewingCourt.surface || 'No especificado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Capacidad:</span>
                      <span className="font-medium">{viewingCourt.capacity} personas</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span className="font-medium">{viewingCourt.covered ? 'Cubierta' : 'Descubierta'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-lg font-semibold text-gray-900 mb-3">Características</h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Iluminación:</span>
                      <span className={`font-medium ${viewingCourt.lighting ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingCourt.lighting ? 'Sí' : 'No'}
                      </span>
                    </div>
                    {viewingCourt.lighting && viewingCourt.lightingExtraPerHour && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Extra iluminación:</span>
                        <span className="font-medium">€{Number(viewingCourt.lightingExtraPerHour).toFixed(2)}/hora</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Multiuso:</span>
                      <span className={`font-medium ${viewingCourt.isMultiuse ? 'text-blue-600' : 'text-gray-400'}`}>
                        {viewingCourt.isMultiuse ? 'Sí' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deportes permitidos (si es multiuso) */}
              {viewingCourt.isMultiuse && viewingCourt.allowedSports && viewingCourt.allowedSports.length > 0 && (
                <div>
                  <h5 className="text-lg font-semibold text-gray-900 mb-3">Deportes Permitidos</h5>
                  <div className="flex flex-wrap gap-2">
                    {viewingCourt.allowedSports.map((sport, index) => (
                      <span key={index} className="inline-flex px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                        {typeLabels[sport] || sport}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Características adicionales */}
              {viewingCourt.features && viewingCourt.features.length > 0 && (
                <div>
                  <h5 className="text-lg font-semibold text-gray-900 mb-3">Características Adicionales</h5>
                  <div className="flex flex-wrap gap-2">
                    {viewingCourt.features.map((feature, index) => (
                      <span key={index} className="inline-flex px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Información de fechas */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Creada:</span> {new Date(viewingCourt.createdAt).toLocaleDateString('es-ES')}
                  </div>
                  <div>
                    <span className="font-medium">ID:</span> {viewingCourt.id}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowView(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar canchas..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">Todos los tipos</option>
              <option value="FOOTBALL7">Fútbol 7</option>
              <option value="BASKETBALL">Básquetbol</option>
              <option value="TENNIS">Tenis</option>
              <option value="VOLLEYBALL">Voleibol</option>
              <option value="PADDLE">Pádel</option>
              <option value="FUTSAL">Fútbol Sala / Balonmano</option>
              <option value="MULTIPURPOSE">Multiusos</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="AVAILABLE">Disponible</option>
              <option value="OCCUPIED">Ocupada</option>
              <option value="MAINTENANCE">Mantenimiento</option>
              <option value="INACTIVE">Inactiva</option>
            </select>
          </div>

          {/* Center Filter */}
          <div>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
            >
              <option value="ALL">Todos los centros</option>
              {uniqueCenters.map(center => (
                <option key={center} value={center}>{center}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Courts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {paginatedCourts.map((court) => (
          <div key={court.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {court.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeColors[court.type]
                      }`}>
                      {typeLabels[court.type]}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[court.status]
                      }`}>
                      {statusLabels[court.status]}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    className="text-blue-600 hover:text-blue-900 p-1"
                    onClick={() => handleViewCourt(court)}
                    title="Ver detalles de la cancha"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="text-green-600 hover:text-green-900 p-1"
                    onClick={() => handleEditCourt(court)}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-900 p-1"
                    onClick={() => handleDeleteCourt(court)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Center */}
              <div className="flex items-center text-gray-600 mb-3">
                <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                <span className="text-sm">{court.centerName}</span>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {court.description}
              </p>

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Dimensiones:</span>
                  <span className="text-gray-900">{court.dimensions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Superficie:</span>
                  <span className="text-gray-900">{court.surface}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Capacidad:</span>
                  <span className="text-gray-900">{court.capacity} personas</span>
                </div>
              </div>

              {/* Features */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Características:</p>
                <div className="flex flex-wrap gap-1">
                  {court.features?.slice(0, 3).map((feature: string, index: number) => (
                    <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      {feature}
                    </span>
                  ))}
                  {(court.features?.length || 0) > 3 && (
                    <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      +{(court.features?.length || 0) - 3} más
                    </span>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-4 text-xs text-gray-500">
                  <span className={court.lighting ? 'text-green-600' : 'text-gray-400'}>
                    {court.lighting ? '💡 Iluminada' : '💡 Sin iluminación'}
                  </span>
                  <span className={court.covered ? 'text-blue-600' : 'text-gray-400'}>
                    {court.covered ? '🏠 Cubierta' : '☀️ Descubierta'}
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Tarifa por hora</span>
                  <span className="text-2xl font-bold text-green-600">
                    €{Number(court.hourlyRate || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCourts.length === 0 && (
        <div className="text-center py-12">
          <RectangleStackIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay canchas</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron canchas que coincidan con los filtros aplicados.
          </p>
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
                  {Math.min(startIndex + itemsPerPage, filteredCourts.length)}
                </span>{' '}
                de <span className="font-medium">{filteredCourts.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === currentPage
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

      {/* Modal de confirmación de eliminación */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar cancha</h3>
            {courtToDelete && (
              <div className="text-sm text-gray-600 mb-6">
                <p className="mb-4">
                  ¿Estás seguro de que deseas eliminar la cancha "{courtToDelete.name}"?
                </p>
                <p className="mb-2">Esta acción eliminará COMPLETAMENTE:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>La cancha de la base de datos</li>
                  <li>Todas las reservas asociadas</li>
                  <li>Todos los datos relacionados</li>
                </ul>
                <p className="mt-4 text-red-600 font-semibold">⚠️ Esta acción NO se puede deshacer.</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDeleteCourt}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteCourt}
                className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700"
              >
                Eliminar permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}