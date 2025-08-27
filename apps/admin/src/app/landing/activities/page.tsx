"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface Activity {
  id: string;
  title: string;
  description: string;
  icon: string;
  schedule: string;
  color: string;
  isActive: boolean;
  order: number;
}

export default function ActivitiesManagement() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActivities: 0,
    activeActivities: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/landing/activities');
      
      if (response.ok) {
        const activitiesData = await response.json();
        setActivities(activitiesData);
        
        // Calcular estadísticas
        const activeActivities = activitiesData.filter((activity: Activity) => activity.isActive).length;
        
        setStats({
          totalActivities: activitiesData.length,
          activeActivities,
        });
      }
    } catch (error) {
      console.error('Error fetching activities data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta actividad?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/landing/activities/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setActivities(activities.filter(activity => activity.id !== id));
        fetchData(); // Recargar datos para actualizar estadísticas
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar la actividad');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Error al eliminar la actividad');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[...Array(2)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-gray-900">Actividades & Eventos</h1>
          <p className="text-gray-600 mt-2">
            Gestiona las actividades y eventos de la landing page
          </p>
        </div>
        <Link
          href="/landing/activities/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nueva Actividad</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Actividades</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalActivities}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Actividades Activas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeActivities}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Lista de Actividades</h2>
        </div>
        <div className="p-6">
          {activities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay actividades creadas</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-6 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${activity.color}`}>
                        <i className={`${activity.icon} text-white text-xl`}></i>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{activity.title}</h3>
                        <p className="text-sm text-gray-600">{activity.schedule}</p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Link
                        href={`/landing/activities/${activity.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/landing/activities/${activity.id}/edit`}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteActivity(activity.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{activity.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      activity.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {activity.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                    <span className="text-xs text-gray-500">Orden: {activity.order}</span>
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
