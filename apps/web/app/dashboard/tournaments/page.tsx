'use client';

import { useState } from 'react';
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

interface Tournament {
  id: string;
  name: string;
  sport: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  prizes: {
    first: number;
    second: number;
    third: number;
  };
  level: 'beginner' | 'intermediate' | 'advanced' | 'open';
  format: 'single-elimination' | 'double-elimination' | 'round-robin' | 'swiss';
  status: 'upcoming' | 'registration-open' | 'registration-closed' | 'in-progress' | 'completed';
  organizer: string;
  location: string;
  rules: string[];
  image?: string;
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

// Mock data - En producción esto vendría de la API
const tournaments: Tournament[] = [
  {
    id: '1',
    name: 'Copa de Fútbol Primavera 2024',
    sport: 'Fútbol',
    description: 'Torneo de fútbol 5 vs 5 para equipos amateur. Categoría abierta con premios en efectivo.',
    startDate: '2024-02-15',
    endDate: '2024-02-25',
    registrationDeadline: '2024-02-10',
    maxParticipants: 16,
    currentParticipants: 12,
    entryFee: 200000,
    prizes: {
      first: 1000000,
      second: 500000,
      third: 250000
    },
    level: 'open',
    format: 'single-elimination',
    status: 'registration-open',
    organizer: 'Polideportivo Oroquieta',
    location: 'Canchas A1, A2, A3',
    rules: [
      'Equipos de 5 jugadores + 3 suplentes máximo',
      'Partidos de 40 minutos (20 min cada tiempo)',
      'Tarjetas amarillas y rojas según reglamento FIFA',
      'Todos los jugadores deben estar registrados'
    ]
  },
  {
    id: '2',
    name: 'Torneo de Tenis Individual',
    sport: 'Tenis',
    description: 'Competencia individual de tenis para jugadores intermedios y avanzados.',
    startDate: '2024-02-20',
    endDate: '2024-02-22',
    registrationDeadline: '2024-02-15',
    maxParticipants: 32,
    currentParticipants: 28,
    entryFee: 50000,
    prizes: {
      first: 300000,
      second: 150000,
      third: 75000
    },
    level: 'intermediate',
    format: 'single-elimination',
    status: 'registration-open',
    organizer: 'Club de Tenis Oroquieta',
    location: 'Canchas de Tenis T1-T4',
    rules: [
      'Partidos a mejor de 3 sets',
      'Tie-break a 7 puntos en caso de empate 6-6',
      'Máximo 2 horas por partido',
      'Equipamiento propio obligatorio'
    ],
    isRegistered: true
  },
  {
    id: '3',
    name: 'Liga de Baloncesto 3x3',
    sport: 'Baloncesto',
    description: 'Torneo de baloncesto 3 contra 3 estilo streetball.',
    startDate: '2024-03-01',
    endDate: '2024-03-15',
    registrationDeadline: '2024-02-25',
    maxParticipants: 24,
    currentParticipants: 8,
    entryFee: 150000,
    prizes: {
      first: 600000,
      second: 300000,
      third: 150000
    },
    level: 'open',
    format: 'round-robin',
    status: 'upcoming',
    organizer: 'Liga Urbana de Baloncesto',
    location: 'Cancha de Baloncesto B1',
    rules: [
      'Equipos de 3 jugadores + 1 suplente',
      'Partidos a 21 puntos o 10 minutos',
      'Canasta vale 1 punto dentro del arco, 2 fuera',
      'Cambio de posesión cada canasta'
    ]
  },
  {
    id: '4',
    name: 'Campeonato de Voleibol Mixto',
    sport: 'Voleibol',
    description: 'Torneo de voleibol con equipos mixtos (hombres y mujeres).',
    startDate: '2024-01-20',
    endDate: '2024-01-21',
    registrationDeadline: '2024-01-15',
    maxParticipants: 12,
    currentParticipants: 12,
    entryFee: 180000,
    prizes: {
      first: 500000,
      second: 250000,
      third: 125000
    },
    level: 'intermediate',
    format: 'double-elimination',
    status: 'completed',
    organizer: 'Asociación de Voleibol',
    location: 'Cancha de Voleibol V1',
    rules: [
      'Equipos de 6 jugadores (mínimo 2 mujeres en cancha)',
      'Partidos a mejor de 3 sets',
      'Sets a 25 puntos (diferencia de 2)',
      'Set decisivo a 15 puntos'
    ]
  }
];

const userTournaments: UserTournament[] = [
  {
    tournamentId: '2',
    tournamentName: 'Torneo de Tenis Individual',
    sport: 'Tenis',
    status: 'registered',
    registrationDate: '2024-01-10',
    currentRound: 'Esperando inicio',
    nextMatch: {
      date: '2024-02-20',
      time: '09:00',
      opponent: 'Carlos Mendoza',
      court: 'Cancha T2'
    }
  },
  {
    tournamentId: '4',
    tournamentName: 'Campeonato de Voleibol Mixto',
    sport: 'Voleibol',
    status: 'runner-up',
    registrationDate: '2024-01-05',
    finalPosition: 2,
    prize: 250000
  }
];

export default function TournamentsPage() {
  const [activeTab, setActiveTab] = useState<'available' | 'my-tournaments'>('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      case 'open':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'Principiante';
      case 'intermediate':
        return 'Intermedio';
      case 'advanced':
        return 'Avanzado';
      case 'open':
        return 'Abierto';
      default:
        return level;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration-open':
        return 'bg-green-100 text-green-800';
      case 'registration-closed':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'upcoming':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'registration-open':
        return 'Inscripciones Abiertas';
      case 'registration-closed':
        return 'Inscripciones Cerradas';
      case 'in-progress':
        return 'En Progreso';
      case 'completed':
        return 'Finalizado';
      case 'upcoming':
        return 'Próximamente';
      default:
        return status;
    }
  };

