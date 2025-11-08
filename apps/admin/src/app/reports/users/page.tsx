'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAdminReports } from '@/lib/hooks';
// Función de exportación CSV simple
const downloadCSV = (data: any[][], filename: string) => {
  const csvContent = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
import { 
  UsersIcon, 
  UserPlusIcon, 
  UserMinusIcon, 
  ChartBarIcon,
  EyeIcon,
  XCircleIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  TableCellsIcon,
  CalendarIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

export default function UsersReportPage() {
  const { getCustomersReport } = useAdminReports();
  const [period, setPeriod] = useState<'7d'|'30d'|'90d'|'1y'|'custom'>('30d');
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const ago = new Date();
    ago.setDate(today.getDate() - 30);
    return {
      start: ago.toISOString().slice(0,10),
      end: today.toISOString().slice(0,10)
    };
  });
  const [showUsersTable, setShowUsersTable] = useState(false);
  const [showCharts, setShowCharts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [membershipFilter, setMembershipFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name'|'email'|'role'|'createdAt'|'reservations'>('name');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (active) setLoading(true);
        const params = new URLSearchParams();
        params.set('period', period);
        if (period === 'custom') {
          params.set('startDate', dateRange.start);
          params.set('endDate', dateRange.end);
        }
        const result = await getCustomersReport(params);
        const normalized = (result as any)?.data ?? result;
        if (active) setData(normalized);
      } catch (err) {
        if (active) {
          console.error('Error loading users report:', err);
          setError(err as Error);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [getCustomersReport, period, dateRange]);

  // Función auxiliar para calcular fecha de inicio del período
  const getPeriodStartDate = (p: string) => {
    const today = new Date();
    let ago = new Date();
    
    switch (p) {
      case '7d': ago.setDate(today.getDate() - 7); break;
      case '30d': ago.setDate(today.getDate() - 30); break;
      case '90d': ago.setDate(today.getDate() - 90); break;
      case '1y': ago.setDate(today.getDate() - 365); break;
      default: ago.setDate(today.getDate() - 30);
    }
    
    return ago.toISOString().slice(0,10);
  };

  // Función para manejar la visualización de usuario
  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // Función para exportar datos
  const exportFile = (format: 'csv'|'json') => {
    const payload = {
      period,
      dateRange,
      groupBy: 'day'
    };

    const filename = `reporte_usuarios_${period}_${new Date().toISOString().slice(0,10)}`;
    
    if (format === 'json') {
      const jsonData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          period,
          dateRange,
          totalUsers: calculatedMetrics.totalUsers,
          activeUsers: calculatedMetrics.activeUsers,
          newUsers: calculatedMetrics.newUsers,
          engagementRate: calculatedMetrics.engagementRate,
          retentionRate: calculatedMetrics.retentionRate,
          avgReservationsPerUser: calculatedMetrics.avgReservationsPerUser
        },
        summary: calculatedMetrics,
        users: filteredUsers.map((user: any) => ({
          id: user.id,
          name: user.name || 'Sin nombre',
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          reservationsCount: user._count?.reservations || 0,
          totalSpent: user.totalSpent || 0
        })),
        charts: {
          byRole: calculatedMetrics.byRole,
          activity: calculatedMetrics.activity,
          timeline: calculatedMetrics.timeline
        }
      };
      
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const csvData = [
        ['Reporte de Usuarios', '', '', ''],
        ['Período', period, 'Fecha de generación', new Date().toLocaleString('es-ES')],
        ['', '', '', ''],
        ['Métricas Generales', '', '', ''],
        ['Total de usuarios', calculatedMetrics.totalUsers, '', ''],
        ['Usuarios activos', calculatedMetrics.activeUsers, '', ''],
        ['Nuevos usuarios', calculatedMetrics.newUsers, '', ''],
        ['Tasa de engagement', `${calculatedMetrics.engagementRate}%`, '', ''],
        ['Tasa de retención', `${calculatedMetrics.retentionRate}%`, '', ''],
        ['Reservas promedio por usuario', calculatedMetrics.avgReservationsPerUser, '', ''],
        ['', '', '', ''],
        ['Usuarios Detallados', '', '', ''],
        ['ID', 'Nombre', 'Email', 'Rol', 'Estado', 'Fecha de registro', 'Último acceso', 'Reservas', 'Total gastado'],
        ...filteredUsers.map((user: any) => [
          user.id,
          user.name || 'Sin nombre',
          user.email,
          user.role,
          user.isActive ? 'Activo' : 'Inactivo',
          user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES') : '-',
          user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('es-ES') : '-',
          user._count?.reservations || 0,
          user.totalSpent || 0
        ])
      ];
      downloadCSV(csvData, `${filename}.csv`);
    }
  };

  // Cálculo de métricas
  const calculatedMetrics = useMemo(() => {
    const baseResult = {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      newUsers: 0,
      engagementRate: 0,
      retentionRate: 0,
      avgReservationsPerUser: 0,
      byRole: [] as any[],
      activity: [] as any[],
      timeline: [] as any[],
      usersList: [] as any[],
      topUsers: [] as any[],
    };

    if (!data) {
      return baseResult;
    }

    const summary = (data.summary ?? {}) as {
      totalUsers?: number;
      activeUsers?: number;
      inactiveUsers?: number;
      newUsers?: number;
      periodStart?: string;
      periodEnd?: string;
    };

    const users = Array.isArray(data.users) ? data.users : [];

    const fallbackStartStr =
      period === 'custom' && dateRange.start ? dateRange.start : getPeriodStartDate(period);
    const periodStart = summary.periodStart
      ? new Date(summary.periodStart)
      : new Date(`${fallbackStartStr}T00:00:00`);

    const totalUsers = summary.totalUsers ?? users.length;
    const activeUsers = summary.activeUsers ?? users.filter((u: any) => u.isActive).length;
    const inactiveUsers = summary.inactiveUsers ?? Math.max(0, totalUsers - activeUsers);
    const newUsers =
      summary.newUsers ??
      users.filter((u: any) => {
        if (!u.createdAt) return false;
        return new Date(u.createdAt) >= periodStart;
      }).length;

    const usersWithReservations = users.filter(
      (u: any) => (u._count?.reservations || 0) > 0
    ).length;
    const engagementRate =
      totalUsers > 0 ? Math.round((usersWithReservations / totalUsers) * 100) : 0;

    const activeForRetention = summary.activeUsers ?? activeUsers;
    const retentionRate =
      totalUsers > 0 ? Math.round((activeForRetention / totalUsers) * 100) : 0;

    const totalReservations = users.reduce(
      (sum: number, u: any) => sum + (u._count?.reservations || 0),
      0
    );
    const avgReservationsPerUser =
      totalUsers > 0 ? Math.round((totalReservations / totalUsers) * 10) / 10 : 0;

    const byRoleMap = users.reduce((acc: Record<string, { role: string; count: number }>, user: any) => {
      const role = user.role || 'UNKNOWN';
      if (!acc[role]) {
        acc[role] = { role, count: 0 };
      }
      acc[role].count += 1;
      return acc;
    }, {});

    const byRole = Object.values(byRoleMap).map((roleData: any) => ({
      role: roleData.role,
      count: roleData.count,
      percentage: totalUsers > 0 ? Math.round((roleData.count / totalUsers) * 100) : 0,
    }));

    const activity: Array<{ date: string; count: number; label: string }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayUsers = users.filter((u: any) => {
        if (!u.createdAt) return false;
        return new Date(u.createdAt).toISOString().slice(0, 10) === dateStr;
      }).length;
      activity.push({
        date: dateStr,
        count: dayUsers,
        label: date.toLocaleDateString('es-ES', { weekday: 'short' }),
      });
    }

    const timeline: Array<{ date: string; count: number; label: string }> = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayUsers = users.filter((u: any) => {
        if (!u.createdAt) return false;
        return new Date(u.createdAt).toISOString().slice(0, 10) === dateStr;
      }).length;
      timeline.push({
        date: dateStr,
        count: dayUsers,
        label: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      });
    }

    const topUsers = users
      .slice()
      .sort((a: any, b: any) => (b._count?.reservations || 0) - (a._count?.reservations || 0))
      .slice(0, 5)
      .map((user: any) => ({
        id: user.id,
        name: user.name || 'Sin nombre',
        email: user.email,
        reservations: user._count?.reservations || 0,
        role: user.role,
      }));

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsers,
      engagementRate,
      retentionRate,
      avgReservationsPerUser,
      byRole,
      activity,
      timeline,
      usersList: users,
      topUsers,
    };
  }, [data, period, dateRange.start, dateRange.end]);

  // Filtros y paginación
  const filteredUsers = useMemo(() => {
    let filtered = calculatedMetrics.usersList;

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter((user: any) =>
        (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por rol
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter((user: any) => user.role === roleFilter);
    }

    // Filtro por estado
    if (statusFilter !== 'ALL') {
      const isActive = statusFilter === 'ACTIVE';
      filtered = filtered.filter((user: any) => user.isActive === isActive);
    }

    // Ordenamiento
    filtered.sort((a: any, b: any) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'email':
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
          break;
        case 'role':
          aVal = a.role || '';
          bVal = b.role || '';
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        case 'reservations':
          aVal = a._count?.reservations || 0;
          bVal = b._count?.reservations || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [calculatedMetrics.usersList, searchTerm, roleFilter, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando reporte de usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error al cargar el reporte</div>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header móvil */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Reporte de Usuarios</h1>
            <p className="text-sm text-gray-600">Análisis de usuarios y engagement</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowUsersTable(!showUsersTable)}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <TableCellsIcon className="w-4 h-4"/>
              {showUsersTable ? 'Ocultar' : 'Ver'} Tabla
            </button>
            <button 
              onClick={() => setShowCharts(!showCharts)}
              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <ChartBarIcon className="w-4 h-4"/>
              {showCharts ? 'Ocultar' : 'Ver'} Gráficos
            </button>
            <button 
              onClick={() => exportFile('csv')}
              className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              <DocumentTextIcon className="w-4 h-4"/>
              CSV
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Controles de período */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setPeriod('7d')}
              className={`px-3 py-2 text-sm font-medium rounded-lg ${
                period === '7d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => setPeriod('30d')}
              className={`px-3 py-2 text-sm font-medium rounded-lg ${
                period === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              30 días
            </button>
            <button
              onClick={() => setPeriod('90d')}
              className={`px-3 py-2 text-sm font-medium rounded-lg ${
                period === '90d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              90 días
            </button>
            <button
              onClick={() => setPeriod('1y')}
              className={`px-3 py-2 text-sm font-medium rounded-lg ${
                period === '1y' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              1 año
            </button>
          </div>
          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
                <p className="text-2xl font-bold text-gray-900">{calculatedMetrics.totalUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <UserPlusIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Nuevos</p>
                <p className="text-2xl font-bold text-gray-900">{calculatedMetrics.newUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <UserMinusIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Activos</p>
                <p className="text-2xl font-bold text-gray-900">{calculatedMetrics.activeUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Engagement</p>
                <p className="text-2xl font-bold text-gray-900">{calculatedMetrics.engagementRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas adicionales */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg shadow-sm border p-3">
            <p className="text-xs font-medium text-gray-500">Retención</p>
            <p className="text-lg font-bold text-gray-900">{calculatedMetrics.retentionRate}%</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-3">
            <p className="text-xs font-medium text-gray-500">Reservas Promedio</p>
            <p className="text-lg font-bold text-gray-900">{calculatedMetrics.avgReservationsPerUser}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-3">
            <p className="text-xs font-medium text-gray-500">Inactivos</p>
            <p className="text-lg font-bold text-gray-900">{calculatedMetrics.inactiveUsers}</p>
          </div>
        </div>

        {/* Gráficos y análisis */}
        {showCharts && (
          <div className="space-y-4">
            {/* Selector de gráficos */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Análisis y Gráficos</h3>
              
              {/* Distribución por roles */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Distribución por Roles</h4>
                <div className="space-y-2">
                  {calculatedMetrics.byRole.map((role: any) => (
                    <div key={role.role} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {role.role === 'ADMIN' ? 'Administrador' : 
                         role.role === 'USER' ? 'Usuario' : 
                         role.role === 'STAFF' ? 'Personal' : role.role}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${role.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                          {role.count} ({role.percentage}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actividad */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Actividad (Últimos 7 días)</h4>
                <div className="space-y-2">
                  {calculatedMetrics.activity.map((day: any) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 w-16">{day.label}</span>
                      <div className="flex-1 mx-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.max(10, (day.count / Math.max(...calculatedMetrics.activity.map((d: any) => d.count), 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">{day.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Timeline de Registros (Últimos 14 días)</h4>
                <div className="space-y-2">
                  {calculatedMetrics.timeline.slice(-7).map((day: any) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 w-16">{day.label}</span>
                      <div className="flex-1 mx-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${Math.max(10, (day.count / Math.max(...calculatedMetrics.timeline.map((d: any) => d.count), 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">{day.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top usuarios */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Top Usuarios por Reservas</h4>
                <div className="space-y-2">
                  {calculatedMetrics.topUsers.map((user: any, index: number) => (
                    <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                        <div className="ml-2">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{user.reservations} reservas</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabla detallada de usuarios móvil */}
        {showUsersTable && (
          <div className="px-4 pb-3">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Lista de Usuarios</h3>
                <button onClick={() => exportFile('json')} className="flex items-center gap-1 px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-xs">
                  <DocumentTextIcon className="w-3 h-3"/>JSON
                </button>
              </div>

              {/* Filtros móviles */}
              <div className="space-y-2 mb-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="ALL">Todos los roles</option>
                    <option value="ADMIN">Administradores</option>
                    <option value="USER">Usuarios</option>
                    <option value="STAFF">Personal</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="ACTIVE">Activos</option>
                    <option value="INACTIVE">Inactivos</option>
                  </select>
                </div>
              </div>

              {/* Lista de usuarios móvil */}
              <div className="space-y-2">
                {paginatedUsers.length > 0 ? paginatedUsers.slice(0, 10).map((user: any) => (
                  <div key={user.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-blue-600">
                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleViewUser(user)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Ver detalles del usuario"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Rol:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                          user.role === 'USER' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'STAFF' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'ADMIN' ? 'Administrador' :
                           user.role === 'USER' ? 'Usuario' :
                           user.role === 'STAFF' ? 'Personal' : user.role}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estado:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reservas:</span>
                        <span className="text-gray-800">{user._count?.reservations || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Registro:</span>
                        <span className="text-gray-800">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES') : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <UsersIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No se encontraron usuarios</p>
                  </div>
                )}
                {paginatedUsers.length > 10 && (
                  <div className="text-center py-2 text-xs text-gray-500">
                    Mostrando 10 de {paginatedUsers.length} usuarios
                  </div>
                )}
              </div>

              {/* Paginación */}
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
                        Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
                        </span>{' '}
                        de <span className="font-medium">{filteredUsers.length}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Anterior
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Siguiente
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de detalles de usuario */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Detalles del Usuario</h3>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.name || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rol</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUser.role === 'ADMIN' ? 'Administrador' : 
                       selectedUser.role === 'USER' ? 'Usuario' : 
                       selectedUser.role === 'STAFF' ? 'Personal' : selectedUser.role}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUser.isActive ? 'Activo' : 'Inactivo'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reservas</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser._count?.reservations || 0}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Registro</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('es-ES') : 'No disponible'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Último Acceso</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleDateString('es-ES') : 'Nunca'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cerrar
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