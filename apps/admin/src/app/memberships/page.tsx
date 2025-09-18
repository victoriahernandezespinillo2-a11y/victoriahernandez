'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import {
  MagnifyingGlassIcon as Search,
  FunnelIcon as Filter,
  PlusIcon as Plus,
  EyeIcon as Eye,
  PencilIcon as Edit,
  TrashIcon as Trash2,
  UsersIcon as Users,
  CalendarDaysIcon as Calendar,
  CurrencyDollarIcon as DollarSign,
  ArrowTrendingUpIcon as TrendingUp,
  TrophyIcon as Crown,
  StarIcon as Star,
  ShieldCheckIcon as Shield,
  XMarkIcon as X,
  CheckIcon as Check,
} from '@heroicons/react/24/outline';

type UiMembership = {
  id: string;
  name: string;
  type: 'basic' | 'premium' | 'vip';
  price: number;
  duration: number;
  benefits: string[];
  maxReservations: number;
  discountPercentage: number;
  status: 'active' | 'inactive';
  subscribersCount: number;
  createdAt: string;
};

const getTypeIcon = (type: UiMembership['type']) => {
  switch (type) {
    case 'basic':
      return <Shield className="w-5 h-5 text-blue-500" />;
    case 'premium':
      return <Star className="w-5 h-5 text-purple-500" />;
    case 'vip':
      return <Crown className="w-5 h-5 text-yellow-500" />;
    default:
      return null;
  }
};

