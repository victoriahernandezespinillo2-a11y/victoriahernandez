'use client';

import { useState, useEffect } from 'react';
import {
  Trophy,
  Calendar,
  Users,
  MapPin,
  Clock,
  Star,
  Medal,
  Target,
  Filter,
  Search,
  ChevronDown,
  UserPlus,
  Eye,
  Award,
  TrendingUp,
  Zap,
  Crown,
  Gift,
} from 'lucide-react';
import { useTournaments } from '@/lib/hooks';

interface Tournament {
  id: string;
  name: string;
  sport: string;
  description?: string;
  startDate: string;
  endDate: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  registrationDeadline?: string;
  maxParticipants: number;
  currentParticipants?: number;
  registrationFee: number;
  entryFee?: number;
  prizePool?: number;
  type: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS';
  format: 'INDIVIDUAL' | 'DOUBLES' | 'TEAM';
  category: 'OPEN' | 'JUNIOR' | 'SENIOR' | 'AMATEUR' | 'PROFESSIONAL';
  status: 'DRAFT' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  organizer?: string;
  contactEmail?: string;
  contactPhone?: string;
  rules?: string[] | string;
  requirements?: string[];
  prizes?: {
    first?: number;
    second?: number;
    third?: number;
  } | Array<{
    position: number;
    description: string;
    value?: number;
  }>;
  isPublic?: boolean;
  center?: { name?: string };
  location?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    participants: number;
  };
  isRegistered?: boolean;
}

interface UserTournament {
  tournamentId: string;
  tournamentName: string;
  sport: string;
  status: 'registered' | 'in-progress' | 'eliminated' | 'winner' | 'runner-up' | 'third-place';
  registrationDate: string;
  currentRound?: string;
  nextMatch?: {
    date: string;
    time: string;
    opponent: string;
    court: string;
  };
  finalPosition?: number;
  prize?: number;
}

// Los datos ahora vienen de la API

// Los datos de torneos del usuario también vendrán de la API

