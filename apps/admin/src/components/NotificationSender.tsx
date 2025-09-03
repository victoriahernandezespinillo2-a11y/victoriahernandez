'use client';

import { useState, useCallback } from 'react';
import { 
  BellIcon, 
  XMarkIcon, 
  PaperAirplaneIcon,
  UserGroupIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface NotificationSenderProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNotification: (data: any) => Promise<any>;
  onSendDirect: (data: any) => Promise<any>;
  onSendBulk: (data: any) => Promise<any>;
}

type NotificationType = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
type NotificationCategory = 'RESERVATION' | 'PAYMENT' | 'TOURNAMENT' | 'MAINTENANCE' | 'MEMBERSHIP' | 'SYSTEM' | 'MARKETING' | 'REMINDER';
type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type SendType = 'email' | 'sms' | 'push';

export default function NotificationSender({ 
  isOpen, 
  onClose, 
  onCreateNotification, 
  onSendDirect, 
  onSendBulk 
}: NotificationSenderProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'direct' | 'bulk'>('create');
  const [loading, setLoading] = useState(false);
  
  // Formulario de creación de notificación
  const [createForm, setCreateForm] = useState({
    userId: '',
    type: 'IN_APP' as NotificationType,
    title: '',
    message: '',
    category: 'SYSTEM' as NotificationCategory,
    priority: 'MEDIUM' as NotificationPriority,
    scheduledFor: '',
    actionUrl: ''
  });

  // Formulario de envío directo
  const [directForm, setDirectForm] = useState({
    type: 'email' as SendType,
    recipients: '',
    subject: '',
    message: '',
    template: ''
  });

  // Formulario de envío masivo
  const [bulkForm, setBulkForm] = useState({
    type: 'email' as SendType,
    recipients: '',
    subject: '',
    message: '',
    template: ''
  });

  const handleCreateSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.message.trim()) {
      toast.error('El título y mensaje son requeridos');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...createForm,
        userId: createForm.userId.trim() || undefined,
        actionUrl: createForm.actionUrl.trim() || undefined,
        scheduledFor: createForm.scheduledFor || undefined
      };
      
      await onCreateNotification(data);
      toast.success('Notificación creada exitosamente');
      setCreateForm({
        userId: '',
        type: 'IN_APP',
        title: '',
        message: '',
        category: 'SYSTEM',
        priority: 'MEDIUM',
        scheduledFor: '',
        actionUrl: ''
      });
      onClose();
    } catch (error) {
      toast.error('Error al crear la notificación');
      console.error('Error creating notification:', error);
    } finally {
      setLoading(false);
    }
  }, [createForm, onCreateNotification, onClose]);

  const handleDirectSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directForm.recipients.trim() || !directForm.message.trim()) {
      toast.error('Los destinatarios y mensaje son requeridos');
      return;
    }

    setLoading(true);
    try {
      const recipients = directForm.recipients.split(',').map(r => r.trim()).filter(Boolean);
      const data = {
        type: directForm.type,
        data: {
          ...(directForm.type === 'email' ? { to: recipients, subject: directForm.subject } : {}),
          ...(directForm.type === 'sms' ? { to: recipients } : {}),
          ...(directForm.type === 'push' ? { userId: recipients } : {}),
          message: directForm.message,
          template: directForm.template.trim() || undefined
        }
      };
      
      await onSendDirect(data);
      toast.success('Notificación enviada exitosamente');
      setDirectForm({
        type: 'email',
        recipients: '',
        subject: '',
        message: '',
        template: ''
      });
      onClose();
    } catch (error) {
      toast.error('Error al enviar la notificación');
      console.error('Error sending direct notification:', error);
    } finally {
      setLoading(false);
    }
  }, [directForm, onSendDirect, onClose]);

  const handleBulkSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkForm.recipients.trim() || !bulkForm.message.trim()) {
      toast.error('Los destinatarios y mensaje son requeridos');
      return;
    }

    setLoading(true);
    try {
      const recipients = bulkForm.recipients.split(',').map(r => r.trim()).filter(Boolean);
      const data = {
        type: bulkForm.type,
        recipients,
        subject: bulkForm.subject,
        message: bulkForm.message,
        template: bulkForm.template.trim() || undefined
      };
      
      await onSendBulk(data);
      toast.success('Notificaciones masivas enviadas exitosamente');
      setBulkForm({
        type: 'email',
        recipients: '',
        subject: '',
        message: '',
        template: ''
      });
      onClose();
    } catch (error) {
      toast.error('Error al enviar las notificaciones masivas');
      console.error('Error sending bulk notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [bulkForm, onSendBulk, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <BellIcon className="h-8 w-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Enviar Notificaciones</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'create'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ComputerDesktopIcon className="h-5 w-5 inline mr-2" />
            Crear Notificación
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'direct'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <PaperAirplaneIcon className="h-5 w-5 inline mr-2" />
            Envío Directo
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'bulk'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserGroupIcon className="h-5 w-5 inline mr-2" />
            Envío Masivo
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Tab: Crear Notificación */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Notificación
                  </label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, type: e.target.value as NotificationType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="IN_APP">En la Aplicación</option>
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="PUSH">Push</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value as NotificationCategory }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SYSTEM">Sistema</option>
                    <option value="RESERVATION">Reserva</option>
                    <option value="PAYMENT">Pago</option>
                    <option value="TOURNAMENT">Torneo</option>
                    <option value="MAINTENANCE">Mantenimiento</option>
                    <option value="MEMBERSHIP">Membresía</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="REMINDER">Recordatorio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridad
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, priority: e.target.value as NotificationPriority }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID de Usuario (opcional)
                  </label>
                  <input
                    type="text"
                    value={createForm.userId}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, userId: e.target.value }))}
                    placeholder="UUID del usuario"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título de la notificación"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje *
                </label>
                <textarea
                  value={createForm.message}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Contenido de la notificación"
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Programar para (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.scheduledFor}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, scheduledFor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de Acción (opcional)
                  </label>
                  <input
                    type="url"
                    value={createForm.actionUrl}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, actionUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <BellIcon className="h-4 w-4" />
                      <span>Crear Notificación</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Tab: Envío Directo */}
          {activeTab === 'direct' && (
            <form onSubmit={handleDirectSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Envío
                  </label>
                  <select
                    value={directForm.type}
                    onChange={(e) => setDirectForm(prev => ({ ...prev, type: e.target.value as SendType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="push">Push</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destinatarios *
                  </label>
                  <input
                    type="text"
                    value={directForm.recipients}
                    onChange={(e) => setDirectForm(prev => ({ ...prev, recipients: e.target.value }))}
                    placeholder={directForm.type === 'email' ? 'email1@ejemplo.com, email2@ejemplo.com' : 'teléfono1, teléfono2'}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separa múltiples destinatarios con comas
                  </p>
                </div>
              </div>

              {directForm.type === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asunto
                  </label>
                  <input
                    type="text"
                    value={directForm.subject}
                    onChange={(e) => setDirectForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Asunto del email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje *
                </label>
                <textarea
                  value={directForm.message}
                  onChange={(e) => setDirectForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Contenido del mensaje"
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plantilla (opcional)
                </label>
                <input
                  type="text"
                  value={directForm.template}
                  onChange={(e) => setDirectForm(prev => ({ ...prev, template: e.target.value }))}
                  placeholder="Nombre de la plantilla"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-4 w-4" />
                      <span>Enviar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Tab: Envío Masivo */}
          {activeTab === 'bulk' && (
            <form onSubmit={handleBulkSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Envío
                  </label>
                  <select
                    value={bulkForm.type}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, type: e.target.value as SendType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destinatarios *
                  </label>
                  <textarea
                    value={bulkForm.recipients}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, recipients: e.target.value }))}
                    placeholder={bulkForm.type === 'email' ? 'email1@ejemplo.com\nemail2@ejemplo.com\nemail3@ejemplo.com' : 'teléfono1\nteléfono2\nteléfono3'}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Un destinatario por línea
                  </p>
                </div>
              </div>

              {bulkForm.type === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asunto
                  </label>
                  <input
                    type="text"
                    value={bulkForm.subject}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Asunto del email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje *
                </label>
                <textarea
                  value={bulkForm.message}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Contenido del mensaje"
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plantilla (opcional)
                </label>
                <input
                  type="text"
                  value={bulkForm.template}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, template: e.target.value }))}
                  placeholder="Nombre de la plantilla"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <UserGroupIcon className="h-4 w-4" />
                      <span>Enviar Masivo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
