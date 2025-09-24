'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  EyeIcon,
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
  createdAt?: string;
  updatedAt?: string;
}

export default function ActivityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activityId) {
      fetchActivity();
    }
  }, [activityId]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/landing/activities/${activityId}`);
      
      if (response.ok) {
        const activityData = await response.json();
        setActivity(activityData);
      } else if (response.status === 404) {
        setError('Actividad no encontrada');
      } else {
        setError('Error al cargar la actividad');
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!activity) return;
    
    const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar la actividad "${activity.title}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/landing/activities/${activityId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/landing/activities');
      } else {
        alert('Error al eliminar la actividad');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Error de conexión');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando actividad...</p>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Actividad no encontrada'}</p>
          <Link
            href="/landing/activities"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver a Actividades
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/landing/activities"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Volver a Actividades
            </Link>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/landing/activities/${activityId}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Editar
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Eliminar
            </button>
          </div>
        </div>

        {/* Activity Details */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-8">
            <div className="flex items-start space-x-6">
              {/* Icon */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${activity.color}`}>
                <CalendarIcon className="h-8 w-8 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-3xl font-bold text-gray-900">{activity.title}</h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    activity.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Descripción</h3>
                    <p className="text-gray-900">{activity.description}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Horario</h3>
                    <p className="text-gray-900">{activity.schedule}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Orden de Visualización</h3>
                      <p className="text-gray-900">{activity.order}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">ID</h3>
                      <p className="text-gray-900 font-mono text-sm">{activity.id}</p>
                    </div>
                  </div>

                  {activity.createdAt && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Fecha de Creación</h3>
                        <p className="text-gray-900">
                          {new Date(activity.createdAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {activity.updatedAt && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Última Actualización</h3>
                          <p className="text-gray-900">
                            {new Date(activity.updatedAt).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