export default function TournamentsPage() {
  const [activeTab, setActiveTab] = useState<'available' | 'my-tournaments'>('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  
  // Hook para gestión de torneos
  const { tournaments: tournamentsData, loading, error, getTournaments, joinTournament, leaveTournament } = useTournaments();
  
  // Normalizar respuesta: aceptar arreglo directo o objeto con { tournaments, pagination }
  const data: any = tournamentsData ?? [];
  const tournaments: Tournament[] = Array.isArray(data) ? (data as Tournament[]) : ((data.tournaments ?? []) as Tournament[]);
  const pagination = Array.isArray(data) ? undefined : data.pagination;

  // Cargar torneos al montar el componente y cuando cambien los filtros
  useEffect(() => {
    const params: any = {};
    
    if (selectedSport !== 'all') {
      params.sport = selectedSport;
    }
    
    if (selectedCategory !== 'all') {
      params.category = selectedCategory;
    }
    
    if (selectedStatus !== 'all') {
      params.status = selectedStatus;
    }
    
    getTournaments(params);
  }, [selectedSport, selectedCategory, selectedStatus, getTournaments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'JUNIOR':
        return 'bg-green-100 text-green-800';
      case 'AMATEUR':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROFESSIONAL':
        return 'bg-red-100 text-red-800';
      case 'SENIOR':
        return 'bg-purple-100 text-purple-800';
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return 'bg-green-100 text-green-800';
      case 'REGISTRATION_CLOSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'DRAFT':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return 'Inscripciones Abiertas';
      case 'REGISTRATION_CLOSED':
        return 'Inscripciones Cerradas';
      case 'IN_PROGRESS':
        return 'En Progreso';
      case 'COMPLETED':
        return 'Completado';
      case 'CANCELLED':
        return 'Cancelado';
      case 'DRAFT':
        return 'Borrador';
      default:
        return status;
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'JUNIOR':
        return 'Junior';
      case 'AMATEUR':
        return 'Amateur';
      case 'PROFESSIONAL':
        return 'Profesional';
      case 'SENIOR':
        return 'Senior';
      case 'OPEN':
        return 'Abierto';
      default:
        return category;
    }
  };

  // Obtener premios de forma segura (soporta objeto {first,second,third} o arreglo de {position,value})
  const getPrizeValue = (pos: 'first' | 'second' | 'third', prizes?: Tournament['prizes']): number => {
    if (!prizes) return 0;
    if (Array.isArray(prizes)) {
      const targetPosition = pos === 'first' ? 1 : pos === 'second' ? 2 : 3;
      const match = prizes.find((p) => p.position === targetPosition);
      return match?.value ?? 0;
    }
    return prizes[pos] ?? 0;
  };

  // Funciones duplicadas eliminadas - usando las versiones de la API

  // Función para manejar la inscripción a torneos
  const handleRegisterTournament = async (tournamentId: string) => {
    try {
      await joinTournament(tournamentId);
      alert('¡Te has inscrito exitosamente al torneo!');
      setShowRegistrationModal(false);
      setSelectedTournament(null);
      // Recargar los torneos para actualizar la información
      getTournaments();
    } catch (error) {
      console.error('Error registering for tournament:', error);
      alert('Error al inscribirse al torneo. Inténtalo de nuevo.');
    }
  };

  // Filtrar torneos basado en la búsqueda
  const filteredTournaments = tournaments.filter((tournament: Tournament) => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tournament.sport.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Obtener deportes únicos para el filtro
  const sports = [...new Set(tournaments.map((t: Tournament) => t.sport))];

  const renderAvailableTournaments = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar torneos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${
                showFilters ? 'rotate-180' : ''
              }`} />
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deporte
                  </label>
                  <select
                    value={selectedSport}
                    onChange={(e) => setSelectedSport(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Todos los deportes</option>
                    {sports.map(sport => (
                      <option key={sport} value={sport}>{sport}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Todas las categorías</option>
                    <option value="JUNIOR">Junior</option>
                    <option value="AMATEUR">Amateur</option>
                    <option value="PROFESSIONAL">Profesional</option>
                    <option value="SENIOR">Senior</option>
                    <option value="OPEN">Abierto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="REGISTRATION_OPEN">Inscripciones Abiertas</option>
                    <option value="REGISTRATION_CLOSED">Inscripciones Cerradas</option>
                    <option value="IN_PROGRESS">En Progreso</option>
                    <option value="COMPLETED">Completados</option>
                    <option value="CANCELLED">Cancelados</option>
                    <option value="DRAFT">Borrador</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando torneos...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">Error al cargar los torneos: {error}</p>
        </div>
      )}

      {/* Tournaments Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTournaments.length === 0 ? (
             <div className="col-span-full text-center py-12">
               <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
               <p className="text-gray-500">No se encontraron torneos.</p>
             </div>
           ) : (
             filteredTournaments.map((tournament) => (
            <div key={tournament.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getStatusColor(tournament.status)
                      }`}>
                        {getStatusText(tournament.status)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getCategoryColor(tournament.category)
                      }`}>
                        {getCategoryText(tournament.category)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {tournament.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{tournament.description}</p>
                  </div>
                  <Trophy className="h-6 w-6 text-yellow-500 ml-4" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(tournament.startDate)}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {tournament._count?.participants || 0}/{tournament.maxParticipants}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {tournament.center?.name || 'Centro no especificado'}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Target className="h-4 w-4 mr-2" />
                    {tournament.sport}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm text-gray-500">Inscripción</div>
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(tournament.registrationFee || 0)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Premio Total</div>
                      <div className="font-semibold text-yellow-600">
                        {formatCurrency(tournament.prizePool || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedTournament(tournament)}
                      className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalles
                    </button>
                    {tournament.status === 'REGISTRATION_OPEN' && (
                      <button
                        onClick={() => {
                          setSelectedTournament(tournament);
                          setShowRegistrationModal(true);
                        }}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Inscribirse
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  const renderMyTournaments = () => (
    <div className="space-y-6">
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Tienes Torneos Disponibles
        </h3>
        <p className="text-gray-500 mb-4">
          Explora los torneos disponibles.
        </p>
        <button
          onClick={() => setActiveTab('available')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Ver Torneos Disponibles
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Torneos</h1>
        <p className="text-gray-500 mt-1">
          Descubre y participa en torneos deportivos
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'available'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Torneos Disponibles
            </button>
            <button
              onClick={() => setActiveTab('my-tournaments')}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'my-tournaments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Medal className="h-4 w-4 mr-2" />
              Mis Torneos (0)
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'available' ? renderAvailableTournaments() : renderMyTournaments()}
        </div>
      </div>

      {/* Tournament Details Modal */}
      {selectedTournament && !showRegistrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedTournament.name}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getStatusColor(selectedTournament.status)
                    }`}>
                      {getStatusText(selectedTournament.status)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getCategoryColor(selectedTournament.category)
                    }`}>
                      {getCategoryText(selectedTournament.category)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTournament(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Descripción</h3>
                  <p className="text-gray-600">{selectedTournament.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Información General</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Deporte:</span>
                        <span className="font-medium">{selectedTournament.sport}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Formato:</span>
                        <span className="font-medium">{selectedTournament.format}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Organizador:</span>
                        <span className="font-medium">{selectedTournament.organizer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ubicación:</span>
                        <span className="font-medium">{selectedTournament.location}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Fechas Importantes</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Inicio:</span>
                        <span className="font-medium">{formatDate(selectedTournament.startDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Final:</span>
                        <span className="font-medium">{formatDate(selectedTournament.endDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Límite inscripción:</span>
                        <span className="font-medium">{formatDate(selectedTournament.registrationDeadline)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Participantes y Premios</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Participantes</div>
                      <div className="text-lg font-semibold">
                        {selectedTournament.currentParticipants} / {selectedTournament.maxParticipants}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${((selectedTournament.currentParticipants ?? 0) / (selectedTournament.maxParticipants || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Costo de Inscripción</div>
                      <div className="text-lg font-semibold text-blue-600">
                        {formatCurrency(selectedTournament.registrationFee ?? 0)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="text-sm text-gray-500 mb-2">Premios</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <Crown className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
                        <div className="text-xs text-gray-500">1er Lugar</div>
                        <div className="font-semibold text-yellow-600">
                          {formatCurrency(getPrizeValue('first', selectedTournament.prizes))}
                        </div>
                      </div>
                      <div className="text-center">
                        <Medal className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                        <div className="text-xs text-gray-500">2do Lugar</div>
                        <div className="font-semibold text-gray-600">
                          {formatCurrency(getPrizeValue('second', selectedTournament.prizes))}
                        </div>
                      </div>
                      <div className="text-center">
                        <Award className="h-6 w-6 text-orange-500 mx-auto mb-1" />
                        <div className="text-xs text-gray-500">3er Lugar</div>
                        <div className="font-semibold text-orange-600">
                          {formatCurrency(getPrizeValue('third', selectedTournament.prizes))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Reglas del Torneo</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {(Array.isArray(selectedTournament.rules) 
                      ? selectedTournament.rules 
                      : (selectedTournament.rules ? [selectedTournament.rules] : [])).map((rule, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setSelectedTournament(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cerrar
                  </button>
                  {selectedTournament.status === 'REGISTRATION_OPEN' && !selectedTournament.isRegistered && (
                    <button
                      onClick={() => setShowRegistrationModal(true)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Inscribirse al Torneo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegistrationModal && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Confirmar Inscripción
              </h2>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de que quieres inscribirte al torneo "{selectedTournament.name}"?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Costo de inscripción:</span>
                  <span className="font-semibold text-lg">
                    {formatCurrency(selectedTournament.registrationFee ?? 0)}
                  </span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowRegistrationModal(false);
                    setSelectedTournament(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                  <button
                    onClick={() => handleRegisterTournament(selectedTournament.id)}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Inscribiendo...' : 'Confirmar Inscripción'}
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}