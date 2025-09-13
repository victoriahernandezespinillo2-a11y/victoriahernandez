'use client';

import { useEffect, useMemo, useState } from 'react';
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
    'PENDING': 'pending',
    'FAILED': 'failed',
    'CANCELLED': 'failed',
    'REFUNDED': 'refunded',
    'PROCESSING': 'pending',
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estados para modales y acciones
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    console.log('💳 [PAYMENTS] Cargando pagos...');
    getPayments({ page: 1, limit: 100 }).then((result) => {
      console.log('✅ [PAYMENTS] Pagos cargados:', result?.length || 0, 'pagos');
    }).catch((error) => {
      console.error('❌ [PAYMENTS] Error cargando pagos:', error);
    });
  }, [getPayments]);

  const rows: PaymentRow[] = useMemo(() => {
    const list = Array.isArray(payments) ? payments : [];
    console.log('🔍 [PAYMENTS] Datos originales:', list.slice(0, 3)); // Primeros 3 para debug
    const mapped = list.map((p: any) => ({
      id: p.id,
      user: p.user?.name || p.userName || p.userId || '—',
      reservation: p.reservationId || p.reservation?.id || '—',
      amount: Number(p.totalPrice || p.amount || 0),
      method: (p.paymentMethod || p.method || 'UNKNOWN').toLowerCase(),
      status: mapPaymentStatus(p.status || 'PENDING'),
      date: p.createdAt || p.paidAt || new Date().toISOString(),
      transactionId: p.transactionId || p.externalId || p.id,
    }));
    console.log('🔍 [PAYMENTS] Datos mapeados:', mapped.slice(0, 3)); // Primeros 3 para debug
    console.log('📊 [PAYMENTS] Estados únicos:', [...new Set(mapped.map(p => p.status))]);
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestión de Pagos</h1>
        <p className="text-gray-600">Administra y monitorea todos los pagos del sistema</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">${totalAmount.toLocaleString()}</p>
            </div>
            <CreditCardIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pagos Completados</p>
              <p className="text-2xl font-bold text-gray-900">{completedPayments}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pagos Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{pendingPayments}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pagos Fallidos</p>
              <p className="text-2xl font-bold text-gray-900">{failedPayments}</p>
            </div>
            <XCircleIcon className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por usuario, reserva o ID de transacción..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="all">Todos los métodos</option>
              <option value="credit_card">Tarjeta de Crédito</option>
              <option value="debit_card">Tarjeta de Débito</option>
              <option value="transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de pagos */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
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
                  Reserva
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
                    {payment.reservation}
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

        {/* Paginación */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
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