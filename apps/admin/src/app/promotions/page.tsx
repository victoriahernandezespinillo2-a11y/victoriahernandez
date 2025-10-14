'use client';

/**
 * Promotions Management Page
 * Panel de administración de promociones
 */

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseIcon,
  PlayIcon,
  TagIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';
import { adminApi } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { confirm } from '@/components/ConfirmDialog';
import { Tooltip } from '@/components/Tooltip';

interface Promotion {
  id: string;
  name: string;
  code?: string;
  type: string;
  status: string;
  conditions: any;
  rewards: any;
  validFrom: string;
  validTo?: string;
  usageLimit?: number;
  usageCount: number;
  createdAt: string;
  _count?: {
    applications: number;
  };
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  EXPIRED: 'bg-red-100 text-red-800'
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
  EXPIRED: 'Expirada'
};

const typeLabels: Record<string, string> = {
  SIGNUP_BONUS: '🎁 Bono de Registro',
  RECHARGE_BONUS: '💰 Bono de Recarga',
  USAGE_BONUS: '⭐ Bono por Uso',
  REFERRAL_BONUS: '👥 Bono Referido',
  DISCOUNT_CODE: '🏷️ Código Descuento',
  SEASONAL: '📅 Temporal'
};

export default function PromotionsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newPromotion, setNewPromotion] = useState({
    name: '',
    code: '',
    type: '',
    rewardType: 'FIXED_CREDITS',
    rewardValue: 0,
    validFrom: '',
    validTo: '',
    usageLimit: undefined as number | undefined
  });
  const [rewardValueInput, setRewardValueInput] = useState('');
  
  // Estado para conditions
  const [conditions, setConditions] = useState({
    minAmount: undefined as number | undefined,
    maxAmount: undefined as number | undefined,
    minTopupAmount: undefined as number | undefined,
    dayOfWeek: [] as number[],
    timeOfDay: {
      start: '',
      end: ''
    }
  });

  useEffect(() => {
    loadPromotions();
  }, [statusFilter]);

  // Efecto para auto-ajustar rewardType cuando cambia el tipo de promoción
  useEffect(() => {
    if (newPromotion.type && newPromotion.rewardType) {
      const validTypes = getValidRewardTypes(newPromotion.type);
      if (!validTypes.includes(newPromotion.rewardType)) {
        // Si el tipo actual no es válido, cambiar al primero válido
        setNewPromotion(prev => ({ ...prev, rewardType: validTypes[0] || 'FIXED_CREDITS' }));
      }
    }
  }, [newPromotion.type]);

  const resetForm = () => {
    setNewPromotion({
      name: '',
      code: '',
      type: '',
      rewardType: 'FIXED_CREDITS',
      rewardValue: 0,
      validFrom: '',
      validTo: '',
      usageLimit: undefined
    });
    setRewardValueInput('');
    setConditions({
      minAmount: undefined,
      maxAmount: undefined,
      minTopupAmount: undefined,
      dayOfWeek: [],
      timeOfDay: { start: '', end: '' }
    });
  };

  /**
   * Obtener tipos de recompensa válidos según el tipo de promoción
   * Garantiza coherencia entre tipo de promoción y recompensa
   */
  const getValidRewardTypes = (promotionType: string): string[] => {
    switch (promotionType) {
      case 'SIGNUP_BONUS':
      case 'REFERRAL_BONUS':
        // Solo créditos fijos tienen sentido (no hay monto base en registro/referido)
        return ['FIXED_CREDITS'];
      
      case 'RECHARGE_BONUS':
        // Solo bonus de recarga (descuentos serían confusos)
        return ['FIXED_CREDITS', 'PERCENTAGE_BONUS'];
      
      case 'USAGE_BONUS':
      case 'SEASONAL':
      case 'DISCOUNT_CODE':
        // Todos los tipos son válidos
        return ['FIXED_CREDITS', 'PERCENTAGE_BONUS', 'DISCOUNT_PERCENTAGE', 'DISCOUNT_FIXED'];
      
      default:
        return ['FIXED_CREDITS', 'PERCENTAGE_BONUS', 'DISCOUNT_PERCENTAGE', 'DISCOUNT_FIXED'];
    }
  };

  /**
   * Obtener campos de conditions relevantes según tipo de promoción
   * Ayuda a mostrar/ocultar campos según el contexto
   */
  const getRelevantConditions = (promotionType: string): string[] => {
    switch (promotionType) {
      case 'SIGNUP_BONUS':
        // Solo horario/días (no hay transacción monetaria)
        return ['dayOfWeek', 'timeOfDay'];
      
      case 'RECHARGE_BONUS':
        // Todas las condiciones de recarga
        return ['minAmount', 'maxAmount', 'minTopupAmount', 'dayOfWeek', 'timeOfDay'];
      
      case 'USAGE_BONUS':
        // No aplica minTopupAmount (no es recarga)
        return ['minAmount', 'maxAmount', 'dayOfWeek', 'timeOfDay'];
      
      case 'REFERRAL_BONUS':
        // Solo horario/días (no hay transacción monetaria)
        return ['dayOfWeek', 'timeOfDay'];
      
      case 'SEASONAL':
      case 'DISCOUNT_CODE':
        // Todas las condiciones disponibles
        return ['minAmount', 'maxAmount', 'minTopupAmount', 'dayOfWeek', 'timeOfDay'];
      
      default:
        return ['minAmount', 'maxAmount', 'dayOfWeek', 'timeOfDay'];
    }
  };

  /**
   * Obtener nombre amigable del tipo de promoción
   * Convierte nombres técnicos a descripciones entendibles
   */
  const getPromotionTypeName = (type: string): string => {
    switch (type) {
      case 'SIGNUP_BONUS':
        return 'Bono de Registro';
      case 'RECHARGE_BONUS':
        return 'Bono de Recarga';
      case 'USAGE_BONUS':
        return 'Bono de Uso';
      case 'REFERRAL_BONUS':
        return 'Bono de Referido';
      case 'DISCOUNT_CODE':
        return 'Código de Descuento';
      case 'SEASONAL':
        return 'Promoción Temporal';
      default:
        return type;
    }
  };

  /**
   * Obtener descripción del tipo de promoción
   * Explica qué hace cada tipo para el administrador
   */
  const getPromotionTypeDescription = (type: string): string => {
    switch (type) {
      case 'SIGNUP_BONUS':
        return 'Créditos automáticos al registrarse un nuevo usuario';
      case 'RECHARGE_BONUS':
        return 'Bonificación adicional al recargar créditos';
      case 'USAGE_BONUS':
        return 'Cashback o descuento al hacer reservas';
      case 'REFERRAL_BONUS':
        return 'Recompensa por referir amigos que se registren';
      case 'DISCOUNT_CODE':
        return 'Código promocional con descuento específico';
      case 'SEASONAL':
        return 'Promoción limitada por tiempo o temporada';
      default:
        return '';
    }
  };

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const promotions = await adminApi.promotions.getAll({ 
        status: statusFilter === 'ALL' ? undefined : statusFilter 
      });
      setPromotions(promotions || []);
    } catch (error) {
      console.error('Error loading promotions:', error);
      showToast({ variant: 'error', title: 'Error', message: 'Error de conexión' });
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      // Convertir fechas datetime-local a formato ISO
      if (!newPromotion.validFrom) {
        showToast({ variant: 'error', title: 'Error', message: 'La fecha de inicio es requerida' });
        setCreating(false);
        return;
      }
      
      const validFromISO = new Date(newPromotion.validFrom).toISOString();
      const validToISO = newPromotion.validTo ? new Date(newPromotion.validTo).toISOString() : undefined;

      // Construir objeto conditions solo con campos definidos
      const conditionsObj: any = {};
      if (conditions.minAmount !== undefined) conditionsObj.minAmount = conditions.minAmount;
      if (conditions.maxAmount !== undefined) conditionsObj.maxAmount = conditions.maxAmount;
      if (conditions.minTopupAmount !== undefined) conditionsObj.minTopupAmount = conditions.minTopupAmount;
      if (conditions.dayOfWeek.length > 0) conditionsObj.dayOfWeek = conditions.dayOfWeek;
      if (conditions.timeOfDay.start && conditions.timeOfDay.end) {
        conditionsObj.timeOfDay = conditions.timeOfDay;
      }

      const promotionData = {
        name: newPromotion.name,
        code: newPromotion.code || undefined,
        type: newPromotion.type,
        conditions: conditionsObj,
        rewards: {
          type: newPromotion.rewardType,
          value: newPromotion.rewardValue
        },
        validFrom: validFromISO,
        validTo: validToISO,
        usageLimit: newPromotion.usageLimit || undefined
      };

      console.log('🔄 [CREATE-PROMOTION] Datos a enviar:', promotionData);
      
      const response = await adminApi.promotions.create(promotionData);
      console.log('🔄 [CREATE-PROMOTION] Respuesta del servidor:', response);
      showToast({ variant: 'success', title: 'Creada', message: 'Promoción creada exitosamente' });
      setCreateModalOpen(false);
      resetForm();
      loadPromotions();
    } catch (error) {
      showToast({ variant: 'error', title: 'Error', message: 'Error al crear promoción' });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingPromotion) return;
    
    setUpdating(true);
    
    try {
      // Convertir fechas datetime-local a formato ISO
      if (!newPromotion.validFrom) {
        showToast({ variant: 'error', title: 'Error', message: 'La fecha de inicio es requerida' });
        setUpdating(false);
        return;
      }
      
      const validFromISO = new Date(newPromotion.validFrom).toISOString();
      const validToISO = newPromotion.validTo ? new Date(newPromotion.validTo).toISOString() : undefined;

      // Construir objeto conditions solo con campos definidos
      const conditionsObj: any = {};
      if (conditions.minAmount !== undefined) conditionsObj.minAmount = conditions.minAmount;
      if (conditions.maxAmount !== undefined) conditionsObj.maxAmount = conditions.maxAmount;
      if (conditions.minTopupAmount !== undefined) conditionsObj.minTopupAmount = conditions.minTopupAmount;
      if (conditions.dayOfWeek.length > 0) conditionsObj.dayOfWeek = conditions.dayOfWeek;
      if (conditions.timeOfDay.start && conditions.timeOfDay.end) {
        conditionsObj.timeOfDay = conditions.timeOfDay;
      }

      const promotionData = {
        name: newPromotion.name,
        code: newPromotion.code || undefined,
        type: newPromotion.type,
        conditions: conditionsObj,
        rewards: {
          type: newPromotion.rewardType,
          value: newPromotion.rewardValue
        },
        validFrom: validFromISO,
        validTo: validToISO,
        usageLimit: newPromotion.usageLimit || undefined
      };

      console.log('🔄 [UPDATE-PROMOTION] Datos a enviar:', promotionData);
      
      await adminApi.promotions.update(editingPromotion.id, promotionData);
      
      showToast({ variant: 'success', title: 'Actualizada', message: 'Promoción actualizada exitosamente' });
      setEditModalOpen(false);
      setEditingPromotion(null);
      resetForm();
      loadPromotions();
    } catch (error) {
      console.error('Error al actualizar promoción:', error);
      showToast({ variant: 'error', title: 'Error', message: 'Error al actualizar promoción' });
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = (promotion: Promotion) => {
    console.log('✏️ [EDIT-FRONTEND] Editando promoción:', promotion);
    
    // Guardar la promoción que se está editando
    setEditingPromotion(promotion);
    
    // Llenar el formulario con los datos existentes
    setNewPromotion({
      name: promotion.name,
      code: promotion.code || '',
      type: promotion.type,
      rewardType: promotion.rewards.type,
      rewardValue: promotion.rewards.value,
      validFrom: new Date(promotion.validFrom).toISOString().slice(0, 16),
      validTo: promotion.validTo ? new Date(promotion.validTo).toISOString().slice(0, 16) : '',
      usageLimit: promotion.usageLimit
    });
    
    setRewardValueInput(String(promotion.rewards.value));
    
    // Llenar conditions si existen
    if (promotion.conditions) {
      setConditions({
        minAmount: promotion.conditions.minAmount || undefined,
        maxAmount: promotion.conditions.maxAmount || undefined,
        minTopupAmount: promotion.conditions.minTopupAmount || undefined,
        dayOfWeek: promotion.conditions.dayOfWeek || [],
        timeOfDay: promotion.conditions.timeOfDay || { start: '', end: '' }
      });
    }
    
    // Abrir modal de edición
    setEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Eliminar Promoción',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      console.log('🔄 [DELETE-FRONTEND] Intentando eliminar promoción:', id);
      await adminApi.promotions.delete(id);
      
      showToast({ variant: 'success', title: 'Eliminada', message: 'Promoción eliminada exitosamente' });
      loadPromotions();
    } catch (error: any) {
      console.error('Error al eliminar promoción:', error);
      // Mejorar mensaje de error - mostrar el mensaje real del backend
      const errorMessage = error?.message || 'Error al eliminar promoción';
      showToast({ variant: 'error', title: 'No se puede eliminar', message: errorMessage });
    }
  };

  const handleToggleStatus = async (promotion: Promotion) => {
    const newStatus = promotion.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      console.log('🔄 [TOGGLE-STATUS] Cambiando estado de promoción:', promotion.id, 'de', promotion.status, 'a', newStatus);
      
      // Solo actualizar el estado, no todos los campos
      const response = await adminApi.put(`/api/admin/promotions/${promotion.id}`, { status: newStatus });
      
      console.log('✅ [TOGGLE-STATUS] Respuesta del servidor:', response);
      
      showToast({ 
        variant: 'success', 
        title: 'Actualizada', 
        message: `Promoción ${newStatus === 'ACTIVE' ? 'activada' : 'pausada'}` 
      });
      loadPromotions();
    } catch (error) {
      console.error('Error al actualizar promoción:', error);
      showToast({ variant: 'error', title: 'Error', message: 'Error al actualizar promoción' });
    }
  };

  const filteredPromotions = (promotions || []).filter(promo =>
    promo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    promo?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando promociones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Promociones</h1>
              <p className="mt-2 text-gray-600">Administra bonos, descuentos y códigos promocionales</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Nueva Promoción
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">Activas</option>
            <option value="INACTIVE">Inactivas</option>
            <option value="EXPIRED">Expiradas</option>
          </select>
        </div>

        {/* Promotions List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredPromotions.length === 0 ? (
            <div className="p-12 text-center">
              <GiftIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay promociones
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Intenta ajustar los filtros.'
                  : 'Crea tu primera promoción para empezar.'}
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setCreateModalOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Nueva Promoción
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredPromotions.map((promotion) => (
                <div key={promotion.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
                          {promotion.name}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[promotion.status]}`}>
                            {statusLabels[promotion.status]}
                          </span>
                          {promotion.code && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <TagIcon className="h-3 w-3 mr-1" />
                              {promotion.code}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {typeLabels[promotion.type] || promotion.type}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-500">
                        <span>
                          📊 {promotion._count?.applications || 0} aplicaciones
                        </span>
                        {promotion.usageLimit && (
                          <span>
                            📈 {promotion.usageCount} / {promotion.usageLimit} usos
                          </span>
                        )}
                        <span>
                          📅 Desde {new Date(promotion.validFrom).toLocaleDateString()}
                        </span>
                        {promotion.validTo && (
                          <span>
                            ⏰ Hasta {new Date(promotion.validTo).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-sm text-gray-700">
                        <span className="font-medium">Recompensa:</span>
                        {' '}
                        {promotion.rewards.type === 'FIXED_CREDITS' && `${promotion.rewards.value} créditos fijos`}
                        {promotion.rewards.type === 'PERCENTAGE_BONUS' && `${promotion.rewards.value}% de bonus`}
                        {promotion.rewards.type === 'DISCOUNT_PERCENTAGE' && `${promotion.rewards.value}% de descuento`}
                        {promotion.rewards.type === 'DISCOUNT_FIXED' && `${promotion.rewards.value}€ de descuento`}
                      </div>
                    </div>

                    {/* Botones de acción - Desktop */}
                    <div className="hidden lg:flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(promotion)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Editar"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(promotion)}
                        className={`p-2 rounded-md ${
                          promotion.status === 'ACTIVE' 
                            ? 'text-yellow-600 hover:bg-yellow-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={promotion.status === 'ACTIVE' ? 'Pausar' : 'Activar'}
                      >
                        {promotion.status === 'ACTIVE' ? (
                          <PauseIcon className="h-5 w-5" />
                        ) : (
                          <PlayIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(promotion.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Eliminar"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Botones de acción - Mobile */}
                    <div className="flex lg:hidden items-center justify-between mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center flex-wrap gap-2">
                        <button
                          onClick={() => handleEdit(promotion)}
                          className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          <PencilIcon className="h-4 w-4 mr-2" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleStatus(promotion)}
                          className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                            promotion.status === 'ACTIVE' 
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {promotion.status === 'ACTIVE' ? (
                            <>
                              <PauseIcon className="h-4 w-4 mr-2" />
                              Pausar
                            </>
                          ) : (
                            <>
                              <PlayIcon className="h-4 w-4 mr-2" />
                              Activar
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(promotion.id)}
                          className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Crear Nueva Promoción
              </h3>
              
              <form onSubmit={handleCreatePromotion} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Promoción *
                    </label>
                    <input
                      type="text"
                      required
                      value={newPromotion.name}
                      onChange={(e) => setNewPromotion({...newPromotion, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Bienvenida 10% descuento"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código (opcional)
                    </label>
                    <input
                      type="text"
                      value={newPromotion.code}
                      onChange={(e) => setNewPromotion({...newPromotion, code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="BIENVENIDA10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      Tipo de Promoción *
                      <Tooltip content="Selecciona el tipo de promoción según el contexto de aplicación" />
                    </label>
                    <select
                      required
                      value={newPromotion.type}
                      onChange={(e) => setNewPromotion({...newPromotion, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="SIGNUP_BONUS">Bono de Registro</option>
                      <option value="RECHARGE_BONUS">Bono de Recarga</option>
                      <option value="USAGE_BONUS">Bono de Uso</option>
                      <option value="REFERRAL_BONUS">Bono de Referido</option>
                      <option value="DISCOUNT_CODE">Código de Descuento</option>
                      <option value="SEASONAL">Promoción Temporal</option>
                    </select>
                    
                    {/* Descripción dinámica del tipo seleccionado */}
                    {newPromotion.type && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">{getPromotionTypeName(newPromotion.type)}:</span> {getPromotionTypeDescription(newPromotion.type)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor de Recompensa *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={rewardValueInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Filtrar solo números y un punto decimal
                        const filteredValue = value.replace(/[^0-9.]/g, '');
                        // Evitar múltiples puntos decimales
                        const parts = filteredValue.split('.');
                        const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredValue;
                        
                        setRewardValueInput(cleanValue);
                      }}
                      onBlur={() => {
                        const numValue = parseFloat(rewardValueInput);
                        if (!isNaN(numValue) && numValue >= 0) {
                          setNewPromotion({...newPromotion, rewardValue: numValue});
                        } else {
                          setNewPromotion({...newPromotion, rewardValue: 0});
                          setRewardValueInput('0');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      Tipo de Recompensa *
                      <Tooltip content="FIXED_CREDITS: Cantidad fija de créditos | PERCENTAGE_BONUS: % del monto como bonus | DISCOUNT_PERCENTAGE: % de descuento | DISCOUNT_FIXED: Cantidad fija de descuento en €" />
                    </label>
                    <select
                      required
                      value={newPromotion.rewardType}
                      onChange={(e) => setNewPromotion({...newPromotion, rewardType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {/* Filtrar opciones según tipo de promoción seleccionado */}
                      {getValidRewardTypes(newPromotion.type).includes('FIXED_CREDITS') && (
                        <option value="FIXED_CREDITS">Créditos Fijos</option>
                      )}
                      {getValidRewardTypes(newPromotion.type).includes('PERCENTAGE_BONUS') && (
                        <option value="PERCENTAGE_BONUS">Bonus Porcentual</option>
                      )}
                      {getValidRewardTypes(newPromotion.type).includes('DISCOUNT_PERCENTAGE') && (
                        <option value="DISCOUNT_PERCENTAGE">Descuento Porcentual</option>
                      )}
                      {getValidRewardTypes(newPromotion.type).includes('DISCOUNT_FIXED') && (
                        <option value="DISCOUNT_FIXED">Descuento Fijo</option>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Inicio *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newPromotion.validFrom}
                      onChange={(e) => setNewPromotion({...newPromotion, validFrom: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Fin (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={newPromotion.validTo}
                      onChange={(e) => setNewPromotion({...newPromotion, validTo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    Límite de Usos (opcional)
                    <Tooltip content="Número máximo de veces que se puede usar esta promoción globalmente. Deja vacío para uso ilimitado." />
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newPromotion.usageLimit === undefined ? '' : newPromotion.usageLimit}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? undefined : parseInt(value);
                      setNewPromotion({...newPromotion, usageLimit: isNaN(numValue as number) ? undefined : numValue});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                  />
                </div>

                {/* Sección de Condiciones - Mostrar solo campos relevantes según tipo */}
                {newPromotion.type && getRelevantConditions(newPromotion.type).length > 0 && (
                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Condiciones de Aplicación (Opcional)
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">
                      Configura restricciones para esta promoción. Deja en blanco los campos que no necesites.
                    </p>

                    {/* Información específica por tipo */}
                    {newPromotion.type === 'REFERRAL_BONUS' && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h5 className="text-sm font-semibold text-green-800 mb-2">
                          📝 Información sobre Bono de Referido
                        </h5>
                        <div className="text-sm text-green-700 space-y-1">
                          <p>• <strong>Quién recibe el bono:</strong> El usuario que hace la referencia (no el referido)</p>
                          <p>• <strong>Cuándo se aplica:</strong> Cuando el usuario referido se registra exitosamente</p>
                          <p>• <strong>Condiciones recomendadas:</strong> Solo días/horarios específicos si es necesario</p>
                          <p>• <strong>No usar:</strong> Restricciones de monto (no aplican a referidos)</p>
                        </div>
                      </div>
                    )}

                    {newPromotion.type === 'SIGNUP_BONUS' && (
                      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h5 className="text-sm font-semibold text-purple-800 mb-2">
                          📝 Información sobre Bono de Registro
                        </h5>
                        <div className="text-sm text-purple-700 space-y-1">
                          <p>• <strong>Quién recibe el bono:</strong> Nuevos usuarios al registrarse</p>
                          <p>• <strong>Cuándo se aplica:</strong> Automáticamente durante el proceso de registro</p>
                          <p>• <strong>Condiciones recomendadas:</strong> Solo días/horarios específicos si es necesario</p>
                          <p>• <strong>No usar:</strong> Restricciones de monto (no aplican a registro)</p>
                        </div>
                      </div>
                    )}

                    {/* Campos de Montos */}
                    {getRelevantConditions(newPromotion.type).some(c => 
                      ['minAmount', 'maxAmount', 'minTopupAmount'].includes(c)
                    ) && (
                      <div className="mb-6">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3">
                          💰 Restricciones de Monto
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Monto Mínimo */}
                          {getRelevantConditions(newPromotion.type).includes('minAmount') && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Monto Mínimo (€)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={conditions.minAmount ?? ''}
                                onChange={(e) => setConditions({
                                  ...conditions,
                                  minAmount: e.target.value ? parseFloat(e.target.value) : undefined
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Ej: 20"
                              />
                              <p className="text-xs text-gray-400 mt-1">Aplica si monto ≥ valor</p>
                            </div>
                          )}

                          {/* Monto Máximo */}
                          {getRelevantConditions(newPromotion.type).includes('maxAmount') && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Monto Máximo (€)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={conditions.maxAmount ?? ''}
                                onChange={(e) => setConditions({
                                  ...conditions,
                                  maxAmount: e.target.value ? parseFloat(e.target.value) : undefined
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Ej: 500"
                              />
                              <p className="text-xs text-gray-400 mt-1">Aplica si monto ≤ valor</p>
                            </div>
                          )}

                          {/* Recarga Mínima */}
                          {getRelevantConditions(newPromotion.type).includes('minTopupAmount') && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Recarga Mínima (€)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={conditions.minTopupAmount ?? ''}
                                onChange={(e) => setConditions({
                                  ...conditions,
                                  minTopupAmount: e.target.value ? parseFloat(e.target.value) : undefined
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Ej: 50"
                              />
                              <p className="text-xs text-gray-400 mt-1">Solo para recargas</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Días de la Semana */}
                    {getRelevantConditions(newPromotion.type).includes('dayOfWeek') && (
                      <div className="mb-6">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3">
                          📅 Días de la Semana
                        </h5>
                        <p className="text-xs text-gray-500 mb-2">
                          Selecciona los días en que aplica esta promoción. Deja todos sin marcar si aplica todos los días.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { label: 'Lun', value: 0 },
                            { label: 'Mar', value: 1 },
                            { label: 'Mié', value: 2 },
                            { label: 'Jue', value: 3 },
                            { label: 'Vie', value: 4 },
                            { label: 'Sáb', value: 5 },
                            { label: 'Dom', value: 6 }
                          ].map(({ label, value }) => (
                            <label
                              key={value}
                              className={`inline-flex items-center px-4 py-2 rounded-md border-2 cursor-pointer transition-all ${
                                conditions.dayOfWeek.includes(value)
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={conditions.dayOfWeek.includes(value)}
                                onChange={(e) => {
                                  const newDays = e.target.checked
                                    ? [...conditions.dayOfWeek, value].sort()
                                    : conditions.dayOfWeek.filter(d => d !== value);
                                  setConditions({ ...conditions, dayOfWeek: newDays });
                                }}
                                className="sr-only"
                              />
                              <span className="text-sm font-medium">{label}</span>
                            </label>
                          ))}
                        </div>
                        {conditions.dayOfWeek.length > 0 && (
                          <p className="text-xs text-green-600 mt-2">
                            ✓ Aplica: {conditions.dayOfWeek.map(d => 
                              ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][d]
                            ).join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Horario del Día */}
                    {getRelevantConditions(newPromotion.type).includes('timeOfDay') && (
                      <div className="mb-6">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3">
                          🕐 Horario Específico
                        </h5>
                        <p className="text-xs text-gray-500 mb-2">
                          Define un rango de horas. Deja ambos campos vacíos si aplica todo el día.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Hora de Inicio
                            </label>
                            <input
                              type="time"
                              value={conditions.timeOfDay.start}
                              onChange={(e) => setConditions({
                                ...conditions,
                                timeOfDay: { ...conditions.timeOfDay, start: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Hora de Fin
                            </label>
                            <input
                              type="time"
                              value={conditions.timeOfDay.end}
                              onChange={(e) => setConditions({
                                ...conditions,
                                timeOfDay: { ...conditions.timeOfDay, end: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                        {conditions.timeOfDay.start && conditions.timeOfDay.end && (
                          <p className="text-xs text-green-600 mt-2">
                            ✓ Aplica de {conditions.timeOfDay.start} a {conditions.timeOfDay.end}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? 'Creando...' : 'Crear Promoción'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editModalOpen && editingPromotion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Editar Promoción
                </h3>
                <span className="text-sm text-gray-500">
                  ID: {editingPromotion.id.slice(0, 8)}...
                </span>
              </div>
              
              <form onSubmit={handleUpdatePromotion} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Promoción *
                    </label>
                    <input
                      type="text"
                      required
                      value={newPromotion.name}
                      onChange={(e) => setNewPromotion({...newPromotion, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Bienvenida 10% descuento"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código (opcional)
                    </label>
                    <input
                      type="text"
                      value={newPromotion.code}
                      onChange={(e) => setNewPromotion({...newPromotion, code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="BIENVENIDA10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      Tipo de Promoción *
                      <Tooltip content="Selecciona el tipo de promoción según el contexto de aplicación" />
                    </label>
                    <select
                      required
                      value={newPromotion.type}
                      onChange={(e) => setNewPromotion({...newPromotion, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="SIGNUP_BONUS">Bono de Registro</option>
                      <option value="RECHARGE_BONUS">Bono de Recarga</option>
                      <option value="USAGE_BONUS">Bono de Uso</option>
                      <option value="REFERRAL_BONUS">Bono de Referido</option>
                      <option value="DISCOUNT_CODE">Código de Descuento</option>
                      <option value="SEASONAL">Promoción Temporal</option>
                    </select>
                    
                    {newPromotion.type && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">{getPromotionTypeName(newPromotion.type)}:</span> {getPromotionTypeDescription(newPromotion.type)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor de Recompensa *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={rewardValueInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        const filteredValue = value.replace(/[^0-9.]/g, '');
                        const parts = filteredValue.split('.');
                        const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredValue;
                        setRewardValueInput(cleanValue);
                      }}
                      onBlur={() => {
                        const numValue = parseFloat(rewardValueInput);
                        if (!isNaN(numValue) && numValue >= 0) {
                          setNewPromotion({...newPromotion, rewardValue: numValue});
                        } else {
                          setNewPromotion({...newPromotion, rewardValue: 0});
                          setRewardValueInput('0');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      Tipo de Recompensa *
                      <Tooltip content="FIXED_CREDITS: Cantidad fija de créditos | PERCENTAGE_BONUS: % del monto como bonus | DISCOUNT_PERCENTAGE: % de descuento | DISCOUNT_FIXED: Cantidad fija de descuento en €" />
                    </label>
                    <select
                      required
                      value={newPromotion.rewardType}
                      onChange={(e) => setNewPromotion({...newPromotion, rewardType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {getValidRewardTypes(newPromotion.type).includes('FIXED_CREDITS') && (
                        <option value="FIXED_CREDITS">Créditos Fijos</option>
                      )}
                      {getValidRewardTypes(newPromotion.type).includes('PERCENTAGE_BONUS') && (
                        <option value="PERCENTAGE_BONUS">Bonus Porcentual</option>
                      )}
                      {getValidRewardTypes(newPromotion.type).includes('DISCOUNT_PERCENTAGE') && (
                        <option value="DISCOUNT_PERCENTAGE">Descuento Porcentual</option>
                      )}
                      {getValidRewardTypes(newPromotion.type).includes('DISCOUNT_FIXED') && (
                        <option value="DISCOUNT_FIXED">Descuento Fijo</option>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Inicio *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newPromotion.validFrom}
                      onChange={(e) => setNewPromotion({...newPromotion, validFrom: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Fin (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={newPromotion.validTo}
                      onChange={(e) => setNewPromotion({...newPromotion, validTo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    Límite de Usos (opcional)
                    <Tooltip content="Número máximo de veces que se puede usar esta promoción globalmente. Deja vacío para uso ilimitado." />
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newPromotion.usageLimit === undefined ? '' : newPromotion.usageLimit}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? undefined : parseInt(value);
                      setNewPromotion({...newPromotion, usageLimit: isNaN(numValue as number) ? undefined : numValue});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                  />
                </div>

                {/* Advertencia si la promoción ya fue usada */}
                {editingPromotion.usageCount > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Promoción en uso
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            Esta promoción ha sido utilizada <strong>{editingPromotion.usageCount}</strong> {editingPromotion.usageCount === 1 ? 'vez' : 'veces'}. 
                            Ten cuidado al modificar sus condiciones, ya que podría afectar a usuarios que ya la están usando.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sección de Condiciones - igual que en crear */}
                {newPromotion.type && getRelevantConditions(newPromotion.type).length > 0 && (
                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Condiciones de Aplicación (Opcional)
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">
                      Configura restricciones para esta promoción. Deja en blanco los campos que no necesites.
                    </p>

                    {/* Campos de Montos */}
                    {getRelevantConditions(newPromotion.type).some(c => 
                      ['minAmount', 'maxAmount', 'minTopupAmount'].includes(c)
                    ) && (
                      <div className="mb-6">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3">
                          💰 Restricciones de Monto
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {getRelevantConditions(newPromotion.type).includes('minAmount') && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Monto Mínimo (€)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={conditions.minAmount ?? ''}
                                onChange={(e) => setConditions({
                                  ...conditions,
                                  minAmount: e.target.value ? parseFloat(e.target.value) : undefined
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Ej: 20"
                              />
                              <p className="text-xs text-gray-400 mt-1">Aplica si monto ≥ valor</p>
                            </div>
                          )}

                          {getRelevantConditions(newPromotion.type).includes('maxAmount') && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Monto Máximo (€)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={conditions.maxAmount ?? ''}
                                onChange={(e) => setConditions({
                                  ...conditions,
                                  maxAmount: e.target.value ? parseFloat(e.target.value) : undefined
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Ej: 500"
                              />
                              <p className="text-xs text-gray-400 mt-1">Aplica si monto ≤ valor</p>
                            </div>
                          )}

                          {getRelevantConditions(newPromotion.type).includes('minTopupAmount') && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Recarga Mínima (€)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={conditions.minTopupAmount ?? ''}
                                onChange={(e) => setConditions({
                                  ...conditions,
                                  minTopupAmount: e.target.value ? parseFloat(e.target.value) : undefined
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Ej: 50"
                              />
                              <p className="text-xs text-gray-400 mt-1">Solo para recargas</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Días de la Semana */}
                    {getRelevantConditions(newPromotion.type).includes('dayOfWeek') && (
                      <div className="mb-6">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3">
                          📅 Días de la Semana
                        </h5>
                        <p className="text-xs text-gray-500 mb-2">
                          Selecciona los días en que aplica esta promoción. Deja todos sin marcar si aplica todos los días.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { label: 'Lun', value: 0 },
                            { label: 'Mar', value: 1 },
                            { label: 'Mié', value: 2 },
                            { label: 'Jue', value: 3 },
                            { label: 'Vie', value: 4 },
                            { label: 'Sáb', value: 5 },
                            { label: 'Dom', value: 6 }
                          ].map(({ label, value }) => (
                            <label
                              key={value}
                              className={`inline-flex items-center px-4 py-2 rounded-md border-2 cursor-pointer transition-all ${
                                conditions.dayOfWeek.includes(value)
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={conditions.dayOfWeek.includes(value)}
                                onChange={(e) => {
                                  const newDays = e.target.checked
                                    ? [...conditions.dayOfWeek, value].sort()
                                    : conditions.dayOfWeek.filter(d => d !== value);
                                  setConditions({ ...conditions, dayOfWeek: newDays });
                                }}
                                className="sr-only"
                              />
                              <span className="text-sm font-medium">{label}</span>
                            </label>
                          ))}
                        </div>
                        {conditions.dayOfWeek.length > 0 && (
                          <p className="text-xs text-green-600 mt-2">
                            ✓ Aplica: {conditions.dayOfWeek.map(d => 
                              ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][d]
                            ).join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Horario del Día */}
                    {getRelevantConditions(newPromotion.type).includes('timeOfDay') && (
                      <div className="mb-6">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3">
                          🕐 Horario Específico
                        </h5>
                        <p className="text-xs text-gray-500 mb-2">
                          Define un rango de horas. Deja ambos campos vacíos si aplica todo el día.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Hora de Inicio
                            </label>
                            <input
                              type="time"
                              value={conditions.timeOfDay.start}
                              onChange={(e) => setConditions({
                                ...conditions,
                                timeOfDay: { ...conditions.timeOfDay, start: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Hora de Fin
                            </label>
                            <input
                              type="time"
                              value={conditions.timeOfDay.end}
                              onChange={(e) => setConditions({
                                ...conditions,
                                timeOfDay: { ...conditions.timeOfDay, end: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                        {conditions.timeOfDay.start && conditions.timeOfDay.end && (
                          <p className="text-xs text-green-600 mt-2">
                            ✓ Aplica de {conditions.timeOfDay.start} a {conditions.timeOfDay.end}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingPromotion(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updating ? 'Actualizando...' : 'Actualizar Promoción'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