  const getUserStatusColor = (status: string) => {
    switch (status) {
      case 'registered':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'eliminated':
        return 'bg-red-100 text-red-800';
      case 'winner':
        return 'bg-yellow-100 text-yellow-800';
      case 'runner-up':
        return 'bg-gray-100 text-gray-800';
      case 'third-place':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserStatusText = (status: string) => {
    switch (status) {
      case 'registered':
        return 'Inscrito';
      case 'in-progress':
        return 'En Competencia';
      case 'eliminated':
        return 'Eliminado';
      case 'winner':
        return 'Campeón';
      case 'runner-up':
        return 'Subcampeón';
      case 'third-place':
        return 'Tercer Lugar';
      default:
        return status;
    }
  };

  const getUserStatusIcon = (status: string) => {
    switch (status) {
      case 'winner':
        return <Crown className="h-4 w-4" />;
      case 'runner-up':
        return <Medal className="h-4 w-4" />;
      case 'third-place':
        return <Award className="h-4 w-4" />;
      default:
        return <Trophy className="h-4 w-4" />;
    }
  };

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tournament.sport.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = selectedSport === 'all' || tournament.sport === selectedSport;
    const matchesLevel = selectedLevel === 'all' || tournament.level === selectedLevel;
    const matchesStatus = selectedStatus === 'all' || tournament.status === selectedStatus;
    
    return matchesSearch && matchesSport && matchesLevel && matchesStatus;
  });

  const sports = [...new Set(tournaments.map(t => t.sport))];

