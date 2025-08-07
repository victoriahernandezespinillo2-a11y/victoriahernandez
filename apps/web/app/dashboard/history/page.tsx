'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  TrendingUp,
  Filter,
  Download,
  Search,
  ChevronDown,
  Star,
  Trophy,
  Target,
  Activity,
  BarChart3,
} from 'lucide-react';

interface HistoryItem {
  id: string;
  type: 'reservation' | 'tournament' | 'training';
  sport: string;
  court: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  cost: number;
  credits: number;
  status: 'completed' | 'cancelled' | 'no-show';
  rating?: number;
  participants?: string[];
  notes?: string;
}

interface MonthlyStats {
  month: string;
  totalReservations: number;
  totalHours: number;
  totalCost: number;
  favoritesSport: string;
  averageRating: number;
}

// Mock data - En producción esto vendría de la API
const historyData: HistoryItem[] = [
  {
    id: '1',
    type: 'reservation',
    sport: 'Fútbol',
    court: 'Cancha A1',
    date: '2024-01-15',
    startTime: '18:00',
    endTime: '19:00',
    duration: 60,
    cost: 50000,
    credits: 50,
    status: 'completed',
    rating: 5,
    participants: ['Juan Pérez', 'María García', 'Carlos López'],
    notes: 'Excelente partido, cancha en perfectas condiciones'
  },
  {
    id: '2',
    type: 'tournament',
    sport: 'Tenis',
    court: 'Cancha T2',
    date: '2024-01-12',
    startTime: '16:00',
    endTime: '18:00',
    duration: 120,
    cost: 0,
    credits: 0,
    status: 'completed',
    rating: 4,
    notes: 'Torneo mensual - Segundo lugar'
  },
  {
    id: '3',
    type: 'reservation',
    sport: 'Baloncesto',
    court: 'Cancha B1',
    date: '2024-01-10',
    startTime: '20:00',
    endTime: '21:30',
    duration: 90,
    cost: 75000,
    credits: 75,
    status: 'completed',
    rating: 4,
    participants: ['Ana Rodríguez', 'Luis Martín']
  },
  {
    id: '4',
    type: 'reservation',
    sport: 'Fútbol',
    court: 'Cancha A2',
    date: '2024-01-08',
    startTime: '19:00',
    endTime: '20:00',
    duration: 60,
    cost: 50000,
    credits: 50,
    status: 'cancelled',
    notes: 'Cancelado por lluvia'
  },
  {
    id: '5',
    type: 'training',
    sport: 'Tenis',
    court: 'Cancha T1',
    date: '2024-01-05',
    startTime: '15:00',
    endTime: '16:00',
    duration: 60,
    cost: 80000,
    credits: 80,
    status: 'completed',
    rating: 5,
    notes: 'Sesión de entrenamiento personal'
  }
];

