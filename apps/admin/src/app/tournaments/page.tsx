'use client';

import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalendarDaysIcon,
  UsersIcon,
  CurrencyDollarIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { useAdminTournaments } from '@/lib/hooks';

interface Tournament {
  id: string;
  name: string;
  sport: string;
  format: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  registrationFee: number;
  prizePool: number;
  status: string;
  rules?: string;
  createdAt: string;
  updatedAt: string;
  // Campos calculados o de relaciones
  center?: {
    id: string;
    name: string;
    address?: string;
  };
  _count?: {
    participants: number;
  };
}

// Los datos ahora vienen de la API real

const sportColors: Record<string, string> = {
  FOOTBALL: 'bg-green-100 text-green-800',
  BASKETBALL: 'bg-orange-100 text-orange-800',
  TENNIS: 'bg-yellow-100 text-yellow-800',
  VOLLEYBALL: 'bg-purple-100 text-purple-800',
  MULTIPURPOSE: 'bg-blue-100 text-blue-800'
};

const sportLabels: Record<string, string> = {
  FOOTBALL: 'Fútbol',
  BASKETBALL: 'Básquetbol',
  TENNIS: 'Tenis',
  VOLLEYBALL: 'Voleibol',
  MULTIPURPOSE: 'Multiusos'
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  REGISTRATION_OPEN: 'bg-green-100 text-green-800',
  REGISTRATION_CLOSED: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  REGISTRATION_OPEN: 'Inscripciones Abiertas',
  REGISTRATION_CLOSED: 'Inscripciones Cerradas',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado'
};

const formatLabels: Record<string, string> = {
  SINGLE_ELIMINATION: 'Eliminación Simple',
  DOUBLE_ELIMINATION: 'Eliminación Doble',
  ROUND_ROBIN: 'Todos contra Todos',
  LEAGUE: 'Liga'
};

export default function TournamentsPage() {
  const { tournaments, loading, error, getTournaments, deleteTournament } = useAdminTournaments();
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  // Cargar torneos al montar el componente
  useEffect(() => {
    getTournaments();
  }, [getTournaments]);

  // Filtrar torneos
  const filteredTournaments = (tournaments || []).filter(tournament => {
    const matchesSearch = 
      tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tournament.rules || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tournament.center?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSport = sportFilter === 'ALL' || tournament.sport === sportFilter;
    const matchesStatus = statusFilter === 'ALL' || tournament.status === statusFilter;
    
    return matchesSearch && matchesSport && matchesStatus;
  });

  // Paginación
  const totalPages = Math.ceil(filteredTournaments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTournaments = filteredTournaments.slice(startIndex, startIndex + itemsPerPage);

  const handleDeleteTournament = async (tournamentId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este torneo?')) {
      try {
        await deleteTournament(tournamentId);
      } catch (error) {
        console.error('Error al eliminar torneo:', error);
        alert('Error al eliminar el torneo. Por favor, inténtalo de nuevo.');
      }
    }
  };

  // Calcular estadísticas
  const totalPrizePool = (tournaments || []).reduce((sum, t) => sum + (t.prizePool || 0), 0);
  const activeTournaments = (tournaments || []).filter(t => 
    t.status === 'REGISTRATION_OPEN' || t.status === 'IN_PROGRESS'
  ).length;
  const totalParticipants = (tournaments || []).reduce((sum, t) => sum + (t._count?.participants || 0), 0);

  // Mostrar loading
  if (loading && !tournaments) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error al cargar torneos</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => getTournaments()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <TrophyIcon className="h-8 w-8 mr-3 text-blue-600" />
            Gestión de Torneos
          </h1>
          <p className="mt-2 text-gray-600">
            Administra los torneos y competencias del polideportivo
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Torneo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrophyIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Torneos</p>
              <p className="text-2xl font-semibold text-gray-900">{tournaments?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarDaysIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Torneos Activos</p>
              <p className="text-2xl font-semibold text-gray-900">{activeTournaments}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Participantes</p>
              <p className="text-2xl font-semibold text-gray-900">{totalParticipants}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Premios Totales</p>
              <p className="text-2xl font-semibold text-gray-900">€{totalPrizePool.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar torneos..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Sport Filter */}
          <div>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
            >
              <option value="ALL">Todos los deportes</option>
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
              <option value="DRAFT">Borrador</option>
              <option value="REGISTRATION_OPEN">Inscripciones Abiertas</option>
              <option value="REGISTRATION_CLOSED">Inscripciones Cerradas</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="COMPLETED">Completado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedTournaments.map((tournament) => (
          <div key={tournament.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {tournament.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sportColors[tournament.sport]
                    }`}>
                      {sportLabels[tournament.sport]}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      statusColors[tournament.status]
                    }`}>
                      {statusLabels[tournament.status] || tournament.status}
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
                    onClick={() => handleDeleteTournament(tournament.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Rules */}
              {tournament.rules && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {tournament.rules}
                </p>
              )}

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-gray-600 text-sm">
                  <CalendarDaysIcon className="h-4 w-4 mr-2" />
                  <span>
                    {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                  </span>
                </div>
                {tournament.center && (
                  <div className="flex items-center text-gray-600 text-sm">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    <span>{tournament.center.name}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Formato:</span>
                  <span className="text-gray-900">{formatLabels[tournament.format] || tournament.format}</span>
                </div>

              </div>

              {/* Participants Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Participantes</span>
                  <span className="text-gray-900">
                    {tournament._count?.participants || 0}/{tournament.maxParticipants}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((tournament._count?.participants || 0) / tournament.maxParticipants) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Financial Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-600">
                   €{tournament.registrationFee.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">Inscripción</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-purple-600">
                   €{tournament.prizePool.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">Premio</p>
                </div>
              </div>


            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTournaments.length === 0 && (
        <div className="text-center py-12">
          <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay torneos</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron torneos que coincidan con los filtros aplicados.
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
                  {Math.min(startIndex + itemsPerPage, filteredTournaments.length)}
                </span>{' '}
                de <span className="font-medium">{filteredTournaments.length}</span> resultados
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