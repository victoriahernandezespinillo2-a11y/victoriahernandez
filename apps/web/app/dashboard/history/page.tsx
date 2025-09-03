'use client';

import { useState, useEffect } from 'react';
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
import { useUserProfile, useUserHistory } from '@/lib/hooks';
import { useEffect as useMountedEffect } from 'react';

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

// Función para transformar datos de la API al formato del componente
const transformReservationToHistoryItem = (reservation: any): HistoryItem => {
  console.log('🔄 [HISTORY] Transformando reserva:', reservation);
  
  const startTime = new Date(reservation.startTime);
  const endTime = new Date(reservation.endTime);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  
  const transformed = {
    id: reservation.id,
    type: 'reservation', // Por ahora solo manejamos reservas
    sport: reservation.court?.sportType || 'Desconocido',
    court: reservation.court?.name || 'Cancha desconocida',
    date: startTime.toISOString().substring(0, 10),
    startTime: startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    endTime: endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    duration,
    cost: Number(reservation.totalPrice || 0),
    credits: 0, // Por ahora no manejamos créditos
    status: mapReservationStatus(reservation.status),
    rating: reservation.rating,
    notes: reservation.notes
  };
  
  console.log('✅ [HISTORY] Reserva transformada:', transformed);
  return transformed;
};

// Función para mapear estados de reserva
const mapReservationStatus = (status: string): 'completed' | 'cancelled' | 'no-show' => {
  console.log('🔄 [HISTORY] Mapeando estado:', status);
  
  const mapped = (() => {
    switch (status) {
      case 'COMPLETED':
        return 'completed';
      case 'CANCELLED':
        return 'cancelled';
      case 'NO_SHOW':
        return 'no-show';
      case 'IN_PROGRESS':
      case 'PAID':
      case 'PENDING':
        return 'completed'; // Considerar como completado para estadísticas
      default:
        console.log('⚠️ [HISTORY] Estado no reconocido, usando completed:', status);
        return 'completed';
    }
  })();
  
  console.log('✅ [HISTORY] Estado mapeado:', status, '→', mapped);
  return mapped;
};

