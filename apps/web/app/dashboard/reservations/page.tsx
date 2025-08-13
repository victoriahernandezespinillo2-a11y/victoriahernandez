'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Filter,
  Search,
  Plus,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useReservations } from '@/lib/hooks';

interface Reservation {
  id: string;
  courtName: string;
  courtType: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  cost: number;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  createdAt: string;
  notes?: string;
}



const statusConfig = {
  confirmed: {
    label: 'Confirmada',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  pending: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertCircle
  },
  cancelled: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  },
  completed: {
    label: 'Completada',
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircle
  }
};

const paymentConfig: Record<Reservation['paymentStatus'], { label: string; color: string }> = {
  paid: { label: 'Pagado', color: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendiente de pago', color: 'bg-yellow-100 text-yellow-800' },
  refunded: { label: 'Reembolsado', color: 'bg-blue-100 text-blue-800' },
};

export default function ReservationsPage() {
  const { reservations, loading, error, cancelReservation } = useReservations();
  const [linkLoadingId, setLinkLoadingId] = useState<string | null>(null);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Filtrar reservas
  const applyFilters = () => {
    let filtered = reservations || [];

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(reservation => 
        reservation.courtName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.courtType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(reservation => reservation.status === statusFilter);
    }

    // Filtro por fecha
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(reservation => {
        const reservationDate = new Date(reservation.date);
        
        switch (dateFilter) {
          case 'upcoming':
            return reservationDate >= today;
          case 'past':
            return reservationDate < today;
          case 'this_week':
            const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            return reservationDate >= today && reservationDate <= weekFromNow;
          case 'this_month':
            return reservationDate.getMonth() === now.getMonth() && 
                   reservationDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    setFilteredReservations(filtered);
  };

  // Aplicar filtros cuando cambien los datos o filtros
  useEffect(() => {
    applyFilters();
  }, [reservations, searchTerm, statusFilter, dateFilter]);

  const handleCancelReservation = async (reservationId: string) => {
    if (confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
      try {
        await cancelReservation(reservationId);
      } catch (error) {
        console.error('Error al cancelar la reserva:', error);
        alert('Error al cancelar la reserva. Por favor, inténtalo de nuevo.');
      }
    }
  };

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
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error al cargar las reservas
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Mis Reservas</h1>
          <p className="text-gray-500 mt-1">
            Gestiona todas tus reservas de canchas deportivas
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/dashboard/reservations/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Reserva
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por cancha o deporte..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                applyFilters();
              }}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                applyFilters();
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="confirmed">Confirmadas</option>
              <option value="pending">Pendientes</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                applyFilters();
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">Todas las fechas</option>
              <option value="upcoming">Próximas</option>
              <option value="this_week">Esta semana</option>
              <option value="this_month">Este mes</option>
              <option value="past">Pasadas</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('all');
                setFilteredReservations(reservations || []);
              }}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredReservations.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron reservas
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Intenta ajustar los filtros para ver más resultados.'
                : 'Aún no tienes reservas. ¡Haz tu primera reserva!'}
            </p>
            <Link
              href="/dashboard/reservations/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Reserva
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReservations.map((reservation) => {
              const StatusIcon = statusConfig[reservation.status].icon;
              return (
                <div key={reservation.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <MapPin className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {reservation.courtName}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[reservation.status].color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[reservation.status].label}
                          </span>
                          {reservation.paymentStatus === 'pending' && (
                            <button
                              disabled={linkLoadingId === reservation.id}
                              onClick={async () => {
                                try {
                                  setLinkLoadingId(reservation.id);
                                  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
                                  const res = await fetch(`${API_BASE_URL}/api/reservations/${reservation.id}/payment-link`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                  });
                                  const data = await res.json();
                                  if (res.ok && data?.url) {
                                    window.open(data.url, '_blank');
                                  } else {
                                    alert('No se pudo generar el enlace de pago');
                                  }
                                } catch (e) {
                                  alert('Error generando enlace de pago');
                                } finally {
                                  setLinkLoadingId(null);
                                }
                              }}
                              className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50"
                            >
                              {linkLoadingId === reservation.id ? 'Abriendo…' : 'Pagar ahora'}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(reservation.date)}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {reservation.startTime} - {reservation.endTime}
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(reservation.cost)}
                          </span>
                        </div>
                        {reservation.notes && (
                          <p className="text-sm text-gray-600 mt-2">
                            {reservation.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedReservation(reservation)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </button>
                      {/* Descargar recibo si está pagado */}
                      {reservation.paymentStatus === 'paid' && (
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/reservations/${reservation.id}/receipt`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Descargar recibo
                        </a>
                      )}
                      {(reservation.status === 'confirmed' || reservation.status === 'pending') && (
                        <button
                          onClick={() => handleCancelReservation(reservation.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Estado de pago */}
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentConfig[reservation.paymentStatus].color}`}>
                      {paymentConfig[reservation.paymentStatus].label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles de la Reserva
              </h3>
              <button
                onClick={() => setSelectedReservation(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Cancha:</span>
                <p className="text-gray-900">{selectedReservation.courtName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Deporte:</span>
                <p className="text-gray-900">{selectedReservation.courtType}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Fecha:</span>
                <p className="text-gray-900">{formatDate(selectedReservation.date)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Horario:</span>
                <p className="text-gray-900">
                  {selectedReservation.startTime} - {selectedReservation.endTime}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Duración:</span>
                <p className="text-gray-900">{selectedReservation.duration} minutos</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Costo:</span>
                <p className="text-gray-900">{formatCurrency(selectedReservation.cost)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Estado:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[selectedReservation.status].color}`}>
                  {statusConfig[selectedReservation.status].label}
                </span>
              </div>
              {selectedReservation.notes && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Notas:</span>
                  <p className="text-gray-900">{selectedReservation.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}