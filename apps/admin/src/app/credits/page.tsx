'use client';

/**
 * Credits Management Page
 * Panel de administración del sistema de créditos
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { adminApi } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface DashboardData {
  summary: {
    totalUsers: number;
    usersWithCredits: number;
    totalCreditsInCirculation: number;
    totalTransactions: number;
    activePromotions: number;
    averageBalancePerUser: number;
  };
  transactions: {
    byType: Array<{ type: string; count: number; totalCredits: number }>;
    byReason: Array<{ reason: string; count: number; totalCredits: number }>;
    recent: Array<any>;
  };
  topUsers: {
    byBalance: Array<{
      id: string;
      name: string;
      email: string;
      balance: number;
    }>;
    byActivity: Array<{
      id: string;
      name: string;
      email: string;
      transactionCount: number;
    }>;
  };
  promotions: {
    active: number;
    applicationsInPeriod: number;
    creditsAwardedInPeriod: number;
  };
}

interface CreditUser {
  id: string;
  name: string;
  email: string;
  balance: number;
}

interface CreditsPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const USERS_PAGE_SIZE = 10;

export default function CreditsManagementPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState('30d');
  const [usersLoading, setUsersLoading] = useState(true);
  const [users, setUsers] = useState<CreditUser[]>([]);
  const [usersPagination, setUsersPagination] = useState<CreditsPagination>({
    page: 1,
    limit: USERS_PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CreditUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const lastSearchRef = useRef<string>('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    loadDashboard();
  }, [period]);

  const loadDashboard = async () => {
    console.log('🔄 Iniciando carga del dashboard de créditos...');
    setLoading(true);
    try {
      console.log('📡 Haciendo llamada a API:', `/admin/credits/dashboard?period=${period}`);
      const response = await adminApi.credits.getDashboard(period);
      console.log('✅ Respuesta recibida:', response);
      console.log('🔍 Tipo de respuesta:', typeof response);
      console.log('🔍 Es objeto?', typeof response === 'object');
      console.log('🔍 Tiene success?', response && typeof response === 'object' && 'success' in response);
      console.log('🔍 Tiene data?', response && typeof response === 'object' && 'data' in response);
      console.log('🔍 Keys de response:', response ? Object.keys(response) : 'null/undefined');
      
      // Manejar caso donde response es directamente los datos (sin wrapper de success)
      if (response && typeof response === 'object') {
        // Si tiene la estructura { success, data }
        if ('success' in response && 'data' in response) {
          if (response.success && response.data) {
            console.log('📊 Datos del dashboard (estructura ApiResponse):', response.data);
            setDashboard(response.data as any);
          } else {
            console.error('❌ Error en respuesta con estructura ApiResponse:', response);
            showToast({ variant: 'error', title: 'Error', message: 'No se pudo cargar el dashboard' });
          }
        } 
        // Si response es directamente el objeto de datos (sin wrapper)
        else if ('summary' in response || 'transactions' in response || 'period' in response) {
          console.log('📊 Datos del dashboard (respuesta directa):', response);
          setDashboard(response as any);
        }
        // Objeto vacío u otra estructura inesperada
        else {
          console.error('❌ Estructura de respuesta inesperada:', response);
          console.error('❌ Keys encontrados:', Object.keys(response));
          showToast({ variant: 'error', title: 'Error', message: 'Estructura de respuesta inválida' });
        }
      } else {
        console.error('❌ Respuesta no es un objeto válido:', response);
        showToast({ variant: 'error', title: 'Error', message: 'Respuesta inválida del servidor' });
      }
    } catch (error) {
      console.error('💥 Error en loadDashboard:', error);
      console.error('💥 Error details:', {
        message: (error as Error)?.message,
        stack: (error as Error)?.stack,
        name: (error as Error)?.name
      });
      showToast({ variant: 'error', title: 'Error', message: 'Error de conexión: ' + ((error as Error)?.message || 'Desconocido') });
    } finally {
      setLoading(false);
      console.log('🏁 Carga del dashboard finalizada');
    }
  };

  const fetchUsers = useCallback(
    async (options?: { page?: number; search?: string }) => {
      const page = options?.page ?? 1;
      const search = options?.search;

      setUsersLoading(true);
      try {
        const response = await adminApi.credits.listUsers({
          page,
          limit: USERS_PAGE_SIZE,
          search,
          orderBy: 'balance',
          direction: 'desc',
        });

        const payload = (response as any)?.data ?? response;
        const rawUsers = Array.isArray(payload)
          ? payload
          : payload?.users ?? payload?.items ?? [];

        const normalizedUsers: CreditUser[] = Array.isArray(rawUsers)
          ? rawUsers.map((user: any) => ({
              id: user.id,
              name: user.name ?? user.fullName ?? user.email ?? 'Usuario sin nombre',
              email: user.email ?? '',
              balance: Number(user.balance ?? user.creditsBalance ?? user.walletBalance ?? 0),
            }))
          : [];

        const rawPagination =
          payload?.pagination ??
          payload?.meta ??
          (payload?.total !== undefined
            ? {
                page: payload?.page,
                limit: payload?.limit,
                total: payload?.total,
                pages: payload?.pages,
              }
            : null);

        const limit = Math.max(1, Number(rawPagination?.limit ?? USERS_PAGE_SIZE) || USERS_PAGE_SIZE);
        const total = Math.max(0, Number(rawPagination?.total ?? normalizedUsers.length ?? 0));
        const pagesCandidate = rawPagination?.pages ?? Math.ceil(total / limit);
        const pages = Math.max(1, Number(pagesCandidate || 1));
        const pageNumber = Math.min(Math.max(1, Number(rawPagination?.page ?? page) || 1), pages);

        setUsers(normalizedUsers);
        setUsersPagination({ page: pageNumber, limit, total, pages });

        if (pageNumber !== page) {
          setCurrentPage(pageNumber);
        }
      } catch (error) {
        console.error('💥 Error obteniendo usuarios de créditos:', error);
        showToast({
          variant: 'error',
          title: 'Error',
          message: 'No se pudo cargar el listado de usuarios: ' + ((error as Error)?.message || 'Desconocido'),
        });
      } finally {
        setUsersLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (debouncedSearch !== lastSearchRef.current) {
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
      lastSearchRef.current = debouncedSearch;
    }

    void fetchUsers({
      page: currentPage,
      search: debouncedSearch ? debouncedSearch : undefined,
    });
  }, [currentPage, debouncedSearch, fetchUsers]);

  const handleAdjustCredits = async () => {
    if (!selectedUser || !adjustAmount || !adjustReason) {
      showToast({ variant: 'warning', title: 'Datos incompletos', message: 'Completa todos los campos' });
      return;
    }

    try {
      const response = await adminApi.credits.adjustBalance({
        userId: selectedUser.id,
        amount: parseFloat(adjustAmount),
        reason: adjustReason,
        type: parseFloat(adjustAmount) >= 0 ? 'ADD' : 'SUBTRACT',
      });

      console.log('📤 [ADJUST] Respuesta del endpoint:', response);

      // El cliente ya extrae data.data, así que response contiene directamente los datos
      if (response && typeof response === 'object' && 'userId' in response) {
        showToast({ 
          variant: 'success', 
          title: '✅ Balance Ajustado Exitosamente', 
          message: `Balance de ${selectedUser.name} actualizado de ${(response as any).previousBalance} a ${(response as any).newBalance} créditos`,
          timeoutMs: 6000 // 6 segundos para que sea más visible
        });
        setAdjustModalOpen(false);
        setSelectedUser(null);
        setAdjustAmount('');
        setAdjustReason('');
        loadDashboard();
        await fetchUsers({
          page: currentPage,
          search: debouncedSearch ? debouncedSearch : undefined,
        });
      } else {
        showToast({ variant: 'error', title: 'Error', message: 'Respuesta inválida del servidor' });
      }
    } catch (error) {
      console.error('💥 [ADJUST] Error en cliente:', error);
      showToast({ variant: 'error', title: 'Error', message: 'Error al ajustar balance: ' + (error as Error).message });
    }
  };

  const openAdjustModal = (user: CreditUser) => {
    setSelectedUser(user);
    setAdjustModalOpen(true);
  };

  const totalPages = usersPagination.pages || 1;
  const baseIndex = (usersPagination.page - 1) * usersPagination.limit;
  const rangeStart = usersPagination.total === 0 ? 0 : baseIndex + 1;
  const rangeEnd = Math.min(usersPagination.total, baseIndex + users.length);
  const hasResults = users.length > 0;
  const canGoPrev = usersPagination.page > 1;
  const canGoNext = usersPagination.page < totalPages;
 
  if (loading || !dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Créditos</h1>
          <p className="mt-2 text-gray-600">Panel de administración del sistema de créditos y promociones</p>
        </div>

        {/* Period Selector */}
        <div className="mb-6 flex items-center space-x-4">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="all">Desde el inicio</option>
          </select>
        </div>

        {/* Resumen de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Créditos en Circulación</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {dashboard.summary.totalCreditsInCirculation.toFixed(2)}
                </p>
              </div>
              <CurrencyDollarIcon className="h-12 w-12 text-green-500" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Promedio: {dashboard.summary.averageBalancePerUser.toFixed(2)} por usuario
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Usuarios con Créditos</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {dashboard.summary.usersWithCredits}
                </p>
              </div>
              <UserGroupIcon className="h-12 w-12 text-blue-500" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              De {dashboard.summary.totalUsers} usuarios totales
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transacciones</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {dashboard.summary.totalTransactions}
                </p>
              </div>
              <ArrowTrendingUpIcon className="h-12 w-12 text-purple-500" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              En el período seleccionado
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Promociones Activas</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {dashboard.summary.activePromotions}
                </p>
              </div>
              <ChartBarIcon className="h-12 w-12 text-orange-500" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {dashboard.promotions.applicationsInPeriod} aplicaciones
            </p>
          </div>
        </div>
 
        {/* Gestión de balances por usuario */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Usuarios y balances</h2>
              <p className="text-sm text-gray-500">
                Busca por nombre o correo y ajusta créditos sin salir del panel.
              </p>
            </div>
            <div className="relative w-full md:w-72">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar usuario..."
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>

          <div className="mt-6">
            {usersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : !hasResults ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-center">
                <p className="text-sm font-medium text-gray-700">Sin usuarios en esta búsqueda</p>
                <p className="mt-1 text-sm text-gray-500">Prueba con otro término o limpia el filtro.</p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-col gap-2 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
                  <p>
                    Mostrando <span className="font-medium text-gray-700">{rangeStart}</span>-<span className="font-medium text-gray-700">{rangeEnd}</span> de{' '}
                    <span className="font-medium text-gray-700">{usersPagination.total}</span>{' '}
                    {usersPagination.total === 1 ? 'usuario' : 'usuarios'}
                  </p>
                  <p>
                    Resultados ordenados por saldo disponible (mayor a menor).
                  </p>
                </div>
                <div className="space-y-3">
                  {users.map((user, index) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                          <span className="text-sm font-semibold text-blue-600">{baseIndex + index + 1}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900" title={user.name}>
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-gray-500" title={user.email}>
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <p className="text-lg font-bold text-green-600">{user.balance.toFixed(2)}</p>
                        <button
                          type="button"
                          onClick={() => openAdjustModal(user)}
                          className="rounded p-1 text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          title="Ajustar balance"
                        >
                          <PlusIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {usersPagination.pages > 1 && (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex justify-between sm:hidden">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, usersPagination.page - 1))}
                  disabled={!canGoPrev}
                  className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(totalPages, usersPagination.page + 1))}
                  disabled={!canGoNext}
                  className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Página <span className="font-medium text-gray-700">{usersPagination.page}</span> de{' '}
                  <span className="font-medium text-gray-700">{totalPages}</span>
                </p>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Paginación">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNumber === usersPagination.page
                          ? 'z-10 border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}
        </div>

        {/* Transacciones por Tipo y Razón */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transacciones por Tipo</h2>
            <div className="space-y-3">
              {dashboard.transactions.byType.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.type === 'CREDIT' ? '➕ Crédito' : '➖ Débito'}
                    </p>
                    <p className="text-sm text-gray-500">{item.count} transacciones</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {item.totalCredits.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transacciones por Razón</h2>
            <div className="space-y-3">
              {dashboard.transactions.byReason.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{item.reason}</p>
                    <p className="text-sm text-gray-500">{item.count} veces</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {item.totalCredits.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Usuarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Usuarios por Balance</h2>
            <div className="space-y-3">
              {dashboard.topUsers.byBalance.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-bold text-green-600">{user.balance.toFixed(2)}</p>
                    <button
                      onClick={() => openAdjustModal(user)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Ajustar balance"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Usuarios Más Activos</h2>
            <div className="space-y-3">
              {dashboard.topUsers.byActivity.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-purple-600">
                    {user.transactionCount} txns
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal de Ajuste de Balance */}
        {adjustModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Ajustar Balance de Créditos
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuario
                  </label>
                  <p className="text-gray-900">{selectedUser.name}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  <p className="text-sm text-gray-500">Balance actual: {selectedUser.balance} créditos</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto (positivo para agregar, negativo para quitar)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="ej: 10.00 o -5.00"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón del ajuste
                  </label>
                  <textarea
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Describe el motivo del ajuste..."
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setAdjustModalOpen(false);
                      setSelectedUser(null);
                      setAdjustAmount('');
                      setAdjustReason('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAdjustCredits}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Ajustar Balance
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
