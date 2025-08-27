'use client';

import { useState, useEffect } from 'react';
import {
  QuestionMarkCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    isActive: true,
    order: 0,
  });

  // Cargar FAQ
  const loadFAQs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/landing/faqs');
      if (response.ok) {
        const data = await response.json();
        setFaqs(data.faqs || []);
      } else {
        toast.error('Error al cargar las FAQ');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar las FAQ');
    } finally {
      setLoading(false);
    }
  };

  // Crear o actualizar FAQ
  const saveFAQ = async () => {
    try {
      const url = editingFAQ 
        ? `/api/admin/landing/faqs/${editingFAQ.id}`
        : '/api/admin/landing/faqs';
      
      const method = editingFAQ ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingFAQ 
            ? 'FAQ actualizada correctamente'
            : 'FAQ creada correctamente'
        );
        setShowModal(false);
        setEditingFAQ(null);
        resetForm();
        loadFAQs();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar la FAQ');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar la FAQ');
    }
  };

  // Eliminar FAQ
  const deleteFAQ = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta FAQ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/landing/faqs/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('FAQ eliminada correctamente');
        loadFAQs();
      } else {
        toast.error('Error al eliminar la FAQ');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar la FAQ');
    }
  };

  // Toggle expandir FAQ
  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  // Abrir modal para editar
  const openEditModal = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      isActive: faq.isActive,
      order: faq.order,
    });
    setShowModal(true);
  };

  // Abrir modal para crear
  const openCreateModal = () => {
    setEditingFAQ(null);
    resetForm();
    setShowModal(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      isActive: true,
      order: 0,
    });
  };

  useEffect(() => {
    loadFAQs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preguntas Frecuentes</h1>
          <p className="text-gray-600">Administra las preguntas frecuentes</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Agregar FAQ
        </button>
      </div>

      {/* FAQ List */}
      <div className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Question Header */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center">
                    <QuestionMarkCircleIcon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 flex-1">
                    {faq.question}
                  </h3>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Status */}
                  {faq.isActive ? (
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

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(faq)}
                      className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
                      title="Editar"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteFAQ(faq.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
                      title={expandedFAQ === faq.id ? 'Ocultar respuesta' : 'Ver respuesta'}
                    >
                      {expandedFAQ === faq.id ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Answer */}
            {expandedFAQ === faq.id && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-4">
                  <p className="text-gray-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {faqs.length === 0 && (
        <div className="text-center py-12">
          <QuestionMarkCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay preguntas frecuentes
          </h3>
          <p className="text-gray-600 mb-6">
            Comienza agregando algunas preguntas frecuentes para ayudar a tus usuarios.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Agregar Primera FAQ
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingFAQ ? 'Editar FAQ' : 'Crear FAQ'}
            </h2>
            
            <form onSubmit={(e) => { e.preventDefault(); saveFAQ(); }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pregunta *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                  placeholder="¿Cuál es tu pregunta?"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Respuesta *
                </label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                  placeholder="Escribe la respuesta a la pregunta..."
                />
              </div>

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
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
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  {editingFAQ ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
