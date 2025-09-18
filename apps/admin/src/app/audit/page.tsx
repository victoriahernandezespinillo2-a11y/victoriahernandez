'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CalendarDaysIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

type AuditLog = {
  id: string;
  timestamp: string;
  userId: string | null;
  userName: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  details: string;
  ipAddress: string | null;
  userAgent: string | null;
  status: 'success' | 'warning' | 'error' | 'info';
};

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/audit?limit=200', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        
        if (json.success && json.data?.auditLogs) {
          const mapped: AuditLog[] = json.data.auditLogs.map((e: any) => ({
            id: e.id,
            timestamp: e.timestamp || e.createdAt,
            userId: e.userId || null,
            userName: e.userName || 'Sistema',
            action: e.action || 'EVENT',
            resource: e.resource || null,
            resourceId: e.resourceId || null,
            details: typeof e.details === 'string' ? e.details : JSON.stringify(e.details),
            ipAddress: e.ipAddress || null,
            userAgent: e.userAgent || null,
            status: e.status?.toLowerCase() || 'success',
          }));
          setAuditLogs(mapped);
        } else {
          setAuditLogs([]);
        }
      } catch (e: any) {
        setError(e?.message || 'Error cargando auditoría');
        setAuditLogs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'warning' | 'error'>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'error': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      default: return <InformationCircleIcon className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'VIEW': return 'bg-gray-100 text-gray-800';
      case 'LOGIN_FAILED': return 'bg-yellow-100 text-yellow-800';
      case 'BACKUP_FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resource ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    
    return matchesSearch && matchesStatus && matchesAction;
  });

  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];

  const stats = useMemo(() => ({
    total: auditLogs.length,
    success: auditLogs.filter(log => log.status === 'success').length,
    warning: auditLogs.filter(log => log.status === 'warning').length,
    error: auditLogs.filter(log => log.status === 'error').length
  }), [auditLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <DocumentTextIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
          <p className="text-gray-600">Registro de actividades y eventos del sistema</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Eventos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Exitosos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.success}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Advertencias</p>
              <p className="text-2xl font-bold text-gray-900">{stats.warning}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Errores</p>
              <p className="text-2xl font-bold text-gray-900">{stats.error}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en logs de auditoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="success">Exitosos</option>
              <option value="warning">Advertencias</option>
              <option value="error">Errores</option>
            </select>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las acciones</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Logs de Auditoría ({filteredLogs.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recurso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detalles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatTimestamp(log.timestamp)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">{log.userName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.resource}</div>
                    <div className="text-sm text-gray-500">{log.resourceId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(log.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                        {log.status === 'success' ? 'Exitoso' :
                         log.status === 'warning' ? 'Advertencia' : 'Error'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{log.details}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detalles del Log de Auditoría</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID</label>
                  <p className="text-sm text-gray-900">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha/Hora</label>
                  <p className="text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Usuario</label>
                  <p className="text-sm text-gray-900">{selectedLog.userName} ({selectedLog.userId})</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Acción</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recurso</label>
                  <p className="text-sm text-gray-900">{selectedLog.resource}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID del Recurso</label>
                  <p className="text-sm text-gray-900">{selectedLog.resourceId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <div className="flex items-center">
                    {getStatusIcon(selectedLog.status)}
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedLog.status)}`}>
                      {selectedLog.status === 'success' ? 'Exitoso' :
                       selectedLog.status === 'warning' ? 'Advertencia' : 'Error'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP</label>
                  <p className="text-sm text-gray-900">{selectedLog.ipAddress}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Detalles</label>
                <p className="text-sm text-gray-900">{selectedLog.details}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User Agent</label>
                <p className="text-sm text-gray-900 break-all">{selectedLog.userAgent}</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}