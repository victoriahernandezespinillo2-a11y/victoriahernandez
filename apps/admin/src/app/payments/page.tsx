'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAdminPayments } from '@/lib/hooks';
import {
  MagnifyingGlassIcon as Search,
  FunnelIcon as Filter,
  ArrowDownTrayIcon as Download,
  EyeIcon as Eye,
  PencilIcon as Edit,
  TrashIcon as Trash2,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as Clock,
} from '@heroicons/react/24/outline';

type PaymentRow = {
  id: string;
  user: string;
  reservation: string;
  amount: number;
  method: string;
  status: string;
  date: string;
  transactionId: string;
  // Campos enterprise
  paymentType: string;
  description: string;
  courtName: string;
  centerName: string;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
  case 'failed':
    return <XCircleIcon className="w-4 h-4 text-red-500" />;
  case 'refunded':
    return <XCircleIcon className="w-4 h-4 text-gray-500" />;
    default:
      return null;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const mapPaymentStatus = (status: string) => {
  const statusMap: { [key: string]: string } = {
    'PAID': 'completed',
    'COMPLETED': 'completed',
    'PENDING': 'pending',
    'FAILED': 'failed',
    'CANCELLED': 'failed',
    'REFUNDED': 'refunded',
    'PROCESSING': 'pending',
    'IN_PROGRESS': 'completed',
    'completed': 'completed',
    'pending': 'pending',
    'failed': 'failed',
    'refunded': 'refunded'
  };
  return statusMap[status.toUpperCase()] || 'pending';
};

const getMethodName = (method: string) => {
  switch (method) {
    case 'credit_card':
      return 'Tarjeta de Crédito';
    case 'debit_card':
      return 'Tarjeta de Débito';
    case 'transfer':
      return 'Transferencia';
    case 'cash':
      return 'Efectivo';
    default:
      return method;
  }
};

export default function PaymentsPage() {
  const { payments, loading, error, getPayments } = useAdminPayments();
  
  // Debug logging
  console.log('💳 [PAYMENTS] Estado actual:', { 
    payments: payments, 
    paymentsLength: Array.isArray(payments) ? payments.length : 'No es array',
    paymentsType: typeof payments,
    loading, 
    error 
  });
  console.log('🔍 [PAYMENTS] Contenido de payments:', payments);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estados para modales y acciones
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Exportar CSV desde endpoint admin/ledger
  const handleExport = useCallback(async () => {
    try {
      const mapMethod = (m: string) => {
        const v = (m || '').toLowerCase();
        if (v === 'credit_card' || v === 'debit_card') return 'CARD';
        if (v === 'transfer') return 'TRANSFER';
        if (v === 'cash') return 'CASH';
        return undefined;
      };
      const mapStatus = (s: string) => {
        const v = (s || '').toLowerCase();
        if (v === 'completed') return 'PAID';
        if (v === 'pending') return 'PENDING';
        if (v === 'refunded') return 'REFUNDED';
        return undefined;
      };
      const toStartISO = (d: string) => (d ? new Date(`${d}T00:00:00.000Z`).toISOString() : undefined);
      const toEndISO = (d: string) => (d ? new Date(`${d}T23:59:59.999Z`).toISOString() : undefined);
      const sp = new URLSearchParams();
      sp.set('format', 'csv');
      const m = mapMethod(methodFilter);
      const st = mapStatus(statusFilter);
      if (m) sp.set('method', m);
      if (st) sp.set('status', st);
      if (sourceTypeFilter !== 'all') sp.set('sourceType', sourceTypeFilter);
      const df = toStartISO(dateFrom);
      const dt = toEndISO(dateTo);
      if (df) sp.set('dateFrom', df);
      if (dt) sp.set('dateTo', dt);

      const url = `/api/admin/payments?${sp.toString()}`;
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `pagos_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
    } catch (e) {
      console.error('❌ [PAYMENTS] Error exportando CSV:', e);
    }
  }, [methodFilter, statusFilter]);

  useEffect(() => {
    console.log('💳 [PAYMENTS] Cargando pagos...');
    const mapStatus = (s: string) => {
      const v = (s || '').toLowerCase();
      if (v === 'completed') return 'PAID';
      if (v === 'pending') return 'PENDING';
      if (v === 'refunded') return 'REFUNDED';
      return undefined;
    };
    const mapMethod = (m: string) => {
      const v = (m || '').toLowerCase();
      if (v === 'credit_card' || v === 'debit_card') return 'CARD';
      if (v === 'transfer') return 'TRANSFER';
      if (v === 'cash') return 'CASH';
      return undefined;
    };
    const toStartISO = (d: string) => (d ? new Date(`${d}T00:00:00.000Z`).toISOString() : undefined);
    const toEndISO = (d: string) => (d ? new Date(`${d}T23:59:59.999Z`).toISOString() : undefined);

    const params: any = { page: 1, limit: 100 };
    const st = mapStatus(statusFilter);
    const mt = mapMethod(methodFilter);
    if (st) params.status = st;
    if (mt) params.method = mt;
    if (sourceTypeFilter !== 'all') params.sourceType = sourceTypeFilter;
    const df = toStartISO(dateFrom);
    const dt = toEndISO(dateTo);
    if (df) params.dateFrom = df;
    if (dt) params.dateTo = dt;

    getPayments(params)
      .then((result) => {
        console.log('✅ [PAYMENTS] Pagos cargados:', result?.length || 0, 'pagos');
      })
      .catch((error) => {
        console.error('❌ [PAYMENTS] Error cargando pagos:', error);
      });
  }, [getPayments, statusFilter, methodFilter, sourceTypeFilter, dateFrom, dateTo]);

  const rows: PaymentRow[] = useMemo(() => {
    const list = Array.isArray(payments) ? payments : [];
    console.log('🔍 [PAYMENTS] Datos originales:', list.slice(0, 3)); // Primeros 3 para debug
    const mapped = list.map((p: any) => ({
      id: p.id,
      user: p.user?.name || p.user?.firstName + ' ' + p.user?.lastName || p.userName || p.userId || '—',
      reservation: p.reservationId || p.reservation?.id || p.metadata?.reservationId || '—',
      amount: Number(p.totalPrice || p.amount || 0),
      method: (p.paymentMethod || p.method || 'UNKNOWN').toLowerCase(),
      status: mapPaymentStatus(p.status || 'PENDING'),
      date: p.createdAt || p.paidAt || new Date().toISOString(),
      transactionId: p.transactionId || p.externalId || p.id,
      // Nuevos campos enterprise
      paymentType: p.paymentType || 'UNKNOWN',
      description: p.description || p.metadata?.description || '—',
      courtName: p.metadata?.courtName || '—',
      centerName: p.metadata?.centerName || '—',
    }));
    console.log('🔍 [PAYMENTS] Datos mapeados:', mapped.slice(0, 3)); // Primeros 3 para debug
    console.log('📊 [PAYMENTS] Estados únicos:', [...new Set(mapped.map(p => p.status))]);
    console.log('🏗️ [PAYMENTS] Tipos de pago únicos:', [...new Set(mapped.map(p => p.paymentType))]);
    return mapped;
  }, [payments]);

  const filteredPayments = rows.filter(payment => {
    const matchesSearch = payment.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reservation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

  const totalAmount = rows.reduce((sum, payment) => 
    payment.status === 'completed' ? sum + (payment.amount || 0) : sum, 0
  );
  const completedPayments = rows.filter(p => p.status === 'completed').length;
  const pendingPayments = rows.filter(p => p.status === 'pending').length;
  const failedPayments = rows.filter(p => p.status === 'failed').length;

  // Funciones para manejar acciones
  const handleViewPayment = (payment: PaymentRow) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const handleEditPayment = (payment: PaymentRow) => {
    setSelectedPayment(payment);
    setShowEditModal(true);
  };

  const handleDeletePayment = (payment: PaymentRow) => {
    setSelectedPayment(payment);
    setShowDeleteModal(true);
  };

  const confirmDeletePayment = async () => {
    if (!selectedPayment) return;
    
    try {
      // Aquí implementarías la llamada a la API para eliminar el pago
      console.log('🗑️ [PAYMENTS] Eliminando pago:', selectedPayment.id);
      // await deletePayment(selectedPayment.id);
      setShowDeleteModal(false);
      setSelectedPayment(null);
      // Recargar la lista de pagos
      getPayments({ page: 1, limit: 100 });
    } catch (error) {
      console.error('❌ [PAYMENTS] Error eliminando pago:', error);
    }
  };

  const closeModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedPayment(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Gestión de Pagos</h1>
            <p className="text-xs text-gray-500">Administra y monitorea todos los pagos</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 bg-gray-100 rounded-lg" onClick={handleExport}>
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 bg-blue-600 text-white rounded-lg" onClick={handleExport}>
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestión de Pagos</h1>
          <p className="text-gray-600">Administra y monitorea todos los pagos del sistema</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-6">
          <div className="bg-white p-3 md:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Ingresos Totales</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">${totalAmount.toLocaleString()}</p>
              </div>
              <CreditCardIcon className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-3 md:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Completados</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{completedPayments}</p>
              </div>
              <CheckCircleIcon className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-3 md:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{pendingPayments}</p>
              </div>
              <Clock className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white p-3 md:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Fallidos</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{failedPayments}</p>
              </div>
              <XCircleIcon className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border mb-4 md:mb-6">
          <div className="space-y-3 md:space-y-0 md:flex md:flex-row md:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por usuario, reserva o ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:flex md:gap-4">
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="completed">Completado</option>
                <option value="pending">Pendiente</option>
                <option value="failed">Fallido</option>
                <option value="refunded">Reembolsado</option>
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
              >
                <option value="all">Todos los métodos</option>
                <option value="credit_card">Tarjeta de Crédito</option>
                <option value="debit_card">Tarjeta de Débito</option>
                <option value="transfer">Transferencia</option>
                <option value="cash">Efectivo</option>
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={sourceTypeFilter}
                onChange={(e) => setSourceTypeFilter(e.target.value)}
              >
                <option value="all">Todos los tipos</option>
                <option value="RESERVATION">Reservas</option>
                <option value="ORDER">Pedidos</option>
                <option value="TOPUP">Recargas</option>
                <option value="MEMBERSHIP">Membresías</option>
              </select>
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <button className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de pagos - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border overflow-hidden mx-4 md:mx-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Transacción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo / Referencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.transactionId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.paymentType === 'ORDER' 
                          ? 'bg-blue-100 text-blue-800' 
                          : payment.paymentType === 'RESERVATION'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {payment.paymentType === 'ORDER' ? '🛒 Pedido' : 
                         payment.paymentType === 'RESERVATION' ? '🏟️ Reserva' : 
                         '❓ Desconocido'}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {payment.paymentType === 'RESERVATION' && payment.courtName !== '—' 
                          ? `${payment.courtName}`
                          : payment.description
                        }
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${payment.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getMethodName(payment.method)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status === 'completed' ? 'Completado' :
                         payment.status === 'pending' ? 'Pendiente' :
                         payment.status === 'failed' ? 'Fallido' : 'Reembolsado'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.date).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleViewPayment(payment)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditPayment(payment)}
                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                        title="Editar pago"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeletePayment(payment)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Eliminar pago"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista móvil - Tarjetas de pagos */}
      <div className="md:hidden px-4 space-y-3">
        {paginatedPayments.map((payment) => (
          <div key={payment.id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(payment.status)}
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                    {payment.status === 'completed' ? 'Completado' :
                     payment.status === 'pending' ? 'Pendiente' :
                     payment.status === 'failed' ? 'Fallido' : 'Reembolsado'}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900">${payment.amount.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{getMethodName(payment.method)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleViewPayment(payment)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Ver detalles"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleEditPayment(payment)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                  title="Editar pago"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeletePayment(payment)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Eliminar pago"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Usuario:</span>
                <span className="font-medium">{payment.user}</span>
              </div>
              <div className="flex justify-between">
                <span>Tipo:</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  payment.paymentType === 'ORDER' 
                    ? 'bg-blue-100 text-blue-800' 
                    : payment.paymentType === 'RESERVATION'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {payment.paymentType === 'ORDER' ? '🛒 Pedido' : 
                   payment.paymentType === 'RESERVATION' ? '🏟️ Reserva' : 
                   '❓ Desconocido'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Referencia:</span>
                <span className="font-medium">
                  {payment.paymentType === 'RESERVATION' && payment.courtName !== '—' 
                    ? payment.courtName
                    : payment.description
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>ID Transacción:</span>
                <span className="font-mono text-xs">{payment.transactionId.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span className="font-medium">
                  {new Date(payment.date).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      <div className="px-4 md:px-6 py-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          {/* Mobile Pagination */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </p>
              <p className="text-xs text-gray-500">
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredPayments.length)} de {filteredPayments.length}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>

          {/* Desktop Pagination */}
          <div className="hidden md:flex md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredPayments.length)}</span> de{' '}
                <span className="font-medium">{filteredPayments.length}</span> resultados
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
      </div>

      {/* Modal Ver Pago */}
      {showViewModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Detalles del Pago</h3>
              <button 
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">ID de Transacción</label>
                  <p className="text-sm text-gray-900">{selectedPayment.transactionId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Usuario</label>
                  <p className="text-sm text-gray-900">{selectedPayment.user}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Monto</label>
                  <p className="text-sm text-gray-900">${selectedPayment.amount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Método</label>
                  <p className="text-sm text-gray-900">{getMethodName(selectedPayment.method)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Estado</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedPayment.status)}`}>
                    {getStatusIcon(selectedPayment.status)}
                    <span className="ml-1">{selectedPayment.status}</span>
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Fecha</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedPayment.date).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Reserva</label>
                <p className="text-sm text-gray-900">{selectedPayment.reservation}</p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={closeModals}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Pago */}
      {showEditModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Editar Pago</h3>
              <button 
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select 
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  defaultValue={selectedPayment.status}
                >
                  <option value="pending">Pendiente</option>
                  <option value="completed">Completado</option>
                  <option value="failed">Fallido</option>
                  <option value="refunded">Reembolsado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <input 
                  type="number"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  defaultValue={selectedPayment.amount}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModals}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  console.log('💾 [PAYMENTS] Guardando cambios para:', selectedPayment.id);
                  closeModals();
                }}
                className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar Pago */}
      {showDeleteModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Eliminar Pago</h3>
              <button 
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                ¿Estás seguro de que deseas eliminar este pago?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-900">ID: {selectedPayment.transactionId}</p>
                <p className="text-sm text-gray-600">Usuario: {selectedPayment.user}</p>
                <p className="text-sm text-gray-600">Monto: ${selectedPayment.amount}</p>
              </div>
              <p className="text-xs text-red-600 mt-2">⚠️ Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeletePayment}
                className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700"
              >
                Eliminar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}