// Función para calcular estadísticas mensuales
const calculateMonthlyStats = (data: HistoryItem[]): MonthlyStats[] => {
  console.log('📊 [HISTORY] Calculando estadísticas para', data.length, 'elementos');
  
  if (data.length === 0) {
    console.log('⚠️ [HISTORY] No hay datos para calcular estadísticas');
    return [];
  }
  
  const monthlyData: { [key: string]: HistoryItem[] } = {};
  
  // Agrupar por mes
  data.forEach(item => {
    const date = new Date(item.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = [];
    }
    monthlyData[monthKey].push(item);
  });
  
  console.log('📅 [HISTORY] Datos agrupados por mes:', monthlyData);
  
  // Calcular estadísticas para cada mes
  const stats = Object.entries(monthlyData)
    .map(([monthKey, items]) => {
      const completedItems = items.filter(item => item.status === 'completed');
      const totalHours = completedItems.reduce((sum, item) => sum + item.duration, 0) / 60;
      const totalCost = completedItems.reduce((sum, item) => sum + item.cost, 0);
      const ratingsItems = completedItems.filter(item => item.rating);
      const averageRating = ratingsItems.length > 0 
        ? ratingsItems.reduce((sum, item) => sum + (item.rating || 0), 0) / ratingsItems.length 
        : 0;
      
      // Encontrar deporte favorito
      const sportCounts: { [key: string]: number } = {};
      completedItems.forEach(item => {
        sportCounts[item.sport] = (sportCounts[item.sport] || 0) + 1;
      });
      const favoritesSport = Object.entries(sportCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
      
      const date = new Date(monthKey + '-01');
      const monthName = date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long' 
      });
      
      const stat = {
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        totalReservations: completedItems.length,
        totalHours: Math.round(totalHours * 10) / 10,
        totalCost,
        favoritesSport,
        averageRating: Math.round(averageRating * 10) / 10
      };
      
      console.log(`📈 [HISTORY] Estadísticas para ${monthKey}:`, stat);
      return stat;
    })
    .sort((a, b) => b.month.localeCompare(a.month)); // Ordenar por mes descendente
  
  console.log('🎯 [HISTORY] Estadísticas finales calculadas:', stats);
  return stats;
};

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  
  // Hooks para obtener datos del usuario
  const { profile, getProfile } = useUserProfile();
  const { historyData: apiData, loading, error, getUserHistory } = useUserHistory();
  
  // Estado para los datos transformados
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  
  // Cargar datos cuando el perfil esté disponible
  useEffect(() => {
    if (profile?.id) {
      console.log('🚀 [HISTORY] Cargando historial para usuario:', profile.id);
      getUserHistory(profile.id, {
        limit: 100, // Obtener más datos para estadísticas
        page: 1
      }).catch(error => {
        console.error('❌ [HISTORY] Error cargando historial:', error);
      });
    }
  }, [profile?.id, getUserHistory]);

  // Asegurar que el perfil esté cargado al montar
  useMountedEffect(() => {
    if (!profile?.id) {
      console.log('🔄 [HISTORY] Perfil no disponible, cargando...');
      getProfile().catch((error) => {
        console.error('❌ [HISTORY] Error cargando perfil:', error);
      });
    } else {
      console.log('✅ [HISTORY] Perfil disponible:', profile.id);
    }
  }, [profile?.id, getProfile]);
  
  // Transformar datos cuando lleguen de la API
  useEffect(() => {
    console.log('🔍 [HISTORY] API Data recibida:', apiData);
    
    if (apiData?.reservations) {
      console.log('✅ [HISTORY] Reservas encontradas:', apiData.reservations.length);
      const transformedData = apiData.reservations.map(transformReservationToHistoryItem);
      setHistoryData(transformedData);
      
      // Calcular estadísticas mensuales
      const stats = calculateMonthlyStats(transformedData);
      setMonthlyStats(stats);
      console.log('📊 [HISTORY] Estadísticas calculadas:', stats);
    } else {
      console.log('⚠️ [HISTORY] No hay reservas en apiData:', apiData);
    }
  }, [apiData]);

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
  
  // Log para debuggear filtros
  useEffect(() => {
    console.log('🔍 [HISTORY] Filtros aplicados:', {
      searchTerm,
      selectedSport,
      selectedStatus,
      selectedMonth,
      totalItems: historyData.length,
      filteredItems: filteredHistory.length
    });
  }, [searchTerm, selectedSport, selectedStatus, selectedMonth, historyData.length, filteredHistory.length]);

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
  
  // Log para debuggear totalStats
  useEffect(() => {
    console.log('📊 [HISTORY] Total Stats actualizados:', totalStats);
  }, [totalStats]);

  const handleExportData = () => {
    // Aquí iría la lógica para exportar los datos
    alert('Exportando datos del historial...');
  };

  // Mostrar loading mientras se cargan los datos
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando historial...</span>
        </div>
      </div>
    );
  }

  // Mostrar mensaje cuando no hay datos y no está cargando
  if (!loading && (!apiData || !apiData.reservations || apiData.reservations.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="text-blue-600 mb-2">No hay historial disponible</div>
          <div className="text-blue-500 text-sm">
            {!apiData ? 'Cargando datos...' : 'No se encontraron reservas en tu historial.'}
          </div>
          <button 
            onClick={() => profile?.id && getUserHistory(profile.id, { limit: 100, page: 1 })}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
          <div className="text-xs text-blue-400 mt-2">
            Si no tienes reservas, puedes hacer una nueva reserva desde el calendario.
          </div>
        </div>
      </div>
    );
  }

  // Mostrar error si hay algún problema
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-2">Error al cargar el historial</div>
          <div className="text-red-500 text-sm">{error}</div>
          <button 
            onClick={() => profile?.id && getUserHistory(profile.id, { limit: 100, page: 1 })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
          <div className="text-xs text-red-400 mt-2">
            Si el problema persiste, verifica tu conexión a internet o contacta soporte.
          </div>
        </div>
      </div>
    );
  }

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
              {historyData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay estadísticas disponibles</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Las estadísticas aparecerán cuando tengas reservas completadas.
                  </p>
                </div>
              ) : (
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
              )}
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
                {monthlyStats.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay estadísticas disponibles</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Las estadísticas aparecerán cuando tengas reservas completadas.
                    </p>
                  </div>
                ) : (
                  monthlyStats.map((stat, index) => (
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
                  ))
                )}
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
                        {sports.length > 0 ? (
                          sports.map(sport => (
                            <option key={sport} value={sport}>{sport}</option>
                          ))
                        ) : (
                          <option value="" disabled>No hay deportes disponibles</option>
                        )}
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
                        {months.length > 0 ? (
                          months.map(month => (
                            <option key={month} value={month}>
                              {new Date(month + '-01').toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long'
                              })}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>No hay meses disponibles</option>
                        )}
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
                  <p>
                    {historyData.length === 0 
                      ? 'No hay actividades en tu historial.' 
                      : 'No se encontraron actividades con los filtros seleccionados.'
                    }
                  </p>
                  {historyData.length === 0 && (
                    <p className="text-sm text-gray-400 mt-2">
                      Las reservas completadas aparecerán aquí automáticamente.
                    </p>
                  )}
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