'use client';

import { useState, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  StarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface Testimonial {
  id: string;
  name: string;
  role?: string;
  company?: string;
  content: string;
  rating: number;
  imageUrl?: string;
  sport?: string;
  experience?: string;
  highlight?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    content: '',
    rating: 5,
    imageUrl: '',
    sport: '',
    experience: '',
    highlight: '',
    isActive: true,
    order: 0,
  });

  // Cargar testimonios
  const loadTestimonials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/landing/testimonials');
      if (response.ok) {
        const data = await response.json();
        setTestimonials(data.testimonials || []);
      } else {
        toast.error('Error al cargar los testimonios');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar los testimonios');
    } finally {
      setLoading(false);
    }
  };

  // Crear o actualizar testimonio
  const saveTestimonial = async () => {
    try {
      const url = editingTestimonial 
        ? `/api/admin/landing/testimonials/${editingTestimonial.id}`
        : '/api/admin/landing/testimonials';
      
      const method = editingTestimonial ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingTestimonial 
            ? 'Testimonio actualizado correctamente'
            : 'Testimonio creado correctamente'
        );
        setShowModal(false);
        setEditingTestimonial(null);
        resetForm();
        loadTestimonials();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar el testimonio');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar el testimonio');
    }
  };

  // Eliminar testimonio
  const deleteTestimonial = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este testimonio?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/landing/testimonials/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Testimonio eliminado correctamente');
        loadTestimonials();
      } else {
        toast.error('Error al eliminar el testimonio');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar el testimonio');
    }
  };

  // Abrir modal para editar
  const openEditModal = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData({
      name: testimonial.name,
      role: testimonial.role || '',
      company: testimonial.company || '',
      content: testimonial.content,
      rating: testimonial.rating,
      imageUrl: testimonial.imageUrl || '',
      sport: testimonial.sport || '',
      experience: testimonial.experience || '',
      highlight: testimonial.highlight || '',
      isActive: testimonial.isActive,
      order: testimonial.order,
    });
    setShowModal(true);
  };

  // Abrir modal para crear
  const openCreateModal = () => {
    setEditingTestimonial(null);
    resetForm();
    setShowModal(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      company: '',
      content: '',
      rating: 5,
      imageUrl: '',
      sport: '',
      experience: '',
      highlight: '',
      isActive: true,
      order: 0,
    });
  };

  // Renderizar estrellas
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  useEffect(() => {
    loadTestimonials();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Testimonios</h1>
          <p className="text-gray-600">Administra las reseñas y testimonios de clientes</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Agregar Testimonio
        </button>
      </div>

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((testimonial) => (
          <div key={testimonial.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    {testimonial.imageUrl ? (
                      <img
                        src={testimonial.imageUrl}
                        alt={testimonial.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{testimonial.name}</h3>
                    {testimonial.role && (
                      <p className="text-sm text-gray-600">{testimonial.role}</p>
                    )}
                    {testimonial.company && (
                      <p className="text-xs text-gray-500">{testimonial.company}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {renderStars(testimonial.rating)}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-gray-700 text-sm mb-3 line-clamp-3">
                "{testimonial.content}"
              </p>
              
              {testimonial.sport && (
                <div className="flex items-center text-xs text-gray-500 mb-1">
                  <span className="font-medium">Deporte:</span>
                  <span className="ml-1">{testimonial.sport}</span>
                </div>
              )}
              
              {testimonial.experience && (
                <div className="flex items-center text-xs text-gray-500 mb-1">
                  <span className="font-medium">Experiencia:</span>
                  <span className="ml-1">{testimonial.experience}</span>
                </div>
              )}
              
              {testimonial.highlight && (
                <div className="flex items-center text-xs text-gray-500">
                  <span className="font-medium">Destacado:</span>
                  <span className="ml-1">{testimonial.highlight}</span>
                </div>
              )}

              {/* Status */}
              <div className="mt-3 flex items-center justify-between">
                <div>
                  {testimonial.isActive ? (
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
                    onClick={() => openEditModal(testimonial)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="Editar"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteTestimonial(testimonial.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <TrashIcon className="h-4 w-4" />
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
              {editingTestimonial ? 'Editar Testimonio' : 'Crear Testimonio'}
            </h2>
            
            <form onSubmit={(e) => { e.preventDefault(); saveTestimonial(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo/Rol
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Testimonio *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  placeholder="Escribe el testimonio del cliente..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calificación
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        className="focus:outline-none"
                      >
                        <StarIcon
                          className={`h-6 w-6 ${
                            star <= formData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-sm text-gray-600 ml-2">
                      {formData.rating}/5
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de la imagen
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="https://ejemplo.com/foto.jpg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deporte
                  </label>
                  <input
                    type="text"
                    value={formData.sport}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: Fútbol, Tenis, Natación"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experiencia
                  </label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: 2 años como usuario"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destacado
                </label>
                <input
                  type="text"
                  value={formData.highlight}
                  onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: Excelente atención al cliente"
                />
              </div>

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
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
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingTestimonial ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


