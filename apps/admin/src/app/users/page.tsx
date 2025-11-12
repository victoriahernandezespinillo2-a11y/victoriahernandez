'use client';

import { useState, useEffect } from 'react';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAdminUsers } from '@/lib/hooks';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'STAFF' | 'ADMIN';
  membershipType?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLogin?: string;
}




const roleColors: Record<string, string> = {
  USER: 'bg-blue-100 text-blue-800',
  STAFF: 'bg-green-100 text-green-800',
  ADMIN: 'bg-purple-100 text-purple-800'
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  SUSPENDED: 'bg-red-100 text-red-800'
};

export default function UsersPage() {
  const { users, loading, error, updateUser, deleteUser, getUsers, getStats, pagination, stats } = useAdminUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Sincronizar currentPage con pagination.page cuando cambie la paginación (solo si es diferente)
  useEffect(() => {
    if (pagination && pagination.page && pagination.page !== currentPage && !isInitialLoad) {
      setCurrentPage(pagination.page);
    }
  }, [pagination?.page, isInitialLoad]);
  
  // Cargar usuarios y estadísticas al montar el componente
  useEffect(() => {
    const loadData = async () => {
      setIsInitialLoad(true);
      await Promise.all([
        getUsers({ page: 1, limit: 20 }).catch(() => {}),
        getStats().catch(() => {})
      ]);
      setIsInitialLoad(false);
    };
    loadData();
  }, [getUsers, getStats]);
  
  // Recargar usuarios cuando cambian los filtros o búsqueda (pero no en la carga inicial)
  useEffect(() => {
    if (isInitialLoad) return; // No ejecutar en la carga inicial
    
    const timeoutId = setTimeout(() => {
      setIsLoading(true);
      getUsers({
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      }).finally(() => {
        setIsLoading(false);
      });
    }, searchTerm ? 500 : 0); // Debounce para búsqueda
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, roleFilter, statusFilter, currentPage, getUsers, isInitialLoad]);
  
  // Estado para el modal de confirmación de eliminación
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string; name: string } | null>(null);

  // Estados para modales de ver y editar usuario
  const [viewUserModalOpen, setViewUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const itemsPerPage = 10;

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
              Error al cargar los usuarios
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Usar usuarios directamente del servidor (ya vienen filtrados)
  const safeUsers = Array.isArray(users) ? users : [];
  const paginatedUsers = safeUsers;

  const handleDeleteUser = (user: User) => {
    setUserToDelete({
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`
    });
    setDeleteConfirmOpen(true);
  };

  // Función para ver usuario
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewUserModalOpen(true);
  };

  // Función para editar usuario
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUserModalOpen(true);
  };

  // Función para cerrar modales
  const closeModals = () => {
    setViewUserModalOpen(false);
    setEditUserModalOpen(false);
    setSelectedUser(null);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const result = await deleteUser(userToDelete.id);
      
      // Mostrar información de éxito
      toast.success(`Usuario "${userToDelete.name}" eliminado exitosamente`);
      
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      if (errorMessage.includes('reservas o membresías activas')) {
        toast.error('No se puede eliminar: El usuario tiene reservas o membresías activas. Cancela primero todas las reservas activas y desactiva las membresías.');
      } else {
        toast.error(`Error al eliminar el usuario: ${errorMessage}`);
      }
    }
  };

  const cancelDeleteUser = () => {
    setDeleteConfirmOpen(false);
    setUserToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <UsersIcon className="h-8 w-8 mr-3 text-blue-600" />
            Gestión de Usuarios
          </h1>
          <p className="mt-2 text-gray-600">
            Administra los usuarios del polideportivo
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => { window.location.href = '/users/new'; }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Stats Cards - Usando estadísticas del servidor */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.total ?? pagination?.total ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-green-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Usuarios Activos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.active ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-purple-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Administradores</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.byRole?.ADMIN ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-yellow-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Staff</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.byRole?.STAFF ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Resetear a página 1 al buscar
                }}
              />
            </div>
          </div>
          
          {/* Role Filter */}
          <div>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1); // Resetear a página 1 al filtrar
              }}
            >
              <option value="ALL">Todos los roles</option>
              <option value="USER">Usuario</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1); // Resetear a página 1 al filtrar
              }}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="SUSPENDED">Suspendido</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membresía
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Acceso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      roleColors[user.role]
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      statusColors[user.status]
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(user as any).membershipType || 'Sin membresía'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(user as any).lastLogin ? new Date((user as any).lastLogin as string).toLocaleDateString() : 'Nunca'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => handleViewUser(user)}
                        title="Ver usuario"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button 
                        className="text-green-600 hover:text-green-900"
                        onClick={() => handleEditUser(user)}
                        title="Editar usuario"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteUser(user)}
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
        {pagination && pagination.total > pagination.limit && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => {
                  const next = Math.max(1, currentPage - 1);
                  setCurrentPage(next);
                }}
                disabled={currentPage === 1 || isLoading}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => {
                  if (!pagination) return;
                  const next = Math.min(pagination.pages, currentPage + 1);
                  setCurrentPage(next);
                }}
                disabled={!pagination || currentPage === pagination.pages || isLoading}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando {((currentPage - 1) * pagination.limit + 1)}-{Math.min(currentPage * pagination.limit, pagination.total)} de <span className="font-medium">{pagination.total}</span> usuarios
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => {
                        setCurrentPage(page);
                      }}
                      disabled={isLoading}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
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

      {/* Modal de ver usuario */}
      {viewUserModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Detalles del Usuario</h3>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rol</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    roleColors[selectedUser.role]
                  }`}>
                    {selectedUser.role}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    statusColors[selectedUser.status]
                  }`}>
                    {selectedUser.status}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Membresía</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {(selectedUser as any).membershipType || 'Sin membresía'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de registro</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                {(selectedUser as any).lastLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Último acceso</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date((selectedUser as any).lastLogin).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de editar usuario */}
      {editUserModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Editar Usuario</h3>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    defaultValue={selectedUser.firstName}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Apellido</label>
                  <input
                    type="text"
                    defaultValue={selectedUser.lastName}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    defaultValue={selectedUser.email}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rol</label>
                  <select
                    defaultValue={selectedUser.role}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="USER">Usuario</option>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <select
                    defaultValue={selectedUser.status}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                    <option value="SUSPENDED">Suspendido</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // TODO: Implementar actualización del usuario
                    toast.success('Usuario actualizado exitosamente');
                    closeModals();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar usuario permanentemente</h3>
            {userToDelete && (
              <div className="text-sm text-gray-600 mb-6">
                <p className="mb-4">
                  ¿Estás seguro de que deseas eliminar permanentemente al usuario "{userToDelete.name}" ({userToDelete.email})?
                </p>
                <p className="mb-2">Esta acción eliminará COMPLETAMENTE:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>El usuario de la base de datos</li>
                  <li>Todas sus reservas (pasadas y futuras)</li>
                  <li>Todas sus membresías</li>
                  <li>Todos sus pagos y transacciones</li>
                  <li>Su cuenta de Firebase Auth (si está configurado)</li>
                  <li>Todos los datos asociados</li>
                </ul>
                <p className="mt-4 text-red-600 font-semibold">⚠️ Esta acción NO se puede deshacer.</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDeleteUser}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700"
              >
                Eliminar permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}