'use client';

import { useState, useEffect } from 'react';
import {
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAdminReservations } from '@/lib/hooks';
import { adminApi } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { confirm } from '@/components/ConfirmDialog';
import PaymentConfirmationModal from '@/components/PaymentConfirmationModal';

interface Reservation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courtId: string;
  courtName: string;
  centerName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  notes?: string;
  createdAt: string;
}




const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800',
  NO_SHOW: 'bg-gray-100 text-gray-800'
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  IN_PROGRESS: 'En curso',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No se presentó'
};

const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  REFUNDED: 'bg-blue-100 text-blue-800'
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  REFUNDED: 'Reembolsado'
};

export default function ReservationsPage() {
  const { reservations, loading, error, updateReservation, cancelReservation, getReservations } = useAdminReservations();
  const { showToast } = useToast();
  useEffect(() => {
    getReservations({ page: 1, limit: 200 }).catch(() => {});
  }, [getReservations]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE'); // Filtrar reservas activas por defecto
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [overrideFilter, setOverrideFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [refundState, setRefundState] = useState<{ open: boolean; id?: string; amount?: string; reason: string }>(() => ({ open: false, reason: '' }));
  const [resendState, setResendState] = useState<{ open: boolean; id?: string; type: 'CONFIRMATION'|'PAYMENT_LINK' }>({ open: false, type: 'CONFIRMATION' });
  const [payOnSiteState, setPayOnSiteState] = useState<{ open: boolean; id?: string; userName?: string; courtName?: string; totalAmount?: number; currentMethod?: string }>({ open: false });
  const [auditState, setAuditState] = useState<{ open: boolean; id?: string; loading: boolean; events: Array<{ id: string; type: string; summary: string; createdAt: string }> }>({ open: false, loading: false, events: [] });

  const itemsPerPage = 10;

  // Helpers de tiempo para gating de acciones (check-in)
  const toLocalDate = (ymd: string, hhmm: string) => {
    try {
      return new Date(`${ymd}T${hhmm}:00`);
    } catch {
      return new Date(NaN);
    }
  };
  const isWithinCheckInWindow = (r: any, toleranceMin: number = 30) => {
    const ymd = r?.date as string;
    const start = toLocalDate(ymd, (r?.startTime as string)?.slice(0,5));
    const end = toLocalDate(ymd, (r?.endTime as string)?.slice(0,5));
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    const openFrom = new Date(start.getTime() - toleranceMin * 60000);
    const now = new Date();
    return now >= openFrom && now <= end;
  };

  const formatHHMM = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

  const getCheckInWindowLabels = (r: any, toleranceMin: number = 30) => {
    const ymd = r?.date as string;
    const start = toLocalDate(ymd, (r?.startTime as string)?.slice(0,5));
    const end = toLocalDate(ymd, (r?.endTime as string)?.slice(0,5));
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return { open: '-', close: '-' };
    const openFrom = new Date(start.getTime() - toleranceMin * 60000);
    return { open: formatHHMM(openFrom), close: formatHHMM(end) };
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
            <XCircleIcon className="h-5 w-5 text-red-400" />
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

  // Filtrar reservas
  // Normalización de método de pago a códigos canónicos backend
  const normalizeMethod = (raw: string | undefined | null): string => {
    const v = (raw || '').toString().trim().toUpperCase();
    const map: Record<string, string> = {
      'CASH': 'CASH', 'EFECTIVO': 'CASH',
      'CARD': 'CARD', 'TPV': 'CARD', 'TARJETA': 'CARD', 'STRIPE': 'CARD',
      'TRANSFER': 'TRANSFER', 'TRANSFERENCIA': 'TRANSFER',
      'ONSITE': 'ONSITE', 'MANUAL': 'ONSITE', 'EN SITIO': 'ONSITE',
      'CREDITS': 'CREDITS', 'CRÉDITOS': 'CREDITS',
      'BIZUM': 'BIZUM',
      'COURTESY': 'COURTESY', 'CORTESIA': 'COURTESY', 'CORTESÍA': 'COURTESY',
    };
    return map[v] || (v || '');
  };

  const methodLabel = (code: string | undefined): string => {
    const labelMap: Record<string, string> = {
      'CASH': 'Efectivo',
      'CARD': 'Tarjeta (TPV)',
      'TRANSFER': 'Transferencia',
      'ONSITE': 'En sitio',
      'CREDITS': 'Créditos',
      'BIZUM': 'Bizum',
      'COURTESY': 'Cortesía',
    };
    return labelMap[code || ''] || '-';
  };

  const filteredReservations = reservations?.filter((reservation: any) => {
    const matchesSearch = 
      (reservation.userName as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.userEmail as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.courtName as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.centerName as string)?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' ? !['CANCELLED', 'NO_SHOW'].includes(reservation.status as string) : reservation.status === statusFilter);
    const matchesPayment = paymentFilter === 'ALL' || reservation.paymentStatus === paymentFilter;
    const normalizedMethod = normalizeMethod((reservation as any).paymentMethod as string);
    const matchesPaymentMethod = paymentMethodFilter === 'ALL' || normalizedMethod === paymentMethodFilter;
    const matchesDate = !dateFilter || reservation.date === dateFilter;
    const hasOverride = !!(reservation as any).override;
    const matchesOverride = overrideFilter === 'ALL' || (overrideFilter === 'WITH' ? hasOverride : !hasOverride);
    
    return matchesSearch && matchesStatus && matchesPayment && matchesPaymentMethod && matchesOverride && matchesDate;
  }) || [];

  // Paginación
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReservations = filteredReservations.slice(startIndex, startIndex + itemsPerPage);

  const handleDeleteReservation = async (reservationId: string) => {
    const confirmed = await confirm({
      title: 'Cancelar Reserva',
      description: '¿Estás seguro de que quieres cancelar esta reserva? La reserva se marcará como cancelada.',
      confirmText: 'Cancelar Reserva',
      cancelText: 'No cancelar',
      tone: 'danger'
    });
    
    if (confirmed) {
      try {
        await cancelReservation(reservationId);
        showToast({ variant: 'success', title: 'Reserva cancelada', message: 'La reserva ha sido cancelada correctamente.' });
        await getReservations({ page: 1, limit: 200 });
      } catch (error) {
        console.error('Error al cancelar reserva:', error);
        showToast({ variant: 'error', title: 'Error', message: 'No se pudo cancelar la reserva.' });
      }
    }
  };

  const handleGenerateLink = async (reservationId: string, r: any) => {
    // Reglas de negocio en UI (reforzadas por backend):
    const blockedStatuses = new Set(['PAID','COMPLETED','CANCELLED']);
    const amount = Number(r?.totalAmount || 0);
    if (blockedStatuses.has(r?.status)) {
      showToast({ variant: 'warning', title: 'No permitido', message: 'La reserva no admite enlace de pago en su estado actual.' });
      return;
    }
    if (!(amount > 0)) {
      showToast({ variant: 'warning', title: 'Sin importe', message: 'La reserva no tiene importe a cobrar.' });
      return;
    }
    try {
      const { url } = await adminApi.reservations.generatePaymentLink(reservationId);
      if (url) {
        showToast({ variant: 'success', title: 'Enlace de pago', message: 'Enlace generado y enviado al cliente.' });
        window.open(url, '_blank');
      } else {
        showToast({ variant: 'warning', title: 'Sin enlace', message: 'No se pudo generar el enlace.' });
      }
    } catch (e: any) {
      const msg = (e as Error)?.message || 'No se pudo generar el enlace de pago.';
      showToast({ variant: 'error', title: 'Error', message: msg });
    }
  };


  const confirmRefund = async () => {
    const id = refundState.id as string;
    const amountNum = refundState.amount ? Number(refundState.amount) : undefined;
    const reason = refundState.reason?.trim();
    setRefundState({ open: false, id: undefined, amount: undefined, reason: '' });
    if (!reason) {
      showToast({ variant: 'warning', title: 'Razón requerida', message: 'Indica la razón del reembolso.' });
      return;
    }
    try {
      await adminApi.reservations.refund(id, { amount: amountNum, reason });
      showToast({ variant: 'success', title: 'Reembolso solicitado', message: 'El reembolso ha sido procesado.' });
      await getReservations({ page: 1, limit: 200 });
    } catch (e) {
      showToast({ variant: 'error', title: 'Error', message: 'No se pudo procesar el reembolso.' });
    }
  };

  const handleResend = async () => {
    const id = resendState.id as string;
    setResendState({ ...resendState, open: false, id: undefined });
    try {
      await adminApi.reservations.resendNotification(id, { type: resendState.type, channel: 'EMAIL' });
      showToast({ variant: 'success', title: 'Enviado', message: resendState.type === 'CONFIRMATION' ? 'Confirmación reenviada.' : 'Enlace de pago reenviado.' });
    } catch {
      showToast({ variant: 'error', title: 'Error', message: 'No se pudo reenviar.' });
    }
  };

  const handleStatusChange = async (reservationId: string, newStatus: string) => {
    try {
      await updateReservation(reservationId, { status: newStatus as any });
    } catch (error) {
      console.error('Error al actualizar reserva:', error);
      alert('Error al actualizar la reserva. Por favor, inténtalo de nuevo.');
    }
  };

  // Calcular estadísticas
  const totalRevenue = filteredReservations
    .filter((r: any) => r.paymentStatus === 'PAID')
    .reduce((sum, r: any) => sum + (r.totalAmount as number), 0);
  
  const todayReservations = filteredReservations.filter((r: any) => r.date === new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <CalendarDaysIcon className="h-8 w-8 mr-3 text-blue-600" />
            Gestión de Reservas
          </h1>
          <p className="mt-2 text-gray-600">
            Administra las reservas de canchas del polideportivo
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => {
              window.location.href = '/reservations/new';
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nueva Reserva
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Reservas</p>
              <p className="text-2xl font-semibold text-gray-900">{filteredReservations.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Hoy</p>
              <p className="text-2xl font-semibold text-gray-900">{todayReservations?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Ingresos Totales</p>
              <p className="text-2xl font-semibold text-gray-900">€{totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Confirmadas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {filteredReservations.filter(r => r.status === 'PAID').length}
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
                placeholder="Buscar reservas..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activas</option>
              <option value="PENDING">Pendiente</option>
              <option value="PAID">Pagada</option>
              <option value="IN_PROGRESS">En curso</option>
              <option value="COMPLETED">Completada</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="NO_SHOW">No se presentó</option>
            </select>
          </div>
          
          {/* Payment Filter */}
          <div>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="ALL">Todos los pagos</option>
              <option value="PENDING">Pendiente</option>
              <option value="PAID">Pagado</option>
              <option value="REFUNDED">Reembolsado</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
            >
              <option value="ALL">Todos los métodos</option>
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta (TPV)</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="ONSITE">En sitio</option>
              <option value="CREDITS">Créditos</option>
              <option value="BIZUM">Bizum</option>
              <option value="COURTESY">Cortesía</option>
            </select>
          </div>

          {/* Override Filter */}
          <div>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={overrideFilter}
              onChange={(e) => setOverrideFilter(e.target.value)}
            >
              <option value="ALL">Todas (con y sin ajuste)</option>
              <option value="WITH">Con ajuste</option>
              <option value="WITHOUT">Sin ajuste</option>
            </select>
          </div>
          
          {/* Date Filter */}
          <div>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cancha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha y Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedReservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {reservation.userName as string}
                        </div>
                        <div className="text-sm text-gray-500">
                          {reservation.userEmail as string}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{reservation.courtName as string}</div>
                    <div className="text-sm text-gray-500">{reservation.centerName as string}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(reservation.date as string).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {reservation.startTime as string} - {reservation.endTime as string}
                    </div>
                    <div className="text-xs text-gray-400">
                      {reservation.duration as string}h
                    </div>
                    {(reservation as any).override && (
                      <div className="mt-1 text-xs inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800" title={(reservation as any).override?.reason || ''}>
                        Ajuste: €{Number((reservation as any).override?.delta || 0).toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={reservation.status as string}
                      onChange={(e) => handleStatusChange(reservation.id as string, e.target.value)}
                      className={`text-xs font-semibold rounded-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 ${
                        statusColors[reservation.status as string]
                      }`}
                    >
                      <option value="PENDING">Pendiente</option>
                      <option value="PAID">Pagada</option>
                      <option value="PAID">Pagada</option>
                      <option value="CANCELLED">Cancelada</option>
                      <option value="COMPLETED">Completada</option>
                      <option value="NO_SHOW">No se presentó</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      paymentStatusColors[reservation.paymentStatus as string]
                    }`}>
                      {paymentStatusLabels[reservation.paymentStatus as string]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                   €{(reservation.totalAmount as number).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span>{methodLabel(normalizeMethod((reservation as any).paymentMethod as string))}</span>
                      {reservation.paymentStatus === 'PENDING' && normalizeMethod((reservation as any).paymentMethod as string) === 'ONSITE' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs" title="Usuario eligió pagar en sede">
                          🏢 Pagar en sede
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {/* Generar enlace de pago (LINK) */}
                      {Number(reservation.totalAmount || 0) > 0 && reservation.paymentStatus === 'PENDING' && !['PAID','COMPLETED','CANCELLED'].includes(reservation.status as string) && (
                        <button
                          title="Generar enlace de pago"
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => handleGenerateLink(reservation.id, reservation)}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      )}
                      {Number(reservation.totalAmount || 0) > 0 && reservation.paymentStatus !== 'PENDING' && (
                        <span className="text-blue-300 cursor-not-allowed" title="No disponible: la reserva ya tiene pago registrado o reembolsado">
                          <EyeIcon className="h-4 w-4" />
                        </span>
                      )}
                       {/* Descargar recibo */}
                      {reservation.paymentStatus === 'PAID' && (
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/admin/reservations/${reservation.id}/receipt`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-700 hover:text-gray-900"
                          title="Descargar recibo"
                        >
                          PDF
                        </a>
                      )}
                      {/* Check-in: sólo si ventana abierta y pago confirmado o importe 0 */}
                      {reservation.status !== 'IN_PROGRESS' && reservation.status !== 'COMPLETED' && reservation.status !== 'CANCELLED' && reservation.status !== 'NO_SHOW' && isWithinCheckInWindow(reservation) && (reservation.paymentStatus === 'PAID' || Number(reservation.totalAmount || 0) === 0) && (
                        <button
                          className="text-emerald-600 hover:text-emerald-900"
                          title={'Check-in'}
                          onClick={async () => {
                            try {
                              await adminApi.reservations.checkIn(reservation.id);
                              showToast({ variant: 'success', title: 'Check-in', message: 'Reserva en curso.' });
                              await getReservations({ page: 1, limit: 200 });
                            } catch {
                              showToast({ variant: 'error', title: 'Error', message: 'No se pudo hacer check-in.' });
                            }
                          }}
                        >
                          ▶
                        </button>
                      )}
                      {reservation.status !== 'IN_PROGRESS' && reservation.status !== 'COMPLETED' && reservation.status !== 'CANCELLED' && reservation.status !== 'NO_SHOW' && (!isWithinCheckInWindow(reservation) || (reservation.paymentStatus !== 'PAID' && Number(reservation.totalAmount || 0) > 0)) && (
                        <span
                          className="text-emerald-300 cursor-not-allowed"
                          title={`${(() => { if (!isWithinCheckInWindow(reservation)) { const w = getCheckInWindowLabels(reservation); return `Fuera de ventana de check-in (abre ${w.open} - cierra ${w.close})`; } return 'Pago pendiente: registrar cobro en recepción'; })()}`}
                        >
                          ▶
                        </span>
                      )}
                      {/* Check-out si en curso */}
                      {reservation.status === 'IN_PROGRESS' && (
                        <button
                          className="text-orange-600 hover:text-orange-900"
                          title="Check-out"
                          onClick={async () => {
                            try {
                              await adminApi.reservations.checkOut(reservation.id);
                              showToast({ variant: 'success', title: 'Check-out', message: 'Reserva completada.' });
                              await getReservations({ page: 1, limit: 200 });
                            } catch {
                              showToast({ variant: 'error', title: 'Error', message: 'No se pudo hacer check-out.' });
                            }
                          }}
                        >
                          ■
                        </button>
                      )}
                      {/* Cobrar en sede: sólo si pendiente y método ONSITE */}
                      {reservation.paymentStatus === 'PENDING' && normalizeMethod((reservation as any).paymentMethod as string) === 'ONSITE' && (
                        <button
                          className="text-green-700 hover:text-green-900"
                          title="Cobrar en sede"
                          onClick={() => setPayOnSiteState({
                            open: true,
                            id: reservation.id,
                            userName: reservation.userName as string,
                            courtName: reservation.courtName as string,
                            totalAmount: Number(reservation.totalAmount || 0),
                            currentMethod: methodLabel('ONSITE')
                          })}
                        >
                          💵
                        </button>
                      )}

                      {/* Reenviar confirmación: no permitir en CANCELLED */}
                      {reservation.status !== 'CANCELLED' && (
                        <button
                          className="text-gray-600 hover:text-gray-900"
                          title="Reenviar confirmación"
                          onClick={() => setResendState({ open: true, id: reservation.id, type: 'CONFIRMATION' })}
                        >
                          @
                        </button>
                      )}
                      {reservation.status === 'CANCELLED' && (
                        <span
                          className="text-gray-400 cursor-not-allowed"
                          title="No disponible en reservas canceladas"
                        >
                          @
                        </span>
                      )}
                      {/* Reenviar enlace de pago si pendiente y procede */}
                      {reservation.paymentStatus === 'PENDING' && Number(reservation.totalAmount || 0) > 0 && !['PAID','COMPLETED','CANCELLED'].includes(reservation.status as string) && (
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Reenviar enlace de pago"
                          onClick={() => setResendState({ open: true, id: reservation.id, type: 'PAYMENT_LINK' })}
                        >
                          ↗
                        </button>
                      )}
                      {reservation.paymentStatus === 'PENDING' && Number(reservation.totalAmount || 0) > 0 && ['PAID','COMPLETED','CANCELLED'].includes(reservation.status as string) && (
                        <span className="text-indigo-300 cursor-not-allowed" title="No disponible si la reserva está pagada, completada o cancelada">↗
                        </span>
                      )}
                      {/* Descargar paquete PDF + Auditoría */}
                      <a
                        className="text-gray-700 hover:text-gray-900"
                        title="Descargar PDF + Auditoría"
                        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/admin/reservations/${reservation.id}/audit/zip`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ⤓
                      </a>
                      {/* Reembolsar pago (solo si pagado y no cancelada) */}
                      {reservation.paymentStatus === 'PAID' && reservation.status !== 'CANCELLED' && (
                        <button
                          className="text-amber-600 hover:text-amber-800"
                          title="Reembolsar"
                          onClick={() => setRefundState({ open: true, id: reservation.id, amount: String(reservation.totalAmount), reason: '' })}
                        >
                          €
                        </button>
                      )}
                      {/* Editar: oculto en COMPLETED/CANCELLED, mostrar indicador inactivo */}
                      {![ 'COMPLETED','CANCELLED' ].includes(reservation.status as string) ? (
                        <button className="text-green-600 hover:text-green-900" title="Editar">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-green-300 cursor-not-allowed" title="No disponible en reservas completadas o canceladas">
                          <PencilIcon className="h-4 w-4" />
                        </span>
                      )}
                      {/* Auditoría */}
                      <button
                        className="text-gray-600 hover:text-gray-900"
                        title="Ver auditoría"
                        onClick={async () => {
                          try {
                            setAuditState({ open: true, id: reservation.id, loading: true, events: [] });
                            const data: any = await adminApi.reservations.getAudit(reservation.id);
                            const events: any[] = Array.isArray(data?.events) ? data.events : [];
                            setAuditState({ open: true, id: reservation.id, loading: false, events: events.map((e: any) => ({ id: e.id, type: e.type, summary: e.summary, createdAt: e.createdAt })) });
                          } catch {
                            setAuditState({ open: true, id: reservation.id, loading: false, events: [] });
                          }
                        }}
                      >
                        🛈
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteReservation(reservation.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
                    {Math.min(startIndex + itemsPerPage, filteredReservations.length)}
                  </span>{' '}
                  de <span className="font-medium">{filteredReservations.length}</span> resultados
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

      {/* Empty State */}
      {filteredReservations.length === 0 && (
        <div className="text-center py-12">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay reservas</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron reservas que coincidan con los filtros aplicados.
          </p>
        </div>
      )}

      {resendState.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Reenviar Notificación</h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿Deseas reenviar la {resendState.type === 'CONFIRMATION' ? 'confirmación' : 'enlace de pago'}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setResendState({ open: false, id: undefined, type: 'CONFIRMATION' })}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleResend}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Reenviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Auditoría */}
      {auditState.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black">Auditoría de Reservas</h3>
              <button 
                onClick={() => setAuditState({ open: false, id: undefined, loading: false, events: [] })} 
                className="text-black hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors duration-200 font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {auditState.loading ? (
                <div className="text-sm text-black font-medium">Cargando eventos de auditoría...</div>
              ) : auditState.events.length === 0 ? (
                <div className="text-sm text-black font-medium">Sin eventos de auditoría.</div>
              ) : (
                <ul className="space-y-3">
                  {auditState.events.map((e) => (
                    <li key={e.id} className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="font-bold text-black text-base">{new Date(e.createdAt).toLocaleString('es-ES')}</div>
                      <div className="text-black font-medium mt-1">{e.summary}</div>
                      <div className="text-xs text-gray-600 mt-1 bg-blue-100 px-2 py-1 rounded inline-block">{e.type}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
              {auditState.id && (
                <div className="flex gap-2">
                  <a
                    className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium shadow-sm"
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/admin/reservations/${auditState.id}/audit/csv`}
                  >
                    📊 Exportar CSV
                  </a>
                  <a
                    className="text-sm px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 font-medium shadow-sm"
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/admin/reservations/${auditState.id}/audit/zip`}
                  >
                    📄 PDF + Auditoría
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {refundState.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Reembolsar Pago</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Importe (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={refundState.amount || ''}
                  onChange={(e) => setRefundState(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razón del reembolso
                </label>
                <textarea
                  value={refundState.reason}
                  onChange={(e) => setRefundState(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe la razón del reembolso..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setRefundState({ open: false, id: undefined, amount: undefined, reason: '' })}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRefund}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
              >
                Reembolsar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar pago en sede */}
      {payOnSiteState.open && (
        <PaymentConfirmationModal
          isOpen={payOnSiteState.open}
          onClose={() => setPayOnSiteState({ open: false })}
          reservation={{
            id: String(payOnSiteState.id || ''),
            userName: String(payOnSiteState.userName || ''),
            courtName: String(payOnSiteState.courtName || ''),
            totalAmount: Number(payOnSiteState.totalAmount || 0),
            currentPaymentMethod: String(payOnSiteState.currentMethod || '')
          }}
          onConfirm={async ({ paymentMethod, notes }) => {
            try {
              await adminApi.reservations.confirmPayment(String(payOnSiteState.id), { paymentMethod, paymentStatus: 'PAID', notes });
              showToast({ variant: 'success', title: 'Pago registrado', message: 'Pago en sede confirmado.' });
              setPayOnSiteState({ open: false });
              await getReservations({ page: 1, limit: 200 });
            } catch (e: any) {
              showToast({ variant: 'error', title: 'Error', message: e?.message || 'No se pudo confirmar el pago.' });
            }
          }}
        />
      )}
    </div>
  );
}