const getTypeColor = (type: UiMembership['type']) => {
  switch (type) {
    case 'basic':
      return 'bg-blue-100 text-blue-800';
    case 'premium':
      return 'bg-purple-100 text-purple-800';
    case 'vip':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusColor = (status: UiMembership['status']) => {
  return status === 'active' 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800';
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
};

export default function MembershipsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [memberships, setMemberships] = useState<UiMembership[]>([]);
  
  // Estados para modales y acciones
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNewMembershipModal, setShowNewMembershipModal] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<UiMembership | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para formulario de nueva membresía
  const [newMembershipForm, setNewMembershipForm] = useState({
    name: '',
    type: 'basic' as 'basic' | 'premium' | 'vip',
    price: 0,
    duration: 1,
    discountPercentage: 0,
    maxReservations: -1,
    benefits: [] as string[],
    isActive: true,
  });
  const [newBenefit, setNewBenefit] = useState('');
  const [editBenefit, setEditBenefit] = useState('');

  // Estados para formulario de edición
  const [editMembershipForm, setEditMembershipForm] = useState({
    name: '',
    price: 0,
    discountPercentage: 0,
    maxReservations: -1,
    isActive: true,
    type: 'BASIC' as 'BASIC' | 'PREMIUM' | 'VIP',
    duration: 1,
    benefits: [] as string[],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.memberships?.getAll?.({ page: 1, limit: 200 });
        const list = Array.isArray(res?.membershipPlans)
          ? res.membershipPlans
          : Array.isArray(res?.data?.membershipPlans)
            ? res.data.membershipPlans
            : Array.isArray(res?.memberships)
              ? res.memberships
              : Array.isArray(res?.data?.memberships)
                ? res.data.memberships
                : Array.isArray(res)
                  ? res
                  : [];
        const mapped: UiMembership[] = list.map((m: any) => ({
          id: m.id,
          name: m.name || m.type || 'Membresía',
          type: (m.type || 'basic').toLowerCase(),
          price: Number(m.price || m.monthlyPrice || 0),
          duration: Number(m.durationMonths || m.duration || 1),
          benefits: Array.isArray(m.benefits?.features) ? m.benefits.features : 
                   Array.isArray(m.benefits) ? m.benefits : [],
          maxReservations: Number(m.benefits?.maxReservations ?? m.maxReservations ?? -1),
          discountPercentage: Number(m.benefits?.discountPercentage ?? m.discountPercentage ?? 0),
          status: (m.status || (m.isActive ? 'active' : 'inactive')) as 'active' | 'inactive',
          subscribersCount: Number(m.subscribersCount ?? 0),
          createdAt: m.createdAt || new Date().toISOString(),
        }));
        setMemberships(mapped);
      } catch {
        setMemberships([]);
      }
    };
    load();
  }, []);

  const filteredMemberships = memberships.filter(membership => {
    const matchesSearch = membership.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || membership.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || membership.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalPages = Math.ceil(filteredMemberships.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMemberships = filteredMemberships.slice(startIndex, startIndex + itemsPerPage);

  const totalSubscribers = memberships.reduce((sum, membership) => sum + membership.subscribersCount, 0);
  const totalRevenue = memberships.reduce((sum, membership) => 
    membership.status === 'active' ? sum + (membership.price * membership.subscribersCount) : sum, 0
  );
  const activeMemberships = memberships.filter(m => m.status === 'active').length;
  const averagePrice = memberships.length > 0 ? (memberships.reduce((sum, m) => sum + m.price, 0) / memberships.length) : 0;

  // Funciones para manejar acciones
  const handleView = (membership: UiMembership) => {
    setSelectedMembership(membership);
    setShowViewModal(true);
  };

  const handleEdit = (membership: UiMembership) => {
    setSelectedMembership(membership);
    setEditMembershipForm({
      name: membership.name,
      price: membership.price,
      discountPercentage: membership.discountPercentage,
      maxReservations: membership.maxReservations,
      isActive: membership.status === 'active',
      type: membership.type.toUpperCase() as 'BASIC' | 'PREMIUM' | 'VIP',
      duration: 1, // Por defecto 1 mes
      benefits: membership.benefits || [],
    });
    setShowEditModal(true);
  };

  const handleDelete = (membership: UiMembership) => {
    setSelectedMembership(membership);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedMembership) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await adminApi.memberships?.delete?.(selectedMembership.id);
      
      // Recargar la lista
      const res = await adminApi.memberships?.getAll?.({ page: 1, limit: 200 });
      const list = Array.isArray(res?.membershipPlans)
        ? res.membershipPlans
        : Array.isArray(res?.data?.membershipPlans)
          ? res.data.membershipPlans
          : Array.isArray(res)
            ? res
            : [];
      const mapped: UiMembership[] = list.map((m: any) => ({
        id: m.id,
        name: m.name || m.type || 'Membresía',
        type: (m.type || 'basic').toLowerCase(),
        price: Number(m.price || m.monthlyPrice || 0),
        duration: Number(m.durationMonths || m.duration || 1),
        benefits: Array.isArray(m.benefits?.features) ? m.benefits.features : 
                 Array.isArray(m.benefits) ? m.benefits : [],
        maxReservations: Number(m.benefits?.maxReservations ?? m.maxReservations ?? -1),
        discountPercentage: Number(m.benefits?.discountPercentage ?? m.discountPercentage ?? 0),
        status: (m.status || (m.isActive ? 'active' : 'inactive')) as 'active' | 'inactive',
        subscribersCount: Number(m.subscribersCount ?? 0),
        createdAt: m.createdAt || new Date().toISOString(),
      }));
      setMemberships(mapped);
      
      setShowDeleteDialog(false);
      setSelectedMembership(null);
    } catch (err: any) {
      setError(err?.message || 'Error eliminando la membresía');
    } finally {
      setLoading(false);
    }
  };

  const closeModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowDeleteDialog(false);
    setShowNewMembershipModal(false);
    setSelectedMembership(null);
    setError(null);
    setSuccess(null);
    // Resetear formularios
    setNewMembershipForm({
      name: '',
      type: 'basic',
      price: 0,
      duration: 1,
      discountPercentage: 0,
      maxReservations: -1,
      benefits: [],
      isActive: true,
    });
    setEditMembershipForm({
      name: '',
      price: 0,
      discountPercentage: 0,
      maxReservations: -1,
      isActive: true,
      type: 'BASIC',
      duration: 1,
      benefits: [],
    });
    setNewBenefit('');
    setEditBenefit('');
  };

  const handleNewMembership = () => {
    setShowNewMembershipModal(true);
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setNewMembershipForm(prev => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()]
      }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    setNewMembershipForm(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  // Funciones para el formulario de edición
  const addEditBenefit = () => {
    if (editBenefit.trim()) {
      setEditMembershipForm(prev => ({
        ...prev,
        benefits: [...prev.benefits, editBenefit.trim()]
      }));
      setEditBenefit('');
    }
  };

  const removeEditBenefit = (index: number) => {
    setEditMembershipForm(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const createNewMembership = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Validar campos requeridos
      if (!newMembershipForm.name.trim()) {
        setError('El nombre del plan es requerido');
        return;
      }
      if (newMembershipForm.price <= 0) {
        setError('El precio debe ser mayor a 0');
        return;
      }
      if (newMembershipForm.benefits.length === 0) {
        setError('Debe agregar al menos un beneficio');
        return;
      }

      // Crear el payload para la API
      const payload = {
        name: newMembershipForm.name,
        type: newMembershipForm.type.toUpperCase(),
        price: newMembershipForm.price,
        durationMonths: newMembershipForm.duration,
        benefits: {
          features: newMembershipForm.benefits,
          maxReservations: newMembershipForm.maxReservations,
          discountPercentage: newMembershipForm.discountPercentage,
          priorityBooking: newMembershipForm.type !== 'basic',
          freeHours: newMembershipForm.type === 'vip' ? 2 : 0,
          guestPasses: newMembershipForm.type === 'vip' ? 2 : 0,
          accessToEvents: newMembershipForm.type !== 'basic',
          personalTrainer: newMembershipForm.type === 'vip',
        },
        isActive: newMembershipForm.isActive,
      };

      // Llamar a la API para crear la membresía
      await adminApi.memberships?.create?.(payload);

      // Recargar la lista
      const res = await adminApi.memberships?.getAll?.({ page: 1, limit: 200 });
      const list = Array.isArray(res?.membershipPlans)
        ? res.membershipPlans
        : Array.isArray(res?.data?.membershipPlans)
          ? res.data.membershipPlans
          : Array.isArray(res)
            ? res
            : [];
      const mapped: UiMembership[] = list.map((m: any) => ({
        id: m.id,
        name: m.name || m.type || 'Membresía',
        type: (m.type || 'basic').toLowerCase(),
        price: Number(m.price || m.monthlyPrice || 0),
        duration: Number(m.durationMonths || m.duration || 1),
        benefits: Array.isArray(m.benefits?.features) ? m.benefits.features : 
                 Array.isArray(m.benefits) ? m.benefits : [],
        maxReservations: Number(m.benefits?.maxReservations ?? m.maxReservations ?? -1),
        discountPercentage: Number(m.benefits?.discountPercentage ?? m.discountPercentage ?? 0),
        status: (m.status || (m.isActive ? 'active' : 'inactive')) as 'active' | 'inactive',
        subscribersCount: Number(m.subscribersCount ?? 0),
        createdAt: m.createdAt || new Date().toISOString(),
      }));
      setMemberships(mapped);

      setSuccess('Plan de membresía creado exitosamente');
      closeModals();
    } catch (err: any) {
      setError(err?.message || 'Error creando el plan de membresía');
    } finally {
      setLoading(false);
    }
  };

  const updateMembership = async () => {
    if (!selectedMembership) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Validar campos requeridos
      if (!editMembershipForm.name.trim()) {
        setError('El nombre del plan es requerido');
        return;
      }
      if (editMembershipForm.price <= 0) {
        setError('El precio debe ser mayor a 0');
        return;
      }

      // Crear el payload para la API
      const payload = {
        name: editMembershipForm.name,
        type: editMembershipForm.type,
        price: editMembershipForm.price,
        durationMonths: editMembershipForm.duration,
        benefits: {
          features: editMembershipForm.benefits,
          maxReservations: editMembershipForm.maxReservations,
          discountPercentage: editMembershipForm.discountPercentage,
          priorityBooking: editMembershipForm.type !== 'BASIC',
          freeHours: editMembershipForm.type === 'VIP' ? 2 : 0,
          guestPasses: editMembershipForm.type === 'VIP' ? 2 : 0,
          accessToEvents: editMembershipForm.type !== 'BASIC',
          personalTrainer: editMembershipForm.type === 'VIP',
        },
        isActive: editMembershipForm.isActive,
      };

      // Llamar a la API para actualizar la membresía
      await adminApi.memberships?.update?.(selectedMembership.id, payload);

      // Recargar la lista
      const res = await adminApi.memberships?.getAll?.({ page: 1, limit: 200 });
      const list = Array.isArray(res?.membershipPlans)
        ? res.membershipPlans
        : Array.isArray(res?.data?.membershipPlans)
          ? res.data.membershipPlans
          : Array.isArray(res?.memberships)
            ? res.memberships
            : Array.isArray(res?.data?.memberships)
              ? res.data.memberships
              : Array.isArray(res)
                ? res
                : [];
      const mapped: UiMembership[] = list.map((m: any) => ({
        id: m.id,
        name: m.name || m.type || 'Membresía',
        type: (m.type || 'basic').toLowerCase(),
        price: Number(m.price || m.monthlyPrice || 0),
        duration: Number(m.durationMonths || m.duration || 1),
        benefits: Array.isArray(m.benefits?.features) ? m.benefits.features : 
                 Array.isArray(m.benefits) ? m.benefits : [],
        maxReservations: Number(m.benefits?.maxReservations ?? m.maxReservations ?? -1),
        discountPercentage: Number(m.benefits?.discountPercentage ?? m.discountPercentage ?? 0),
        status: (m.status || (m.isActive ? 'active' : 'inactive')) as 'active' | 'inactive',
        subscribersCount: Number(m.subscribersCount ?? 0),
        createdAt: m.createdAt || new Date().toISOString(),
      }));
      setMemberships(mapped);

      setSuccess('Plan de membresía actualizado exitosamente');
      closeModals();
    } catch (err: any) {
      setError(err?.message || 'Error actualizando el plan de membresía');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestión de Membresías</h1>
            <p className="text-gray-600">Administra los planes de membresía y suscripciones</p>
          </div>
          <button 
            onClick={handleNewMembership}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Membresía
          </button>
        </div>
      </div>

      {/* Notificaciones */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
              <X className="w-3 h-3 text-red-600" />
            </div>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-green-600" />
            </div>
            <p className="text-green-700">{success}</p>
            <button 
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Suscriptores</p>
              <p className="text-2xl font-bold text-gray-900">{totalSubscribers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos por Membresías</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Membresías Activas</p>
              <p className="text-2xl font-bold text-gray-900">{activeMemberships}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Precio Promedio</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(averagePrice)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
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
                placeholder="Buscar membresías..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Todos los tipos</option>
              <option value="basic">Básica</option>
              <option value="premium">Premium</option>
              <option value="vip">VIP</option>
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

      {/* Grid de membresías */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {paginatedMemberships.map((membership) => (
          <div key={membership.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getTypeIcon(membership.type)}
                  <h3 className="text-lg font-semibold text-gray-900">{membership.name}</h3>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(membership.status)}`}>
                  {membership.status === 'active' ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">{formatCurrency(membership.price)}</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(membership.type)}`}>
                    {membership.type === 'basic' ? 'Básica' : 
                     membership.type === 'premium' ? 'Premium' : 'VIP'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{membership.duration} {membership.duration === 1 ? 'mes' : 'meses'}</p>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Beneficios:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {membership.benefits.slice(0, 3).map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      {benefit}
                    </li>
                  ))}
                  {membership.benefits.length > 3 && (
                    <li className="text-blue-600 text-xs">+{membership.benefits.length - 3} más...</li>
                  )}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-600">Reservas máx.</p>
                  <p className="font-semibold">{membership.maxReservations === -1 ? 'Ilimitadas' : membership.maxReservations}</p>
                </div>
                <div>
                  <p className="text-gray-600">Descuento</p>
                  <p className="font-semibold">{membership.discountPercentage}%</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Suscriptores</span>
                  <span className="font-semibold">{membership.subscribersCount}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <button 
                  onClick={() => handleView(membership)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Ver
                </button>
                <button 
                  onClick={() => handleEdit(membership)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button 
                  onClick={() => handleDelete(membership)}
                  className="flex items-center justify-center px-3 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow-sm border">
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
                <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredMemberships.length)}</span> de{' '}
                <span className="font-medium">{filteredMemberships.length}</span> resultados
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

      {/* Modal para Ver */}
      {showViewModal && selectedMembership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Detalles del Plan</h2>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <p className="text-lg font-semibold text-black">{selectedMembership.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(selectedMembership.type)}`}>
                    {selectedMembership.type === 'basic' ? 'Básica' : 
                     selectedMembership.type === 'premium' ? 'Premium' : 'VIP'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Precio</label>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedMembership.price)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duración</label>
                  <p className="text-lg text-black">{selectedMembership.duration} {selectedMembership.duration === 1 ? 'mes' : 'meses'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beneficios</label>
                <ul className="space-y-2">
                  {selectedMembership.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-black">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reservas Máximas</label>
                  <p className="text-lg text-black">{selectedMembership.maxReservations === -1 ? 'Ilimitadas' : selectedMembership.maxReservations}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descuento</label>
                  <p className="text-lg text-black">{selectedMembership.discountPercentage}%</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Suscriptores</label>
                <p className="text-lg text-black">{selectedMembership.subscribersCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar */}
      {showEditModal && selectedMembership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Editar Plan</h2>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Plan</label>
                <input
                  type="text"
                  value={editMembershipForm.name}
                  onChange={(e) => setEditMembershipForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio (€)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editMembershipForm.price || ''}
                      onChange={(e) => setEditMembershipForm(prev => ({ 
                        ...prev, 
                        price: e.target.value === '' ? 0 : Number(e.target.value) 
                      }))}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="0.00"
                    />
                    {editMembershipForm.price > 0 && (
                      <button
                        type="button"
                        onClick={() => setEditMembershipForm(prev => ({ ...prev, price: 0 }))}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Limpiar campo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descuento (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editMembershipForm.discountPercentage || ''}
                      onChange={(e) => setEditMembershipForm(prev => ({ 
                        ...prev, 
                        discountPercentage: e.target.value === '' ? 0 : Number(e.target.value) 
                      }))}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="0"
                    />
                    {editMembershipForm.discountPercentage > 0 && (
                      <button
                        type="button"
                        onClick={() => setEditMembershipForm(prev => ({ ...prev, discountPercentage: 0 }))}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Limpiar campo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Plan</label>
                  <select
                    value={editMembershipForm.type}
                    onChange={(e) => setEditMembershipForm(prev => ({ ...prev, type: e.target.value as 'BASIC' | 'PREMIUM' | 'VIP' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="BASIC">Básica</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (meses)</label>
                  <input
                    type="number"
                    min="1"
                    value={editMembershipForm.duration}
                    onChange={(e) => setEditMembershipForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
              </div>

              {/* Beneficios */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beneficios</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={editBenefit}
                    onChange={(e) => setEditBenefit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addEditBenefit()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Ej: Acceso a todas las instalaciones"
                  />
                  <button
                    type="button"
                    onClick={addEditBenefit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Agregar
                  </button>
                </div>
                
                {editMembershipForm.benefits.length > 0 && (
                  <div className="space-y-2">
                    {editMembershipForm.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <span className="text-sm text-black">{benefit}</span>
                        <button
                          type="button"
                          onClick={() => removeEditBenefit(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reservas Máximas</label>
                <input
                  type="number"
                  value={editMembershipForm.maxReservations === -1 ? '' : editMembershipForm.maxReservations}
                  onChange={(e) => setEditMembershipForm(prev => ({ 
                    ...prev, 
                    maxReservations: e.target.value === '' ? -1 : Number(e.target.value) 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  placeholder="Dejar vacío para ilimitadas"
                />
              </div>

              <div className="flex items-center gap-3">
                <input 
                  id="isActive" 
                  type="checkbox" 
                  checked={editMembershipForm.isActive}
                  onChange={(e) => setEditMembershipForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Plan Activo</label>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={updateMembership}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación para Eliminar */}
      {showDeleteDialog && selectedMembership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Eliminar Plan</h3>
                <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                ¿Estás seguro de que quieres eliminar el plan <strong>"{selectedMembership.name}"</strong>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                Se eliminarán todos los datos asociados a este plan.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={closeModals}
                disabled={loading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Nueva Membresía */}
      {showNewMembershipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Nueva Membresía</h2>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Plan *</label>
                  <input
                    type="text"
                    value={newMembershipForm.name}
                    onChange={(e) => setNewMembershipForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Ej: Plan Premium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Plan *</label>
                  <select
                    value={newMembershipForm.type}
                    onChange={(e) => setNewMembershipForm(prev => ({ ...prev, type: e.target.value as 'basic' | 'premium' | 'vip' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="basic">Básica</option>
                    <option value="premium">Premium</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newMembershipForm.price}
                    onChange={(e) => setNewMembershipForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="29.99"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (meses)</label>
                  <input
                    type="number"
                    min="1"
                    value={newMembershipForm.duration}
                    onChange={(e) => setNewMembershipForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descuento (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newMembershipForm.discountPercentage}
                    onChange={(e) => setNewMembershipForm(prev => ({ ...prev, discountPercentage: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reservas Máximas</label>
                  <input
                    type="number"
                    min="-1"
                    value={newMembershipForm.maxReservations === -1 ? '' : newMembershipForm.maxReservations}
                    onChange={(e) => setNewMembershipForm(prev => ({ 
                      ...prev, 
                      maxReservations: e.target.value === '' ? -1 : Number(e.target.value) 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Dejar vacío para ilimitadas"
                  />
                </div>
              </div>

              {/* Beneficios */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beneficios *</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addBenefit()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Ej: Acceso a todas las instalaciones"
                  />
                  <button
                    type="button"
                    onClick={addBenefit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Agregar
                  </button>
                </div>
                
                {newMembershipForm.benefits.length > 0 && (
                  <div className="space-y-2">
                    {newMembershipForm.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <span className="text-sm text-black">{benefit}</span>
                        <button
                          type="button"
                          onClick={() => removeBenefit(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Estado activo */}
              <div className="flex items-center gap-3">
                <input 
                  id="isActiveNew" 
                  type="checkbox" 
                  checked={newMembershipForm.isActive}
                  onChange={(e) => setNewMembershipForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="isActiveNew" className="text-sm text-gray-700">Plan Activo</label>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={closeModals}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={createNewMembership}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creando...
                    </>
                  ) : (
                    'Crear Plan'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}