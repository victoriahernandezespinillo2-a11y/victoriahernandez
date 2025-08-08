'use client';

import { useState, useEffect } from 'react';
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
import { useAdminCourts } from '@/lib/hooks';

interface Court {
  id: string;
  name: string;
  type: 'FOOTBALL' | 'BASKETBALL' | 'TENNIS' | 'VOLLEYBALL' | 'MULTIPURPOSE';
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
  covered: boolean;
  createdAt: string;
}




const typeColors: Record<string, string> = {
  FOOTBALL: 'bg-green-100 text-green-800',
  BASKETBALL: 'bg-orange-100 text-orange-800',
  TENNIS: 'bg-yellow-100 text-yellow-800',
  VOLLEYBALL: 'bg-purple-100 text-purple-800',
  MULTIPURPOSE: 'bg-blue-100 text-blue-800'
};

const typeLabels: Record<string, string> = {
  FOOTBALL: 'Fútbol',
  BASKETBALL: 'Básquetbol',
  TENNIS: 'Tenis',
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
  const { courts, loading, error, updateCourt, deleteCourt } = useAdminCourts();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [centerFilter, setCenterFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const itemsPerPage = 8;

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
  const uniqueCenters = Array.from(new Set(courts?.map(court => court.centerName) || []));

  // Filtrar canchas
  const filteredCourts = courts?.filter(court => {
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

  const handleDeleteCourt = async (courtId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta cancha?')) {
      try {
        await deleteCourt(courtId);
      } catch (error) {
        console.error('Error al eliminar cancha:', error);
        alert('Error al eliminar la cancha. Por favor, inténtalo de nuevo.');
      }
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
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
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
                ₱{averageRate.toFixed(0)}
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
              <option value="FOOTBALL">Fútbol</option>
              <option value="BASKETBALL">Básquetbol</option>
              <option value="TENNIS">Tenis</option>
              <option value="VOLLEYBALL">Voleibol</option>
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
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      typeColors[court.type]
                    }`}>
                      {typeLabels[court.type]}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      statusColors[court.status]
                    }`}>
                      {statusLabels[court.status]}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button className="text-blue-600 hover:text-blue-900 p-1">
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button className="text-green-600 hover:text-green-900 p-1">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button 
                    className="text-red-600 hover:text-red-900 p-1"
                    onClick={() => handleDeleteCourt(court.id)}
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
                    ₱{court.hourlyRate.toFixed(2)}
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