  const handleRegisterTournament = async (tournamentId: string) => {
    setIsLoading(true);
    try {
      // Aquí iría la llamada a la API para inscribirse al torneo
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('¡Te has inscrito exitosamente al torneo!');
      setShowRegistrationModal(false);
      setSelectedTournament(null);
    } catch (error) {
      console.error('Error registering for tournament:', error);
      alert('Error al inscribirse al torneo. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

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
                    Nivel
                  </label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Todos los niveles</option>
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                    <option value="open">Abierto</option>
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
                    <option value="registration-open">Inscripciones Abiertas</option>
                    <option value="upcoming">Próximamente</option>
                    <option value="in-progress">En Progreso</option>
                    <option value="completed">Finalizados</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTournaments.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No se encontraron torneos con los filtros seleccionados.</p>
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
                        getLevelColor(tournament.level)
                      }`}>
                        {getLevelText(tournament.level)}
                      </span>
                      {tournament.isRegistered && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Inscrito
                        </span>
                      )}
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
                    {tournament.currentParticipants}/{tournament.maxParticipants}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {tournament.location}
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
                        {formatCurrency(tournament.entryFee)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Premio 1er lugar</div>
                      <div className="font-semibold text-yellow-600">
                        {formatCurrency(tournament.prizes.first)}
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
                    {tournament.status === 'registration-open' && !tournament.isRegistered && (
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
    </div>
  );

  const renderMyTournaments = () => (
    <div className="space-y-6">
      {userTournaments.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-4">No tienes torneos registrados aún.</p>
          <button
            onClick={() => setActiveTab('available')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Explorar Torneos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {userTournaments.map((userTournament) => {
            const tournament = tournaments.find(t => t.id === userTournament.tournamentId);
            if (!tournament) return null;

            return (
              <div key={userTournament.tournamentId} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${
                          getUserStatusColor(userTournament.status)
                        }`}>
                          {getUserStatusIcon(userTournament.status)}
                          <span className="ml-1">{getUserStatusText(userTournament.status)}</span>
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {userTournament.sport}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {userTournament.tournamentName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Inscrito el {formatDate(userTournament.registrationDate)}
                      </p>
                    </div>
                  </div>

                  {userTournament.nextMatch && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                        <Zap className="h-4 w-4 mr-2" />
                        Próximo Partido
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                        <div>
                          <span className="font-medium">Fecha:</span> {formatDate(userTournament.nextMatch.date)}
                        </div>
                        <div>
                          <span className="font-medium">Hora:</span> {userTournament.nextMatch.time}
                        </div>
                        <div>
                          <span className="font-medium">Oponente:</span> {userTournament.nextMatch.opponent}
                        </div>
                        <div>
                          <span className="font-medium">Cancha:</span> {userTournament.nextMatch.court}
                        </div>
                      </div>
                    </div>
                  )}

                  {userTournament.currentRound && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-500">Estado actual</div>
                      <div className="font-medium text-gray-900">{userTournament.currentRound}</div>
                    </div>
                  )}

                  {userTournament.finalPosition && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-yellow-900">
                            Posición Final: #{userTournament.finalPosition}
                          </div>
                          {userTournament.prize && (
                            <div className="text-sm text-yellow-800">
                              Premio: {formatCurrency(userTournament.prize)}
                            </div>
                          )}
                        </div>
                        <Gift className="h-6 w-6 text-yellow-600" />
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(tournament.startDate)}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        {tournament.location}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
              Mis Torneos ({userTournaments.length})
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
                      getLevelColor(selectedTournament.level)
                    }`}>
                      {getLevelText(selectedTournament.level)}
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
                            width: `${(selectedTournament.currentParticipants / selectedTournament.maxParticipants) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Costo de Inscripción</div>
                      <div className="text-lg font-semibold text-blue-600">
                        {formatCurrency(selectedTournament.entryFee)}
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
                          {formatCurrency(selectedTournament.prizes.first)}
                        </div>
                      </div>
                      <div className="text-center">
                        <Medal className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                        <div className="text-xs text-gray-500">2do Lugar</div>
                        <div className="font-semibold text-gray-600">
                          {formatCurrency(selectedTournament.prizes.second)}
                        </div>
                      </div>
                      <div className="text-center">
                        <Award className="h-6 w-6 text-orange-500 mx-auto mb-1" />
                        <div className="text-xs text-gray-500">3er Lugar</div>
                        <div className="font-semibold text-orange-600">
                          {formatCurrency(selectedTournament.prizes.third)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Reglas del Torneo</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {selectedTournament.rules.map((rule, index) => (
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
                  {selectedTournament.status === 'registration-open' && !selectedTournament.isRegistered && (
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
                    {formatCurrency(selectedTournament.entryFee)}
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
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Inscribiendo...' : 'Confirmar Inscripción'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}