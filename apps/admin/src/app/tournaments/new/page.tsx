'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminTournaments, useAdminCenters } from '@/lib/hooks';
import { showNotification } from '@/components/ErrorNotification';
import {
  TrophyIcon,
  CalendarDaysIcon,
  UsersIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface TournamentFormData {
  name: string;
  description: string;
  sport: string;
  centerId: string;
  type: string;
  format: string;
  category: string;
  maxParticipants: number | string;
  registrationFee: number | string;
  prizePool: number | string;
  registrationStartDate: string;
  registrationEndDate: string;
  startDate: string;
  endDate: string;
  rules: string;
  requirements: string[];
  prizes: Array<{
    position: number;
    description: string;
    value?: number;
  }>;
  organizer: string;
  contactEmail: string;
  contactPhone: string;
  isPublic: boolean;
}

const initialFormData: TournamentFormData = {
  name: '',
  description: '',
  sport: 'TENNIS',
  centerId: '',
  type: 'SINGLE_ELIMINATION',
  format: 'INDIVIDUAL',
  category: 'OPEN',
  maxParticipants: '',
  registrationFee: '',
  prizePool: '',
  registrationStartDate: '',
  registrationEndDate: '',
  startDate: '',
  endDate: '',
  rules: '',
  requirements: [],
  prizes: [],
  organizer: '',
  contactEmail: '',
  contactPhone: '',
  isPublic: true,
};

const sportOptions = [
  { value: 'TENNIS', label: 'Tenis' },
  { value: 'FOOTBALL', label: 'Fútbol' },
  { value: 'BASKETBALL', label: 'Baloncesto' },
  { value: 'VOLLEYBALL', label: 'Voleibol' },
  { value: 'PADDLE', label: 'Pádel' },
];

const typeOptions = [
  { value: 'SINGLE_ELIMINATION', label: 'Eliminación Simple' },
  { value: 'DOUBLE_ELIMINATION', label: 'Eliminación Doble' },
  { value: 'ROUND_ROBIN', label: 'Todos contra Todos' },
  { value: 'SWISS', label: 'Sistema Suizo' },
];

const formatOptions = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'DOUBLES', label: 'Parejas' },
  { value: 'TEAM', label: 'Equipos' },
];

const categoryOptions = [
  { value: 'OPEN', label: 'Abierto' },
  { value: 'JUNIOR', label: 'Junior' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'AMATEUR', label: 'Amateur' },
  { value: 'PROFESSIONAL', label: 'Profesional' },
];

