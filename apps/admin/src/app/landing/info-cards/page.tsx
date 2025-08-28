"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  InformationCircleIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface InfoCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
  isActive: boolean;
  order: number;
}

export default function InfoCardsManagement() {
  const [infoCards, setInfoCards] = useState<InfoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCards: 0,
    activeCards: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/landing/info-cards');
      
      if (response.ok) {
        const infoCardsData = await response.json();
        setInfoCards(infoCardsData);
        
        // Calcular estadísticas
        const activeCards = infoCardsData.filter((card: InfoCard) => card.isActive).length;
        
        setStats({
          totalCards: infoCardsData.length,
          activeCards,
        });
      }
    } catch (error) {
      console.error('Error fetching info cards data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarjeta de información?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/landing/info-cards/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setInfoCards(infoCards.filter(card => card.id !== id));
        fetchData(); // Recargar datos para actualizar estadísticas
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar la tarjeta');
      }
    } catch (error) {
      console.error('Error deleting info card:', error);
      alert('Error al eliminar la tarjeta');
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
          <h1 className="text-3xl font-bold text-gray-900">Información General</h1>
          <p className="text-gray-600 mt-2">
            Gestiona las tarjetas de información general de la landing page
          </p>
        </div>
        <Link
          href="/landing/info-cards/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nueva Tarjeta</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <InformationCircleIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tarjetas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCards}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tarjetas Activas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeCards}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Lista de Tarjetas</h2>
        </div>
        <div className="p-6">
          {infoCards.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay tarjetas creadas</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {infoCards.map((card) => (
                <div
                  key={card.id}
                  className="p-6 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600">
                        <i className={`${card.icon} text-white text-xl`}></i>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{card.title}</h3>
                        <p className="text-sm text-gray-600">{card.description}</p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Link
                        href={`/landing/info-cards/${card.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/landing/info-cards/${card.id}/edit`}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{card.content}</p>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      card.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {card.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                    <span className="text-xs text-gray-500">Orden: {card.order}</span>
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


