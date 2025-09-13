'use client';

import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface Stat {
  id: string;
  value: string;
  suffix?: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStat, setEditingStat] = useState<Stat | null>(null);
  const [formData, setFormData] = useState({
    value: '',
    suffix: '',
    label: '',
    description: '',
    icon: '',
    color: '',
    isActive: true,
    order: 0,
  });

  // Cargar estadísticas
  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/landing/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || []);
      } else {
        toast.error('Error al cargar las estadísticas');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  // Crear o actualizar estadística
  const saveStat = async () => {
    try {
      const url = editingStat 
        ? `/api/admin/landing/stats/${editingStat.id}`
        : '/api/admin/landing/stats';
      
      const method = editingStat ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingStat 
            ? 'Estadística actualizada correctamente'
            : 'Estadística creada correctamente'
        );
        setShowModal(false);
        setEditingStat(null);
        resetForm();
        loadStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar la estadística');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar la estadística');
    }
  };

  // Eliminar estadística
  const deleteStat = async (id: string) => {
    const { confirm } = await import('@/components/ConfirmDialog');
    const ok = await confirm({
      title: 'Eliminar estadística',
      description: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
      tone: 'danger',
      confirmText: 'Eliminar',
    });
    if (!ok) return;

    try {
      const response = await fetch(`/api/admin/landing/stats/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Estadística eliminada correctamente');
        loadStats();
      } else {
        toast.error('Error al eliminar la estadística');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar la estadística');
    }
  };

  // Abrir modal para editar
  const openEditModal = (stat: Stat) => {
    setEditingStat(stat);
    setFormData({
      value: stat.value,
      suffix: stat.suffix || '',
      label: stat.label,
      description: stat.description || '',
      icon: stat.icon || '',
      color: stat.color || '',
      isActive: stat.isActive,
      order: stat.order,
    });
    setShowModal(true);
  };

  // Abrir modal para crear
  const openCreateModal = () => {
    setEditingStat(null);
    resetForm();
    setShowModal(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      value: '',
      suffix: '',
      label: '',
      description: '',
      icon: '',
      color: '',
      isActive: true,
      order: 0,
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
          <p className="text-gray-600">Configura las métricas y números destacados</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Agregar Estadística
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
              stat.color || 'bg-gradient-to-br from-orange-500 to-red-600'
            }`}>
              {stat.icon ? (
                <i className={`${stat.icon} text-white text-xl`}></i>
              ) : (
                <ChartBarIcon className="h-6 w-6 text-white" />
              )}
            </div>

            {/* Value */}
            <div className="mb-2">
              <span className="text-3xl font-bold text-gray-900">
                {stat.value}
              </span>
              {stat.suffix && (
                <span className="text-2xl font-bold text-gray-900 ml-1">
                  {stat.suffix}
                </span>
              )}
            </div>

            {/* Label */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {stat.label}
            </h3>

            {/* Description */}
            {stat.description && (
              <p className="text-sm text-gray-600 mb-4">
                {stat.description}
              </p>
            )}

            {/* Status */}
            <div className="flex items-center justify-between">
              <div>
                {stat.isActive ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <EyeIcon className="h-3 w-3 mr-1" />
                    Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    <EyeSlashIcon className="h-3 w-3 mr-1" />
                    Inactivo
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(stat)}
                  className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                  title="Editar"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteStat(stat.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Eliminar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingStat ? 'Editar Estadística' : 'Crear Estadística'}
            </h2>
            
            <form onSubmit={(e) => { e.preventDefault(); saveStat(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor *
                  </label>
                  <input
                    type="text"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                    placeholder="5000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sufijo
                  </label>
                  <input
                    type="text"
                    value={formData.suffix}
                    onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="+"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etiqueta *
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                  placeholder="Usuarios Activos"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Deportistas confían en nosotros"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icono (FontAwesome)
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="fas fa-users"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color (Tailwind)
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="bg-gradient-to-br from-blue-500 to-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Activo</span>
                </label>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orden
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  {editingStat ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


