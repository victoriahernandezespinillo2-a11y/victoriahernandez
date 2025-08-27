"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrophyIcon,
  PlusIcon,
  FolderIcon,
  BuildingLibraryIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface SportCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description?: string;
  isActive: boolean;
  order: number;
  _count: {
    facilities: number;
  };
}

interface SportFacility {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: string;
  availability: string;
  rating: number;
  features: string[];
  isActive: boolean;
  order: number;
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
  };
}

export default function SportsManagement() {
  const [categories, setCategories] = useState<SportCategory[]>([]);
  const [facilities, setFacilities] = useState<SportFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalFacilities: 0,
    activeCategories: 0,
    activeFacilities: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [categoriesRes, facilitiesRes] = await Promise.all([
        fetch('/api/admin/landing/sports/categories'),
        fetch('/api/admin/landing/sports/facilities')
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (facilitiesRes.ok) {
        const facilitiesData = await facilitiesRes.json();
        setFacilities(facilitiesData.facilities || []);
      }

      // Calcular estadísticas
      const activeCategories = categories.filter(cat => cat.isActive).length;
      const activeFacilities = facilities.filter(fac => fac.isActive).length;
      
      setStats({
        totalCategories: categories.length,
        totalFacilities: facilities.length,
        activeCategories,
        activeFacilities,
      });

    } catch (error) {
      console.error('Error fetching sports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/landing/sports/categories/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCategories(categories.filter(cat => cat.id !== id));
        fetchData(); // Recargar datos para actualizar estadísticas
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar la categoría');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error al eliminar la categoría');
    }
  };

  const handleDeleteFacility = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta instalación?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/landing/sports/facilities/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFacilities(facilities.filter(fac => fac.id !== id));
        fetchData(); // Recargar datos para actualizar estadísticas
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar la instalación');
      }
    } catch (error) {
      console.error('Error deleting facility:', error);
      alert('Error al eliminar la instalación');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Instalaciones Deportivas</h1>
          <p className="text-gray-600 mt-2">
            Gestiona las categorías e instalaciones deportivas de la landing page
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/landing/sports/categories/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nueva Categoría</span>
          </Link>
          <Link
            href="/landing/sports/facilities/new"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nueva Instalación</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Categorías</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <BuildingLibraryIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Instalaciones</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalFacilities}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrophyIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categorías Activas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeCategories}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Instalaciones Activas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeFacilities}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/landing/sports/categories"
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <FolderIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-medium text-gray-900">Gestionar Categorías</h3>
              <p className="text-sm text-gray-600">Crear y editar categorías de deportes</p>
            </div>
          </div>
        </Link>

        <Link
          href="/landing/sports/facilities"
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <BuildingLibraryIcon className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-medium text-gray-900">Gestionar Instalaciones</h3>
              <p className="text-sm text-gray-600">Crear y editar instalaciones deportivas</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Categories Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Categorías Recientes</h2>
            <Link
              href="/landing/sports/categories"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Ver todas
            </Link>
          </div>
        </div>
        <div className="p-6">
          {categories.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay categorías creadas</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.slice(0, 6).map((category) => (
                <div
                  key={category.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${category.color}`}>
                        <i className={`${category.icon} text-white text-lg`}></i>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-600">{category._count.facilities} instalaciones</p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Link
                        href={`/landing/sports/categories/${category.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/landing/sports/categories/${category.id}/edit`}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      category.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                    <span className="text-xs text-gray-500">Orden: {category.order}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Facilities Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Instalaciones Recientes</h2>
            <Link
              href="/landing/sports/facilities"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Ver todas
            </Link>
          </div>
        </div>
        <div className="p-6">
          {facilities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay instalaciones creadas</p>
          ) : (
            <div className="space-y-4">
              {facilities.slice(0, 5).map((facility) => (
                <div
                  key={facility.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${facility.category.color}`}>
                      <i className={`${facility.category.icon} text-white text-lg`}></i>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{facility.name}</h3>
                      <p className="text-sm text-gray-600">{facility.category.name} • {facility.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <i className="fas fa-star text-yellow-500 text-xs"></i>
                      <span className="text-sm text-gray-600">
                    {typeof facility.rating === 'string' ? parseFloat(facility.rating).toFixed(1) : facility.rating.toFixed(1)}
                  </span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      facility.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {facility.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                    <div className="flex space-x-1">
                      <Link
                        href={`/landing/sports/facilities/${facility.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/landing/sports/facilities/${facility.id}/edit`}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteFacility(facility.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
