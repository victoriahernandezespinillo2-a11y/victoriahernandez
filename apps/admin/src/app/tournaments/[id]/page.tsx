'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAdminTournaments } from '@/lib/hooks';
import { showNotification } from '@/components/ErrorNotification';
import {
  TrophyIcon,
  CalendarDaysIcon,
  UsersIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  ArrowLeftIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

const sportColors: Record<string, string> = {
  FOOTBALL: 'bg-green-100 text-green-800',
  BASKETBALL: 'bg-orange-100 text-orange-800',
  TENNIS: 'bg-yellow-100 text-yellow-800',
  VOLLEYBALL: 'bg-purple-100 text-purple-800',
  PADDLE: 'bg-blue-100 text-blue-800'
};

const sportLabels: Record<string, string> = {
  FOOTBALL: 'Fútbol',
  BASKETBALL: 'Básquetbol',
  TENNIS: 'Tenis',
  VOLLEYBALL: 'Voleibol',
  PADDLE: 'Pádel'
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  REGISTRATION_OPEN: 'bg-green-100 text-green-800',
  REGISTRATION_CLOSED: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  REGISTRATION_OPEN: 'Inscripciones Abiertas',
  REGISTRATION_CLOSED: 'Inscripciones Cerradas',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado'
};

export default function TournamentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params.id as string;
  const { getTournament, updateTournament } = useAdminTournaments();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTournament = async () => {
      try {
        const data = await getTournament(tournamentId);
        setTournament(data);
      } catch (error) {
        console.error('Error loading tournament:', error);
        await showNotification({
          title: 'Error',
          message: 'No se pudo cargar el torneo. Por favor, inténtalo de nuevo.',
          type: 'error'
        });
        router.push('/tournaments');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      loadTournament();
    }
  }, [tournamentId, getTournament, router]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateTournament(tournamentId, { status: newStatus });
      await showNotification({
        title: 'Éxito',
        message: `Estado del torneo actualizado a ${statusLabels[newStatus]}`,
        type: 'success'
      });
      // Recargar el torneo para mostrar los cambios
      const updatedTournament = await getTournament(tournamentId);
      setTournament(updatedTournament);
    } catch (error) {
      console.error('Error updating tournament status:', error);
      await showNotification({
        title: 'Error',
        message: 'No se pudo actualizar el estado del torneo',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Torneo no encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">El torneo que buscas no existe.</p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/tournaments')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Volver a Torneos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/tournaments')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Volver a Torneos
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  sportColors[tournament.sport]
                }`}>
                  {sportLabels[tournament.sport]}
                </span>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  statusColors[tournament.status]
                }`}>
                  {statusLabels[tournament.status]}
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              {tournament.status === 'DRAFT' && (
                <button
                  onClick={() => handleStatusChange('REGISTRATION_OPEN')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <TrophyIcon className="h-4 w-4 mr-2" />
                  Publicar Torneo
                </button>
              )}
              {tournament.status === 'REGISTRATION_OPEN' && (
                <button
                  onClick={() => handleStatusChange('REGISTRATION_CLOSED')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                >
                  Cerrar Inscripciones
                </button>
              )}
              <button
                onClick={() => router.push(`/tournaments/${tournamentId}/edit`)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Editar
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Descripción</h2>
              <p className="text-gray-600">{tournament.description}</p>
            </div>

            {/* Rules */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Reglas</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{tournament.rules}</p>
            </div>

            {/* Requirements */}
            {tournament.requirements && tournament.requirements.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Requisitos</h2>
                <ul className="space-y-2">
                  {tournament.requirements.map((req: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 text-blue-500 mr-2">•</span>
                      <span className="text-gray-600">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tournament Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Torneo</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Formato</dt>
                  <dd className="text-sm text-gray-900">{tournament.format}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Categoría</dt>
                  <dd className="text-sm text-gray-900">{tournament.category}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Máximo Participantes</dt>
                  <dd className="text-sm text-gray-900">{tournament.maxParticipants}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tarifa de Inscripción</dt>
                  <dd className="text-sm text-gray-900">€{tournament.registrationFee}</dd>
                </div>
                {tournament.prizePool > 0 && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Premio Total</dt>
                    <dd className="text-sm text-gray-900">€{tournament.prizePool}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Dates */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Fechas</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Inicio de Inscripciones</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(tournament.registrationStartDate).toLocaleDateString('es-ES')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Fin de Inscripciones</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(tournament.registrationEndDate).toLocaleDateString('es-ES')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Inicio del Torneo</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(tournament.startDate).toLocaleDateString('es-ES')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Fin del Torneo</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(tournament.endDate).toLocaleDateString('es-ES')}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Organizer */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Organizador</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                  <dd className="text-sm text-gray-900">{tournament.organizer}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{tournament.contactEmail}</dd>
                </div>
                {tournament.contactPhone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                    <dd className="text-sm text-gray-900">{tournament.contactPhone}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
