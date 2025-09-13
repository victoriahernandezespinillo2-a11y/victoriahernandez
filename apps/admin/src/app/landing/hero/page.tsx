'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  PhotoIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export default function HeroSlidesPage() {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    imageUrl: '',
    ctaText: '',
    ctaLink: '',
    secondaryCtaText: '',
    secondaryCtaLink: '',
    isActive: true,
    order: 0,
  });

  // Cargar hero slides
  const loadHeroSlides = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/landing/hero');
      if (response.ok) {
        const data = await response.json();
        setHeroSlides(data.heroes || []);
      } else {
        toast.error('Error al cargar los hero slides');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar los hero slides');
    } finally {
      setLoading(false);
    }
  };

  // Crear o actualizar hero slide
  const saveHeroSlide = async () => {
    try {
      const url = editingSlide 
        ? `/api/admin/landing/hero/${editingSlide.id}`
        : '/api/admin/landing/hero';
      
      const method = editingSlide ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingSlide 
            ? 'Hero slide actualizado correctamente'
            : 'Hero slide creado correctamente'
        );
        setShowModal(false);
        setEditingSlide(null);
        resetForm();
        loadHeroSlides();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar el hero slide');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar el hero slide');
    }
  };

  // Eliminar hero slide
  const deleteHeroSlide = async (id: string) => {
    const { confirm } = await import('@/components/ConfirmDialog');
    const ok = await confirm({
      title: 'Eliminar slide',
      description: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
      tone: 'danger',
      confirmText: 'Eliminar',
    });
    if (!ok) return;

    try {
      const response = await fetch(`/api/admin/landing/hero/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Hero slide eliminado correctamente');
        loadHeroSlides();
      } else {
        toast.error('Error al eliminar el hero slide');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar el hero slide');
    }
  };

  // Cambiar orden
  const changeOrder = async (id: string, direction: 'up' | 'down') => {
    const slide = heroSlides.find(s => s.id === id);
    if (!slide) return;

    const newOrder = direction === 'up' ? slide.order - 1 : slide.order + 1;
    const otherSlide = heroSlides.find(s => s.order === newOrder);
    
    if (!otherSlide) return;

    try {
      await Promise.all([
        fetch(`/api/admin/landing/hero/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...slide, order: newOrder }),
        }),
        fetch(`/api/admin/landing/hero/${otherSlide.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...otherSlide, order: slide.order }),
        }),
      ]);

      loadHeroSlides();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cambiar el orden');
    }
  };

  // Abrir modal para editar
  const openEditModal = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title,
      subtitle: slide.subtitle || '',
      description: slide.description || '',
      imageUrl: slide.imageUrl || '',
      ctaText: slide.ctaText || '',
      ctaLink: slide.ctaLink || '',
      secondaryCtaText: slide.secondaryCtaText || '',
      secondaryCtaLink: slide.secondaryCtaLink || '',
      isActive: slide.isActive,
      order: slide.order,
    });
    setShowModal(true);
  };

  // Abrir modal para crear
  const openCreateModal = () => {
    setEditingSlide(null);
    resetForm();
    setShowModal(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      imageUrl: '',
      ctaText: '',
      ctaLink: '',
      secondaryCtaText: '',
      secondaryCtaLink: '',
      isActive: true,
      order: 0,
    });
  };

  useEffect(() => {
    loadHeroSlides();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hero Slides</h1>
          <p className="text-gray-600">Gestiona las imágenes y contenido del banner principal</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Agregar Slide
        </button>
      </div>

      {/* Hero Slides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {heroSlides.map((slide) => (
          <div key={slide.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Image Preview */}
            <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden">
              {slide.imageUrl ? (
                <Image
                  src={slide.imageUrl}
                  alt={slide.title}
                  width={400}
                  height={192}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <PhotoIcon className="h-12 w-12 text-white opacity-50" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                {slide.isActive ? (
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
              <h3 className="font-semibold text-gray-900 mb-2">{slide.title}</h3>
              {slide.subtitle && (
                <p className="text-sm text-gray-600 mb-2">{slide.subtitle}</p>
              )}
              {slide.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {slide.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(slide)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Editar"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteHeroSlide(slide.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => changeOrder(slide.id, 'up')}
                    disabled={slide.order === 0}
                    className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Mover arriba"
                  >
                    <ArrowUpIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => changeOrder(slide.id, 'down')}
                    disabled={slide.order === heroSlides.length - 1}
                    className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Mover abajo"
                  >
                    <ArrowDownIcon className="h-4 w-4" />
                  </button>
                </div>
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
              {editingSlide ? 'Editar Hero Slide' : 'Crear Hero Slide'}
            </h2>
            
            <form noValidate onSubmit={(e) => { e.preventDefault(); saveHeroSlide(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtítulo
                  </label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de la imagen
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto del CTA principal
                  </label>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enlace del CTA principal
                  </label>
                  <input
                    type="text"
                    inputMode="url"
                    value={formData.ctaLink}
                    onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://ejemplo.com ó /ruta-interna ó #ancla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto del CTA secundario
                  </label>
                  <input
                    type="text"
                    value={formData.secondaryCtaText}
                    onChange={(e) => setFormData({ ...formData, secondaryCtaText: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enlace del CTA secundario
                  </label>
                  <input
                    type="text"
                    inputMode="url"
                    value={formData.secondaryCtaLink}
                    onChange={(e) => setFormData({ ...formData, secondaryCtaLink: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://ejemplo.com ó /ruta-interna ó #ancla"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingSlide ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