export default function NewTournamentPage() {
  const router = useRouter();
  const { createTournament, loading } = useAdminTournaments();
  const { centers, getCenters } = useAdminCenters();
  const [formData, setFormData] = useState<TournamentFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRequirement, setNewRequirement] = useState('');
  const [newPrize, setNewPrize] = useState({ position: 1, description: '', value: 0 });

  // Cargar centros al montar el componente
  useEffect(() => {
    getCenters();
  }, [getCenters]);

  const handleInputChange = (field: keyof TournamentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }));
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const addPrize = () => {
    if (newPrize.description.trim() && newPrize.position > 0) {
      setFormData(prev => ({
        ...prev,
        prizes: [...prev.prizes, { ...newPrize }]
      }));
      setNewPrize({ position: newPrize.position + 1, description: '', value: 0 });
    }
  };

  const removePrize = (index: number) => {
    setFormData(prev => ({
      ...prev,
      prizes: prev.prizes.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres';
    }
    if (!formData.centerId) newErrors.centerId = 'El centro es requerido';
    if (!formData.registrationStartDate) newErrors.registrationStartDate = 'Fecha de inicio de inscripción es requerida';
    if (!formData.registrationEndDate) newErrors.registrationEndDate = 'Fecha de fin de inscripción es requerida';
    if (!formData.startDate) newErrors.startDate = 'Fecha de inicio es requerida';
    if (!formData.endDate) newErrors.endDate = 'Fecha de fin es requerida';
    if (!formData.rules.trim()) {
      newErrors.rules = 'Las reglas son requeridas';
    } else if (formData.rules.trim().length < 20) {
      newErrors.rules = 'Las reglas deben tener al menos 20 caracteres';
    }
    if (!formData.organizer.trim()) newErrors.organizer = 'El organizador es requerido';
    if (!formData.contactEmail.trim()) newErrors.contactEmail = 'El email de contacto es requerido';
    
    // Validar campos numéricos
    if (!formData.maxParticipants || formData.maxParticipants === '') {
      newErrors.maxParticipants = 'El máximo de participantes es requerido';
    } else if (Number(formData.maxParticipants) < 4) {
      newErrors.maxParticipants = 'Mínimo 4 participantes';
    } else if (Number(formData.maxParticipants) > 128) {
      newErrors.maxParticipants = 'Máximo 128 participantes';
    }
    
    if (!formData.registrationFee || formData.registrationFee === '') {
      newErrors.registrationFee = 'La tarifa de inscripción es requerida';
    } else if (Number(formData.registrationFee) < 0) {
      newErrors.registrationFee = 'La tarifa no puede ser negativa';
    }
    
    if (formData.prizePool !== '' && formData.prizePool !== null && Number(formData.prizePool) < 0) {
      newErrors.prizePool = 'El premio no puede ser negativo';
    }

    // Validar fechas
    if (formData.registrationStartDate && formData.registrationEndDate) {
      if (new Date(formData.registrationStartDate) >= new Date(formData.registrationEndDate)) {
        newErrors.registrationEndDate = 'La fecha de fin debe ser posterior al inicio';
      }
    }
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        newErrors.endDate = 'La fecha de fin debe ser posterior al inicio';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Validar que las fechas sean válidas
      const regStartDate = new Date(formData.registrationStartDate);
      const regEndDate = new Date(formData.registrationEndDate);
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (isNaN(regStartDate.getTime()) || isNaN(regEndDate.getTime()) || 
          isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Las fechas proporcionadas no son válidas');
      }

      await createTournament({
        ...formData,
        registrationFee: Number(formData.registrationFee),
        prizePool: Number(formData.prizePool),
        maxParticipants: Number(formData.maxParticipants),
        // Convertir fechas al formato ISO 8601 con timezone
        registrationStartDate: regStartDate.toISOString(),
        registrationEndDate: regEndDate.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      
      router.push('/tournaments');
    } catch (error) {
      console.error('Error creando torneo:', error);
      
      // Determinar el tipo de error y mostrar mensaje específico
      let errorMessage = 'No se pudo crear el torneo. Por favor, verifica los datos e inténtalo de nuevo.';
      let errorTitle = 'Error al Crear Torneo';
      
      if (error instanceof Error) {
        if (error.message.includes('centerId') || error.message.includes('centro')) {
          errorMessage = 'Por favor, selecciona un centro deportivo válido de la lista.';
          errorTitle = 'Centro No Seleccionado';
        } else if (error.message.includes('validation') || error.message.includes('required')) {
          errorMessage = 'Por favor, completa todos los campos obligatorios correctamente.';
          errorTitle = 'Datos Incompletos';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica tu internet e inténtalo de nuevo.';
          errorTitle = 'Error de Conexión';
        } else if (error.message.includes('conflict') || error.message.includes('already exists')) {
          errorMessage = 'Ya existe un torneo con ese nombre. Por favor, usa un nombre diferente.';
          errorTitle = 'Torneo Duplicado';
        } else if (error.message.includes('fecha') || error.message.includes('date')) {
          errorMessage = 'Por favor, verifica que las fechas sean correctas y estén en el orden adecuado.';
          errorTitle = 'Error en Fechas';
        }
      }
      
      await showNotification({
        title: errorTitle,
        message: errorMessage,
        type: 'error',
        duration: 8000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <TrophyIcon className="h-8 w-8 mr-3 text-yellow-500" />
                Nuevo Torneo
              </h1>
              <p className="mt-2 text-gray-900">
                Crea un nuevo torneo o competencia
              </p>
            </div>
            <button
              onClick={() => router.push('/tournaments')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Cancelar
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Información Básica */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Torneo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Torneo de Verano 2025"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deporte *
                </label>
                <select
                  value={formData.sport}
                  onChange={(e) => handleInputChange('sport', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sportOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Centro Deportivo *
                </label>
                <select
                  value={formData.centerId}
                  onChange={(e) => handleInputChange('centerId', e.target.value)}
                  disabled={!centers || centers.length === 0}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.centerId ? 'border-red-300' : 'border-gray-300'
                  } ${(!centers || centers.length === 0) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">
                    {!centers ? 'Cargando centros...' : 
                     centers.length === 0 ? 'No hay centros disponibles' : 
                     'Seleccionar centro...'}
                  </option>
                  {centers?.map(center => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
                {errors.centerId && <p className="mt-1 text-sm text-red-600">{errors.centerId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Torneo *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {typeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato *
                </label>
                <select
                  value={formData.format}
                  onChange={(e) => handleInputChange('format', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {formatOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Descripción *
                </label>
                <span className={`text-xs ${formData.description.length < 10 ? 'text-red-500' : 'text-green-600'}`}>
                  {formData.description.length}/10 caracteres mínimos
                </span>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe el torneo, sus objetivos y características especiales..."
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>
          </div>

          {/* Configuración del Torneo */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Configuración del Torneo</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo Participantes *
                </label>
                <input
                  type="number"
                  min="4"
                  max="128"
                  value={formData.maxParticipants}
                  onChange={(e) => handleInputChange('maxParticipants', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.maxParticipants && <p className="mt-1 text-sm text-red-600">{errors.maxParticipants}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tarifa de Inscripción (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.registrationFee}
                  onChange={(e) => handleInputChange('registrationFee', e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.registrationFee && <p className="mt-1 text-sm text-red-600">{errors.registrationFee}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Premio Total (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.prizePool}
                  onChange={(e) => handleInputChange('prizePool', e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.prizePool && <p className="mt-1 text-sm text-red-600">{errors.prizePool}</p>}
              </div>
            </div>
          </div>

          {/* Fechas */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Fechas del Torneo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inicio de Inscripciones *
                </label>
                <input
                  type="datetime-local"
                  value={formData.registrationStartDate}
                  onChange={(e) => handleInputChange('registrationStartDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.registrationStartDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.registrationStartDate && <p className="mt-1 text-sm text-red-600">{errors.registrationStartDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fin de Inscripciones *
                </label>
                <input
                  type="datetime-local"
                  value={formData.registrationEndDate}
                  onChange={(e) => handleInputChange('registrationEndDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.registrationEndDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.registrationEndDate && <p className="mt-1 text-sm text-red-600">{errors.registrationEndDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inicio del Torneo *
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fin del Torneo *
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.endDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
              </div>
            </div>
          </div>

          {/* Reglas y Requisitos */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Reglas y Requisitos</h2>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Reglas del Torneo *
                </label>
                <span className={`text-xs ${formData.rules.length < 20 ? 'text-red-500' : 'text-green-600'}`}>
                  {formData.rules.length}/20 caracteres mínimos
                </span>
              </div>
              <textarea
                value={formData.rules}
                onChange={(e) => handleInputChange('rules', e.target.value)}
                rows={6}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.rules ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe las reglas específicas del torneo..."
              />
              {errors.rules && <p className="mt-1 text-sm text-red-600">{errors.rules}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requisitos de Participación
              </label>
              <div className="space-y-2">
                {formData.requirements.map((req, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="flex-1 bg-gray-100 px-3 py-2 rounded-md text-gray-900">{req}</span>
                    <button
                      type="button"
                      onClick={() => removeRequirement(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    placeholder="Agregar requisito..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addRequirement}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Premios */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Premios</h2>
            
            {formData.prizes.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.prizes.map((prize, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                    <span className="w-16 text-sm font-medium text-gray-900">{prize.position}°</span>
                    <span className="flex-1 text-gray-900">{prize.description}</span>
                    {prize.value && <span className="text-green-600 font-medium">€{prize.value}</span>}
                    <button
                      type="button"
                      onClick={() => removePrize(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                type="number"
                min="1"
                value={newPrize.position}
                onChange={(e) => setNewPrize(prev => ({ ...prev, position: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 }))}
                placeholder="Posición"
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newPrize.description}
                onChange={(e) => setNewPrize(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del premio"
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={newPrize.value}
                onChange={(e) => setNewPrize(prev => ({ ...prev, value: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                placeholder="Valor (€)"
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addPrize}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Información de Contacto */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Información de Contacto</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organizador *
                </label>
                <input
                  type="text"
                  value={formData.organizer}
                  onChange={(e) => handleInputChange('organizer', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.organizer ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Nombre del organizador"
                />
                {errors.organizer && <p className="mt-1 text-sm text-red-600">{errors.organizer}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email de Contacto *
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.contactEmail ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="contacto@ejemplo.com"
                />
                {errors.contactEmail && <p className="mt-1 text-sm text-red-600">{errors.contactEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+34 123 456 789"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">
                  Torneo público (visible para todos los usuarios)
                </span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/tournaments')}
              className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creando...' : 'Crear Torneo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
