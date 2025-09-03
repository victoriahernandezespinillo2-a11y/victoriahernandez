'use client';

import { useEffect, useState } from 'react';
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  Trash2,
  AlertTriangle,
  Check,
  Globe,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useUserProfile } from '@/lib/hooks';
import { api } from '@/lib/api';

interface NotificationSettings {
  emailReservations: boolean;
  emailPromotions: boolean;
  emailReminders: boolean;
  pushReservations: boolean;
  pushPromotions: boolean;
  pushReminders: boolean;
  smsReservations: boolean;
  smsReminders: boolean;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showActivity: boolean;
  showStats: boolean;
  allowMessages: boolean;
  dataSharing: boolean;
}

interface AppSettings {
  language: string;
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  currency: string;
  soundEnabled: boolean;
  autoLogout: number;
}

// Mock current settings
const currentSettings = {
  notifications: {
    emailReservations: true,
    emailPromotions: false,
    emailReminders: true,
    pushReservations: true,
    pushPromotions: false,
    pushReminders: true,
    smsReservations: false,
    smsReminders: true,
  } as NotificationSettings,
  privacy: {
    profileVisibility: 'friends',
    showActivity: true,
    showStats: false,
    allowMessages: true,
    dataSharing: false,
  } as PrivacySettings,
  app: {
    language: 'es',
    theme: 'system',
    timezone: 'America/Bogota',
    currency: 'COP',
    soundEnabled: true,
    autoLogout: 30,
  } as AppSettings
};