const monthlyStats: MonthlyStats[] = [
  {
    month: 'Enero 2024',
    totalReservations: 12,
    totalHours: 18,
    totalCost: 600000,
    favoritesSport: 'Fútbol',
    averageRating: 4.5
  },
  {
    month: 'Diciembre 2023',
    totalReservations: 8,
    totalHours: 12,
    totalCost: 400000,
    favoritesSport: 'Tenis',
    averageRating: 4.2
  }
];

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      case 'no-show':
        return 'No asistió';
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tournament':
        return <Trophy className="h-4 w-4" />;
      case 'training':
        return <Target className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'tournament':
        return 'Torneo';
      case 'training':
        return 'Entrenamiento';
      default:
        return 'Reserva';
    }
  };

  const filteredHistory = historyData.filter(item => {
    const matchesSearch = item.sport.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.court.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = selectedSport === 'all' || item.sport === selectedSport;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesMonth = selectedMonth === 'all' || 
                        new Date(item.date).toISOString().slice(0, 7) === selectedMonth;
    
    return matchesSearch && matchesSport && matchesStatus && matchesMonth;
  });

  const sports = [...new Set(historyData.map(item => item.sport))];
  const months = [...new Set(historyData.map(item => item.date.slice(0, 7)))];

  const totalStats = {
    totalReservations: historyData.filter(item => item.status === 'completed').length,
    totalHours: historyData.filter(item => item.status === 'completed')
                          .reduce((sum, item) => sum + item.duration, 0) / 60,
    totalSpent: historyData.filter(item => item.status === 'completed')
                          .reduce((sum, item) => sum + item.cost, 0),
    averageRating: historyData.filter(item => item.rating)
                             .reduce((sum, item) => sum + (item.rating || 0), 0) / 
                   historyData.filter(item => item.rating).length
  };

  const handleExportData = () => {
    // Aquí iría la lógica para exportar los datos
    alert('Exportando datos del historial...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Actividades</h1>
          <p className="text-gray-500 mt-1">
            Revisa todas tus reservas, torneos y entrenamientos pasados
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'stats'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Estadísticas
            </button>
          </div>
          <button
            onClick={handleExportData}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {viewMode === 'stats' ? (
        /* Statistics View */
        <div className="space-y-6">
          {/* Overall Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Estadísticas Generales
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {totalStats.totalReservations}
                  </div>
                  <div className="text-sm text-gray-500">Reservas Completadas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {totalStats.totalHours.toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-500">Horas Jugadas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {formatCurrency(totalStats.totalSpent)}
                  </div>
                  <div className="text-sm text-gray-500">Total Gastado</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 flex items-center justify-center">
                    {totalStats.averageRating.toFixed(1)}
                    <Star className="h-6 w-6 ml-1 fill-current" />
                  </div>
                  <div className="text-sm text-gray-500">Calificación Promedio</div>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Estadísticas Mensuales
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {monthlyStats.map((stat, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">{stat.month}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {stat.totalReservations}
                        </div>
                        <div className="text-gray-500">Reservas</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {stat.totalHours}h
                        </div>
                        <div className="text-gray-500">Horas</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {formatCurrency(stat.totalCost)}
                        </div>
                        <div className="text-gray-500">Gastado</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-orange-600">
                          {stat.favoritesSport}
                        </div>
                        <div className="text-gray-500">Deporte Favorito</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-yellow-600 flex items-center">
                          {stat.averageRating}
                          <Star className="h-4 w-4 ml-1 fill-current" />
                        </div>
                        <div className="text-gray-500">Calificación</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por deporte o cancha..."
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
                        Estado
                      </label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">Todos los estados</option>
                        <option value="completed">Completado</option>
                        <option value="cancelled">Cancelado</option>
                        <option value="no-show">No asistió</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mes
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">Todos los meses</option>
                        {months.map(month => (
                          <option key={month} value={month}>
                            {new Date(month + '-01').toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long'
                            })}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* History List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                Historial de Actividades
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({filteredHistory.length} resultados)
                </span>
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No se encontraron actividades con los filtros seleccionados.</p>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center text-blue-600">
                            {getTypeIcon(item.type)}
                            <span className="ml-1 text-sm font-medium">
                              {getTypeText(item.type)}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            getStatusColor(item.status)
                          }`}>
                            {getStatusText(item.status)}
                          </span>
                          {item.rating && (
                            <div className="flex items-center text-yellow-500">
                              <Star className="h-4 w-4 fill-current" />
                              <span className="ml-1 text-sm font-medium">
                                {item.rating}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {item.sport} - {item.court}
                        </h3>
                        
                        <div className="flex flex-wrap items-center text-sm text-gray-500 space-x-4 mb-2">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(item.date)}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {item.startTime} - {item.endTime} ({item.duration} min)
                          </div>
                          {item.participants && (
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {item.participants.length} participantes
                            </div>
                          )}
                        </div>
                        
                        {item.notes && (
                          <p className="text-sm text-gray-600 mb-2">{item.notes}</p>
                        )}
                        
                        {item.participants && (
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">Participantes: </span>
                            {item.participants.join(', ')}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="text-lg font-semibold text-gray-900">
                          {item.cost > 0 ? formatCurrency(item.cost) : 'Gratis'}
                        </div>
                        {item.credits > 0 && (
                          <div className="text-sm text-gray-500">
                            {item.credits} créditos
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}