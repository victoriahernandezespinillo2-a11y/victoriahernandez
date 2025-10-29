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
  ChevronRight,
  Download,
  QrCode,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getFirebaseIdTokenSafe } from '@/lib/api';
import { useReservations } from '@/lib/hooks';
import { useErrorModal } from '@/app/components/ErrorModal';
import { ReservationPaymentModal } from '@/components/ReservationPaymentModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui/dialog';
import { Button } from '@repo/ui/button';

// Hook para detectar dispositivo móvil
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}

interface Reservation {
  id: string;
  courtName: string;
  courtType: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no-show' | 'in_progress';
  cost: number;
  paymentStatus: 'paid' | 'pending' | 'refunded' | 'cancelled';
  paymentMethod?: 'CARD' | 'BIZUM' | 'ONSITE' | 'CASH' | 'TRANSFER' | 'CREDITS' | 'FREE';
  createdAt: string;
  notes?: string;
  promoCode?: string;
  promoDiscount?: number;
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
  },
  'no-show': {
    label: 'No se presentó',
    color: 'bg-orange-100 text-orange-800',
    icon: XCircle
  },
  'in_progress': {
    label: 'En Uso',
    color: 'bg-purple-100 text-purple-800',
    icon: Clock
  }
};

const paymentMethodConfig = {
  CARD: { label: 'Tarjeta', icon: '💳', color: 'bg-blue-100 text-blue-800' },
  BIZUM: { label: 'Bizum', icon: '📱', color: 'bg-purple-100 text-purple-800' },
  ONSITE: { label: 'En Sede', icon: '🏢', color: 'bg-orange-100 text-orange-800' },
  CASH: { label: 'Efectivo', icon: '💵', color: 'bg-green-100 text-green-800' },
  TRANSFER: { label: 'Transferencia', icon: '🏦', color: 'bg-gray-100 text-gray-800' },
  CREDITS: { label: 'Créditos', icon: '⭐', color: 'bg-yellow-100 text-yellow-800' },
  FREE: { label: 'Gratis', icon: '🎉', color: 'bg-green-100 text-green-800' }
};

const paymentStatusConfig = {
  paid: { label: 'Pagado', color: 'bg-green-100 text-green-800', icon: '✅' },
  pending: { label: 'Pendiente', color: 'bg-orange-100 text-orange-800', icon: '⏳' },
  refunded: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-800', icon: '↩️' },
  cancelled: { label: 'No Pagado', color: 'bg-red-100 text-red-800', icon: '❌' }
};

