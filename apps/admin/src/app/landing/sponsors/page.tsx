'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  StarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface Sponsor {
  id: string;
  name: string;
  category?: string;
  logoUrl?: string;
  description?: string;
  website?: string;
  partnership?: string;
  since?: string;
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
  benefits: string[];
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

const tierColors = {
  PLATINUM: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800',
  GOLD: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800',
  SILVER: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700',
  BRONZE: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800',
};

const tierLabels = {
  PLATINUM: 'Platino',
  GOLD: 'Oro',
  SILVER: 'Plata',
  BRONZE: 'Bronce',
};

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    logoUrl: string;
    description: string;
    website: string;
    partnership: string;
    since: string;
    tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
    benefits: string[];
    isActive: boolean;
    order: number;
  }>({
    name: '',
    category: '',
    logoUrl: '',
    description: '',
    website: '',
    partnership: '',
    since: '',
    tier: 'SILVER',
    benefits: [],
    isActive: true,
    order: 0,
  });
  const [newBenefit, setNewBenefit] = useState('');

  // Cargar patrocinadores
  const loadSponsors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/landing/sponsors');
      if (response.ok) {
        const data = await response.json();
        setSponsors(data.sponsors || []);
      } else {
        toast.error('Error al cargar los patrocinadores');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar los patrocinadores');
    } finally {
      setLoading(false);
    }
  };

  // Crear o actualizar patrocinador
  const saveSponsor = async () => {
    try {
      const url = editingSponsor 
        ? `/api/admin/landing/sponsors/${editingSponsor.id}`
        : '/api/admin/landing/sponsors';
      
      const method = editingSponsor ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingSponsor 
            ? 'Patrocinador actualizado correctamente'
            : 'Patrocinador creado correctamente'
        );
        setShowModal(false);
        setEditingSponsor(null);
        resetForm();
        loadSponsors();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar el patrocinador');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar el patrocinador');
    }
  };

  // Eliminar patrocinador
  const deleteSponsor = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este patrocinador?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/landing/sponsors/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Patrocinador eliminado correctamente');
        loadSponsors();
      } else {
        toast.error('Error al eliminar el patrocinador');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar el patrocinador');
    }
  };

  // Agregar beneficio
  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({
        ...formData,
        benefits: [...formData.benefits, newBenefit.trim()],
      });
      setNewBenefit('');
    }
  };

  // Eliminar beneficio
  const removeBenefit = (index: number) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index),
    });
  };

  // Abrir modal para editar
  const openEditModal = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({
      name: sponsor.name,
      category: sponsor.category || '',
      logoUrl: sponsor.logoUrl || '',
      description: sponsor.description || '',
      website: sponsor.website || '',
      partnership: sponsor.partnership || '',
      since: sponsor.since || '',
      tier: sponsor.tier as 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE',
      benefits: sponsor.benefits,
      isActive: sponsor.isActive,
      order: sponsor.order,
    });
    setShowModal(true);
  };

  // Abrir modal para crear
  const openCreateModal = () => {
    setEditingSponsor(null);
    resetForm();
    setShowModal(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      logoUrl: '',
      description: '',
      website: '',
      partnership: '',
      since: '',
      tier: 'SILVER' as 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE',
      benefits: [],
      isActive: true,
      order: 0,
    });
    setNewBenefit('');
  };

  useEffect(() => {
    loadSponsors();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patrocinadores</h1>
          <p className="text-gray-600">Gestiona los logos e información de patrocinadores</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Agregar Patrocinador
        </button>
      </div>

      {/* Sponsors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sponsors.map((sponsor) => (
          <div key={sponsor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Logo */}
            <div className="h-48 bg-gradient-to-br from-purple-500 to-pink-600 relative overflow-hidden">
              {sponsor.logoUrl ? (
                <Image
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  width={400}
                  height={192}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <StarIcon className="h-12 w-12 text-white opacity-50" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tierColors[sponsor.tier]}`}>
                  {tierLabels[sponsor.tier]}
                </span>
              </div>
              <div className="absolute top-2 left-2">
                {sponsor.isActive ? (
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
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{sponsor.name}</h3>
              {sponsor.category && (
                <p className="text-sm text-gray-600 mb-2">{sponsor.category}</p>
              )}
              {sponsor.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {sponsor.description}
                </p>
              )}

              {/* Partnership Info */}
              <div className="space-y-1 mb-3">
                {sponsor.partnership && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Tipo:</span> {sponsor.partnership}
                  </div>
                )}
                {sponsor.since && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Desde:</span> {sponsor.since}
                  </div>
                )}
              </div>

              {/* Benefits */}
              {sponsor.benefits.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Beneficios:</p>
                  <div className="flex flex-wrap gap-1">
                    {sponsor.benefits.slice(0, 2).map((benefit, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded"
                      >
                        {benefit}
                      </span>
                    ))}
                    {sponsor.benefits.length > 2 && (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{sponsor.benefits.length - 2} más
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(sponsor)}
                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                    title="Editar"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteSponsor(sponsor.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                {sponsor.website && (
                  <a
                    href={sponsor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Visitar sitio web"
                  >
                    <GlobeAltIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingSponsor ? 'Editar Patrocinador' : 'Crear Patrocinador'}
            </h2>
            
            <form onSubmit={(e) => { e.preventDefault(); saveSponsor(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej: Equipamiento Deportivo"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL del logo
                </label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Descripción del patrocinador..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sitio web
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://ejemplo.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de asociación
                  </label>
                  <input
                    type="text"
                    value={formData.partnership}
                    onChange={(e) => setFormData({ ...formData, partnership: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej: Patrocinador Principal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desde (año)
                  </label>
                  <input
                    type="text"
                    value={formData.since}
                    onChange={(e) => setFormData({ ...formData, since: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="2020"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nivel
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="PLATINUM">Platino</option>
                    <option value="GOLD">Oro</option>
                    <option value="SILVER">Plata</option>
                    <option value="BRONZE">Bronce</option>
                  </select>
                </div>
              </div>

              {/* Benefits */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beneficios
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Agregar beneficio..."
                  />
                  <button
                    type="button"
                    onClick={addBenefit}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Agregar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.benefits.map((benefit, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
                    >
                      {benefit}
                      <button
                        type="button"
                        onClick={() => removeBenefit(index)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {editingSponsor ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
