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
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('COP', '$');
};

export default function MembershipsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [memberships, setMemberships] = useState<UiMembership[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.memberships?.getAll?.({ page: 1, limit: 200 });
        const list = Array.isArray(res?.memberships)
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
          benefits: Array.isArray(m.benefits) ? m.benefits : [],
          maxReservations: Number(m.maxReservations ?? -1),
          discountPercentage: Number(m.discountPercentage ?? 0),
          status: (m.isActive ? 'active' : 'inactive') as 'active' | 'inactive',
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestión de Membresías</h1>
            <p className="text-gray-600">Administra los planes de membresía y suscripciones</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Nueva Membresía
          </button>
        </div>
      </div>

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
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
                  <Eye className="w-4 h-4" />
                  Ver
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50">
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button className="flex items-center justify-center px-3 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50">
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
    </div>
  );
}