const paymentConfig: Record<Reservation['paymentStatus'], { label: string; color: string }> = {
  paid: { label: 'Pagado', color: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendiente de pago', color: 'bg-yellow-100 text-yellow-800' },
  refunded: { label: 'Reembolsado', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'No Pagado', color: 'bg-red-100 text-red-800' },
};

export default function ReservationsPage() {
  const { reservations, loading, error, cancelReservation, getReservations } = useReservations();
  const isMobile = useIsMobile();
  const { showError, ErrorModalComponent } = useErrorModal();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [linkLoadingId, setLinkLoadingId] = useState<string | null>(null);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedReservationForPayment, setSelectedReservationForPayment] = useState<Reservation | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reservationIdToCancel, setReservationIdToCancel] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://polideportivo-api.vercel.app').replace(/\/$/, '');

  const openPaymentModal = (reservation: Reservation) => {
    setSelectedReservationForPayment(reservation);
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    getReservations(); // Recargar reservas
    setPaymentModalOpen(false);
    setSelectedReservationForPayment(null);
  };

  // Abrir modal de pago si viene indicado por query (?payStart=ISO o ?pay=ID)
  useEffect(() => {
    const payId = searchParams.get('pay');
    const payStart = searchParams.get('payStart');
    if (!reservations || (!payId && !payStart)) return;

    let target: Reservation | undefined;
    if (payId) {
      target = reservations.find(r => r.id === payId);
    }
    if (!target && payStart) {
      // Comparar por inicio (ISO). Tolerancia: exacta
      target = reservations.find(r => (r.startTime || '').startsWith(payStart.substring(0, 16)));
    }
    if (target && target.paymentStatus === 'pending') {
      openPaymentModal(target);
      // limpiar query para evitar reabrir al navegar dentro
      try {
        router.replace('/dashboard/reservations');
      } catch {}
    }
  }, [reservations, searchParams]);

  const openReservationPdf = async (id: string, kind: 'receipt' | 'pass') => {
    try {
      // 1) Obtener Firebase ID Token
      const idToken = await getFirebaseIdTokenSafe();
      let jwtToken: string | null = null;
      if (idToken) {
        // 2) Intercambiar por nuestro JWT
        const res = await fetch(`${API_BASE}/api/auth/token`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          jwtToken = data?.token || null;
        }
      }

      const headers: Record<string, string> = {};
      if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;

      const response = await fetch(`${API_BASE}/api/reservations/${id}/${kind}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      if (!response.ok) {
        const text = await response.text();
        const msg = text?.trim().toLowerCase();
        if (response.status === 401) {
          showError('No autorizado. Inicia sesión para continuar.', 'Sesión Expirada', 'warning');
          return;
        }
        if (response.status === 404) {
          showError('La reserva no fue encontrada.', 'Reserva No Encontrada', 'error');
          return;
        }
        if (response.status === 410 || (msg && msg.includes('expirada'))) {
          showError(
            'El pase de acceso ya no está disponible. Los pases solo son válidos durante el horario de tu reserva y hasta 1 hora después de finalizada.',
            'Pase No Disponible',
            'info'
          );
          return;
        }
        if (response.status === 400) {
          // Mensaje específico para reservas ya utilizadas o con problemas de estado
          const errorMessage = text || 'No se puede generar el pase de acceso en este momento.';
          showError(errorMessage, 'Pase No Disponible', 'warning');
          return;
        }
        showError(text || `Error del servidor (${response.status})`, 'Error del Sistema', 'error');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      showError(e?.message || 'No se pudo abrir el documento', 'Error del Sistema', 'error');
    }
  };

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

  // Cargar reservas del usuario al montar
  useEffect(() => {
    getReservations().catch(() => {});
  }, [getReservations]);

  const handleCancelReservation = (reservationId: string) => {
    setReservationIdToCancel(reservationId);
    setCancelDialogOpen(true);
  };

  const confirmCancelReservation = async () => {
    if (!reservationIdToCancel) return;
    try {
      setIsCancelling(true);
      await cancelReservation(reservationIdToCancel);
      setCancelDialogOpen(false);
      setReservationIdToCancel(null);
    } catch (error) {
      console.error('Error al cancelar la reserva:', error);
      try {
        showError('No se pudo cancelar la reserva. Por favor, inténtalo de nuevo.');
      } catch {}
    } finally {
      setIsCancelling(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
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
    <div className="space-y-6 pb-24">
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
          <div className={isMobile ? "space-y-3 p-3 pb-6" : "divide-y divide-gray-200"}>
            {filteredReservations.map((reservation) => {
              const StatusIcon = statusConfig[reservation.status].icon;
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const reservationDate = new Date(reservation.date);
              const isPastDate = reservationDate < today;
              
              if (isMobile) {
                // 🎨 DISEÑO MÓVIL OPTIMIZADO
                return (
                  <div key={reservation.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header con icono y estados */}
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                            <MapPin className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight">
                              {reservation.courtName}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusConfig[reservation.status].color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig[reservation.status].label}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${paymentStatusConfig[reservation.paymentStatus].color}`}>
                                <span className="mr-1">{paymentStatusConfig[reservation.paymentStatus].icon}</span>
                                {paymentStatusConfig[reservation.paymentStatus].label}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Botón principal de acción */}
                        <button
                          onClick={() => setSelectedReservation(reservation)}
                          className="flex-shrink-0 w-10 h-10 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors"
                        >
                          <ChevronRight className="h-5 w-5 text-blue-600" />
                        </button>
                      </div>
                    </div>

                    {/* Información de fecha y hora */}
                    <div className="px-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1.5 text-blue-500" />
                            {formatDate(reservation.date)}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1.5 text-blue-500" />
                            {reservation.startTime} - {reservation.endTime}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {formatCurrency(reservation.cost)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Información de pago */}
                    {reservation.paymentMethod && (
                      <div className="px-4 pb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="mr-2">Método:</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${paymentMethodConfig[reservation.paymentMethod]?.color || 'bg-gray-100 text-gray-800'}`}>
                            <span className="mr-1">{paymentMethodConfig[reservation.paymentMethod]?.icon || '💳'}</span>
                            {paymentMethodConfig[reservation.paymentMethod]?.label || reservation.paymentMethod}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Información de promoción */}
                    {reservation.promoCode && (
                      <div className="px-4 pb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">🎁 Promoción:</span>
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-800">
                            {reservation.promoCode}
                          </span>
                          {reservation.promoDiscount && reservation.promoDiscount > 0 && (
                            <span className="ml-2 text-xs text-green-600 font-medium">
                              -€{reservation.promoDiscount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Alerta de pago pendiente */}
                    {reservation.paymentStatus === 'pending' && reservation.paymentMethod === 'ONSITE' && (
                      <div className="mx-4 mb-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-2 text-lg">⚠️</span>
                            <div className="text-sm">
                              <p className="text-orange-800 font-semibold">Pago pendiente en el centro</p>
                              <p className="text-orange-700 text-xs mt-1">
                                Presenta este comprobante en recepción
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Botón de pago para pendientes online */}
                    {reservation.paymentStatus === 'pending' && reservation.paymentMethod !== 'ONSITE' && (
                      <div className="px-4 pb-3">
                        <button
                          onClick={() => openPaymentModal(reservation)}
                          className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          Pagar ahora
                        </button>
                      </div>
                    )}

                    {/* Acciones secundarias */}
                    <div className="px-4 pb-4">
                      <div className="flex space-x-2">
                        {(reservation.status === 'confirmed' || reservation.paymentStatus === 'paid') && !isPastDate && (
                          <button
                            onClick={() => openReservationPdf(reservation.id, 'pass')}
                            className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center transition-colors"
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            Pase QR
                          </button>
                        )}
                        
                        {reservation.paymentStatus === 'paid' && (
                          <button
                            onClick={() => openReservationPdf(reservation.id, 'receipt')}
                            className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center transition-colors"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Recibo
                          </button>
                        )}
                        
                        {(reservation.status === 'confirmed' || reservation.status === 'pending') && (
                          <button
                            onClick={() => handleCancelReservation(reservation.id)}
                            className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center transition-colors"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Notas si existen */}
                    {reservation.notes && (
                      <div className="px-4 pb-4">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Nota:</span> {reservation.notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              } else {
                // 🖥️ DISEÑO ESCRITORIO ORIGINAL
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatusConfig[reservation.paymentStatus].color}`}>
                              <span className="mr-1">{paymentStatusConfig[reservation.paymentStatus].icon}</span>
                              {paymentStatusConfig[reservation.paymentStatus].label}
                            </span>
                          </div>
                          
                          {/* Información de pago más detallada */}
                          <div className="mt-2 space-y-1">
                            {reservation.paymentMethod && (
                              <div className="flex items-center text-sm text-gray-600">
                                <span className="mr-2">Método:</span>
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${paymentMethodConfig[reservation.paymentMethod]?.color || 'bg-gray-100 text-gray-800'}`}>
                                  <span className="mr-1">{paymentMethodConfig[reservation.paymentMethod]?.icon || '💳'}</span>
                                  {paymentMethodConfig[reservation.paymentMethod]?.label || reservation.paymentMethod}
                                </span>
                              </div>
                            )}
                            
                            {reservation.promoCode && (
                              <div className="flex items-center text-sm text-gray-600">
                                <span className="mr-2">🎁 Promoción:</span>
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  {reservation.promoCode}
                                </span>
                                {reservation.promoDiscount && reservation.promoDiscount > 0 && (
                                  <span className="ml-2 text-xs text-green-600 font-medium">
                                    -€{reservation.promoDiscount.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {reservation.paymentStatus === 'pending' && reservation.paymentMethod === 'ONSITE' && (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
                                <div className="flex items-start">
                                  <span className="text-orange-600 mr-2">⚠️</span>
                                  <div className="text-sm">
                                    <p className="text-orange-800 font-medium">Pago pendiente en el centro</p>
                                    <p className="text-orange-700 text-xs mt-1">
                                      Presenta este comprobante en recepción para completar tu pago
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {reservation.paymentStatus === 'pending' && reservation.paymentMethod !== 'ONSITE' && (
                              <button
                                disabled={linkLoadingId === reservation.id}
                                onClick={async () => {
                                  try {
                                    setLinkLoadingId(reservation.id);
                                    const res = await fetch(`/api/reservations/${reservation.id}/payment-link`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                    });
                                    const data = await res.json();
                                    if (res.ok && data?.url) {
                                      window.open(data.url, '_blank');
                                    } else {
                                      showError('No se pudo generar el enlace de pago', 'Error de Pago', 'error');
                                    }
                                  } catch (e) {
                                    showError('Error generando enlace de pago', 'Error de Sistema', 'error');
                                  } finally {
                                    setLinkLoadingId(null);
                                  }
                                }}
                                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
                        
                        {/* Botón de Pase QR con lógica mejorada */}
                        {(reservation.status === 'confirmed' || reservation.paymentStatus === 'paid') && !isPastDate && (
                          <button
                            onClick={() => {
                              // Verificar si la reserva ya fue utilizada
                              if (reservation.status === 'completed' || reservation.status === 'in_progress') {
                                showError('Esta reserva ya fue utilizada. El pase de acceso no está disponible para reservas que ya fueron canjeadas.');
                                return;
                              }
                              openReservationPdf(reservation.id, 'pass');
                            }}
                            className={`inline-flex items-center px-3 py-1.5 border rounded-md text-sm font-medium transition-colors ${
                              reservation.status === 'completed' || reservation.status === 'in_progress'
                                ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                                : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'
                            }`}
                            title={
                              reservation.status === 'completed' || reservation.status === 'in_progress'
                                ? 'Esta reserva ya fue utilizada'
                                : 'Descargar pase de acceso con código QR'
                            }
                            disabled={reservation.status === 'completed' || reservation.status === 'in_progress'}
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 16h4.01M4 8h4m0 0V4m0 4L4 8l4 4m6-4h2.01M8 16H4.01" />
                            </svg>
                            {reservation.status === 'completed' || reservation.status === 'in_progress' ? 'Ya Usado' : 'Pase QR'}
                          </button>
                        )}
                        
                        {/* Descargar recibo si está pagado */}
                        {reservation.paymentStatus === 'paid' && (
                          <button
                            onClick={() => openReservationPdf(reservation.id, 'receipt')}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Recibo
                          </button>
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
              }
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
            
            {/* Acciones del modal */}
            <div className="mt-6 flex flex-col space-y-3">
              {/* Botón prominente para descargar Pase QR */}
              {(selectedReservation.status === 'confirmed' || selectedReservation.paymentStatus === 'paid') && (
                <button
                  onClick={() => openReservationPdf(selectedReservation.id, 'pass')}
                  className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 16h4.01M4 8h4m0 0V4m0 4L4 8l4 4m6-4h2.01M8 16H4.01" />
                  </svg>
                  📱 Descargar Pase de Acceso
                </button>
              )}
              
              {/* Botones secundarios */}
              <div className="flex space-x-3">
                {selectedReservation.paymentStatus === 'paid' && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/reservations/${selectedReservation.id}/receipt`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Recibo
                  </a>
                )}
                
                {(selectedReservation.status === 'confirmed' || selectedReservation.status === 'pending') && (
                  <button
                    onClick={() => {
                      handleCancelReservation(selectedReservation.id);
                      setSelectedReservation(null);
                    }}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Pago de Reserva */}
      {selectedReservationForPayment && (
        <ReservationPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedReservationForPayment(null);
          }}
          reservationId={selectedReservationForPayment.id}
          reservation={{
            id: selectedReservationForPayment.id,
            courtName: selectedReservationForPayment.courtName,
            startTime: selectedReservationForPayment.startTime,
            endTime: selectedReservationForPayment.endTime,
            totalPrice: Number(selectedReservationForPayment.cost || 0)
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
      
      {/* Modal de Error Profesional */}
      <ErrorModalComponent />

      {/* Modal de confirmación de cancelación (estilo del sistema) */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Reserva</DialogTitle>
            <p className="mt-1 text-sm text-gray-600">
              ¿Estás seguro de que quieres cancelar esta reserva? Se liberará el horario y no podrás deshacer esta acción.
            </p>
          </DialogHeader>
          <div className="mt-4 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              No cancelar
            </Button>
            <Button
              onClick={confirmCancelReservation}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isCancelling ? 'Cancelando…' : 'Cancelar reserva'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}