export default function SettingsPage() {
  const { profile, getProfile, updateProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState('account');
  const [notifications, setNotifications] = useState<NotificationSettings>(currentSettings.notifications);
  const [privacy, setPrivacy] = useState<PrivacySettings>(currentSettings.privacy);
  const [appSettings, setAppSettings] = useState<AppSettings>(currentSettings.app);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    getProfile().catch(() => {});
  }, [getProfile]);

  const tabs = [
    { id: 'account', label: 'Cuenta', icon: User },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'privacy', label: 'Privacidad', icon: Shield },
    { id: 'app', label: 'Aplicación', icon: Smartphone },
    { id: 'billing', label: 'Facturación', icon: CreditCard },
  ];

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      if (profile?.id) {
        const firstName = (document.querySelector('#firstName') as HTMLInputElement)?.value;
        const lastName = (document.querySelector('#lastName') as HTMLInputElement)?.value;
        const phone = (document.querySelector('#phone') as HTMLInputElement)?.value;
        await updateProfile({ firstName, lastName, phone });
      }
      alert('Configuraciones guardadas exitosamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar configuraciones');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(passwordData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      alert('Contraseña actualizada exitosamente');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error al cambiar contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users/delete', { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      alert('Cuenta eliminada exitosamente. Cerraremos tu sesión.');
      try { await fetch('/api/auth/signout', { method: 'POST' }); } catch {}
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert((error as any)?.message || 'Error al eliminar cuenta');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users/export', { method: 'GET', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const blob = new Blob([JSON.stringify(data?.data ?? data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `exportacion-datos-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando datos:', error);
      alert((error as any)?.message || 'Error al exportar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const renderAccountSettings = () => (
    <div className="space-y-6">
      {/* Personal Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              id="firstName"
              type="text"
              defaultValue={profile?.firstName || ''}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido
            </label>
            <input
              id="lastName"
              type="text"
              defaultValue={profile?.lastName || ''}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              defaultValue={profile?.email || ''}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              id="phone"
              type="tel"
              defaultValue={profile?.phone || ''}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Password Change */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Seguridad</h3>
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Lock className="h-4 w-4 mr-2" />
            Cambiar Contraseña
          </button>
        ) : (
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handlePasswordChange}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-red-600 mb-4">Zona de Peligro</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">Eliminar Cuenta</h4>
              <p className="text-sm text-red-700 mt-1">
                Una vez eliminada tu cuenta, no podrás recuperarla. Esta acción es permanente.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Eliminar Cuenta
              </button>
              <button
                onClick={handleExportData}
                className="mt-3 ml-3 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors"
              >
                Exportar mis datos (GDPR)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notificaciones por Email</h3>
        <div className="space-y-3">
          {[
            { key: 'emailReservations', label: 'Confirmaciones de reserva', desc: 'Recibe confirmaciones cuando hagas una reserva' },
            { key: 'emailReminders', label: 'Recordatorios', desc: 'Recordatorios de tus próximas reservas' },
            { key: 'emailPromotions', label: 'Promociones y ofertas', desc: 'Información sobre descuentos y ofertas especiales' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-gray-900">{item.label}</div>
                <div className="text-sm text-gray-500">{item.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications[item.key as keyof NotificationSettings]}
                  onChange={(e) => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-none after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notificaciones Push</h3>
        <div className="space-y-3">
          {[
            { key: 'pushReservations', label: 'Confirmaciones de reserva' },
            { key: 'pushReminders', label: 'Recordatorios' },
            { key: 'pushPromotions', label: 'Promociones y ofertas' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3">
              <div className="font-medium text-gray-900">{item.label}</div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications[item.key as keyof NotificationSettings]}
                  onChange={(e) => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-none after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notificaciones SMS</h3>
        <div className="space-y-3">
          {[
            { key: 'smsReservations', label: 'Confirmaciones de reserva' },
            { key: 'smsReminders', label: 'Recordatorios' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3">
              <div className="font-medium text-gray-900">{item.label}</div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications[item.key as keyof NotificationSettings]}
                  onChange={(e) => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-none after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Visibilidad del Perfil</h3>
        <div className="space-y-3">
          {[
            { value: 'public', label: 'Público', desc: 'Cualquiera puede ver tu perfil' },
            { value: 'friends', label: 'Amigos', desc: 'Solo tus amigos pueden ver tu perfil' },
            { value: 'private', label: 'Privado', desc: 'Solo tú puedes ver tu perfil' },
          ].map((option) => (
            <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="profileVisibility"
                value={option.value}
                checked={privacy.profileVisibility === option.value}
                onChange={(e) => setPrivacy(prev => ({ ...prev, profileVisibility: e.target.value as any }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-500">{option.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuraciones de Privacidad</h3>
        <div className="space-y-3">
          {[
            { key: 'showActivity', label: 'Mostrar actividad reciente', desc: 'Permite que otros vean tu actividad reciente' },
            { key: 'showStats', label: 'Mostrar estadísticas', desc: 'Permite que otros vean tus estadísticas de juego' },
            { key: 'allowMessages', label: 'Permitir mensajes', desc: 'Permite que otros usuarios te envíen mensajes' },
            { key: 'dataSharing', label: 'Compartir datos para mejoras', desc: 'Ayuda a mejorar la plataforma compartiendo datos anónimos' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-gray-900">{item.label}</div>
                <div className="text-sm text-gray-500">{item.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacy[item.key as keyof PrivacySettings] as boolean}
                  onChange={(e) => setPrivacy(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-none after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAppSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Idioma
          </label>
          <select
            value={appSettings.language}
            onChange={(e) => setAppSettings(prev => ({ ...prev, language: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Zona Horaria
          </label>
          <select
            value={appSettings.timezone}
            onChange={(e) => setAppSettings(prev => ({ ...prev, timezone: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="America/Bogota">Bogotá (GMT-5)</option>
            <option value="America/New_York">New York (GMT-5)</option>
            <option value="Europe/Madrid">Madrid (GMT+1)</option>
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tema</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'Claro', icon: Sun },
            { value: 'dark', label: 'Oscuro', icon: Moon },
            { value: 'system', label: 'Sistema', icon: Monitor },
          ].map((theme) => {
            const IconComponent = theme.icon;
            return (
              <label key={theme.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value={theme.value}
                  checked={appSettings.theme === theme.value}
                  onChange={(e) => setAppSettings(prev => ({ ...prev, theme: e.target.value as any }))}
                  className="sr-only peer"
                />
                <div className="border-2 border-gray-200 rounded-lg p-4 text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:border-gray-300 transition-colors">
                  <IconComponent className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                  <div className="text-sm font-medium text-gray-900">{theme.label}</div>
                </div>
              </label>
            );
          })
        }
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Otras Configuraciones</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center">
              {appSettings.soundEnabled ? (
                <Volume2 className="h-5 w-5 text-gray-600 mr-3" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-600 mr-3" />
              )}
              <div>
                <div className="font-medium text-gray-900">Sonidos</div>
                <div className="text-sm text-gray-500">Reproducir sonidos de notificación</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={appSettings.soundEnabled}
                onChange={(e) => setAppSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-none after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cerrar sesión automáticamente después de (minutos)
            </label>
            <select
              value={appSettings.autoLogout}
              onChange={(e) => setAppSettings(prev => ({ ...prev, autoLogout: parseInt(e.target.value) }))}
              className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
              <option value={0}>Nunca</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBillingSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h3>
        <BillingMethods />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Facturación</h3>
        <BillingHistory />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuraciones</h1>
        <p className="text-gray-500 mt-1">
          Gestiona tu cuenta, notificaciones y preferencias
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'account' && renderAccountSettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'privacy' && renderPrivacySettings()}
          {activeTab === 'app' && renderAppSettings()}
          {activeTab === 'billing' && renderBillingSettings()}
        </div>

        {/* Save Button */}
        {activeTab !== 'billing' && (
          <div className="border-t border-gray-200 px-6 py-4">
            <button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        )}
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer y perderás todos tus datos.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BillingMethods() {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ brand: 'Visa', last4: '', expMonth: 12, expYear: new Date().getFullYear() + 2, holderName: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.payments.getMethods();
      setMethods(res?.methods || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    setAdding(true);
    try {
      await api.payments.addMethod({ ...form, setDefault: methods.length === 0 });
      await load();
      setForm({ brand: 'Visa', last4: '', expMonth: 12, expYear: new Date().getFullYear() + 2, holderName: '' });
    } finally {
      setAdding(false);
    }
  };

  const del = async (id: string) => {
    await api.payments.deleteMethod(id);
    await load();
  };

  if (loading) return <div className="text-sm text-gray-500">Cargando métodos...</div>;

  return (
    <div className="space-y-3">
      {methods.map((m) => (
        <div key={m.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <CreditCard className="h-5 w-5 text-gray-600 mr-3" />
            <div>
              <div className="font-medium text-gray-900">**** **** **** {m.last4}</div>
              <div className="text-sm text-gray-500">{m.brand} • Vence {String(m.expMonth).padStart(2, '0')}/{String(m.expYear).slice(-2)}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {m.isDefault && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Principal</span>}
            <button onClick={() => del(m.id)} className="text-sm text-red-600 hover:underline">Eliminar</button>
          </div>
        </div>
      ))}

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Nombre del titular" value={form.holderName} onChange={e => setForm({ ...form, holderName: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Últimos 4" value={form.last4} onChange={e => setForm({ ...form, last4: e.target.value.replace(/[^0-9]/g,'').slice(0,4) })} />
          <select className="border rounded px-3 py-2" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}>
            <option>Visa</option>
            <option>Mastercard</option>
            <option>Amex</option>
          </select>
          <div className="flex gap-2">
            <input className="border rounded px-3 py-2 w-24" placeholder="MM" value={form.expMonth} onChange={e => setForm({ ...form, expMonth: Number(e.target.value) })} />
            <input className="border rounded px-3 py-2 w-28" placeholder="YYYY" value={form.expYear} onChange={e => setForm({ ...form, expYear: Number(e.target.value) })} />
          </div>
        </div>
        <button onClick={add} disabled={adding} className="mt-3 w-full border rounded px-4 py-2 text-gray-700 hover:bg-gray-50">{adding ? 'Agregando...' : '+ Agregar método de pago'}</button>
      </div>
    </div>
  );
}

function BillingHistory() {
  return <div className="text-sm text-gray-500">Sin movimientos.</div>;
}