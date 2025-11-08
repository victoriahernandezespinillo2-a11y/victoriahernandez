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
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({
    show: false,
    type: 'success',
    message: ''
  });

  useEffect(() => {
    getProfile().catch(() => {});
    loadSavedSettings();
  }, [getProfile]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({
      show: true,
      type,
      message
    });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const loadSavedSettings = () => {
    try {
      // Cargar configuraciones de app
      const savedAppSettings = localStorage.getItem('appSettings');
      if (savedAppSettings) {
        const parsed = JSON.parse(savedAppSettings);
        setAppSettings(parsed);
        // Aplicar tema guardado
        applyTheme(parsed.theme);
      }

      // Cargar configuraciones de notificaciones
      const savedNotificationSettings = localStorage.getItem('notificationSettings');
      if (savedNotificationSettings) {
        setNotifications(JSON.parse(savedNotificationSettings));
      }

      // Cargar configuraciones de privacidad
      const savedPrivacySettings = localStorage.getItem('privacySettings');
      if (savedPrivacySettings) {
        setPrivacy(JSON.parse(savedPrivacySettings));
      }
    } catch (error) {
      console.error('Error loading saved settings:', error);
    }
  };

  const tabs = [
    { id: 'account', label: 'Cuenta', icon: User },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'privacy', label: 'Privacidad', icon: Shield },
    // { id: 'app', label: 'Aplicación', icon: Smartphone }, // Oculto temporalmente por no aportar funcionalidad real
    { id: 'billing', label: 'Facturación', icon: CreditCard },
  ];

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Evitar edición de datos personales aquí para mantener una única fuente de edición en /dashboard/profile
      if (activeTab === 'account') {
        showNotification('info', 'La edición de tus datos se realiza en tu Perfil');
      }
      
      // Guardar configuraciones de aplicación si estamos en esa tab
      if (activeTab === 'app') {
        await saveAppSettings();
      }
      
      // Guardar configuraciones de notificaciones si estamos en esa tab
      if (activeTab === 'notifications') {
        await saveNotificationSettings();
      }
      
      // Guardar configuraciones de privacidad si estamos en esa tab
      if (activeTab === 'privacy') {
        await savePrivacySettings();
      }
      
      showNotification('success', 'Configuraciones guardadas exitosamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('error', 'Error al guardar configuraciones');
    } finally {
      setIsLoading(false);
    }
  };

  const saveAppSettings = async () => {
    try {
      // Aquí iría la llamada a la API para guardar configuraciones de app
      // Por ahora simulamos el guardado
      console.log('Guardando configuraciones de app:', appSettings);
      
      // Simular llamada a API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Guardar en localStorage
      localStorage.setItem('appSettings', JSON.stringify(appSettings));
      
      // Aplicar tema inmediatamente
      applyTheme(appSettings.theme);
      
    } catch (error) {
      console.error('Error saving app settings:', error);
      throw error;
    }
  };

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else if (theme === 'system') {
      // Usar preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  // Aplicar tema cuando cambie
  const handleThemeChange = (theme: string) => {
    setAppSettings(prev => ({ ...prev, theme: theme as any }));
    applyTheme(theme);
  };

  // Aplicar configuración de sonidos
  const handleSoundToggle = (enabled: boolean) => {
    setAppSettings(prev => ({ ...prev, soundEnabled: enabled }));
    
    // Aplicar inmediatamente
    if (enabled) {
      console.log('Sonidos habilitados');
      // Aquí se podrían habilitar sonidos de notificación
    } else {
      console.log('Sonidos deshabilitados');
      // Aquí se podrían deshabilitar sonidos de notificación
    }
  };

  const saveNotificationSettings = async () => {
    try {
      console.log('Guardando configuraciones de notificaciones:', notifications);
      localStorage.setItem('notificationSettings', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notification settings:', error);
      throw error;
    }
  };

  const savePrivacySettings = async () => {
    try {
      console.log('Guardando configuraciones de privacidad:', privacy);
      localStorage.setItem('privacySettings', JSON.stringify(privacy));
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      throw error;
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('error', 'Las contraseñas no coinciden');
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
      showNotification('success', 'Contraseña actualizada exitosamente');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (error) {
      console.error('Error changing password:', error);
      showNotification('error', 'Error al cambiar contraseña');
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
      showNotification('success', 'Cuenta eliminada exitosamente. Cerraremos tu sesión.');
      try { await fetch('/api/auth/signout', { method: 'POST' }); } catch {}
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
      showNotification('error', (error as any)?.message || 'Error al eliminar cuenta');
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
      showNotification('error', (error as any)?.message || 'Error al exportar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const renderAccountSettings = () => (
    <div className="space-y-6">
      {/* Personal Information - adaptativo */}
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-4 md:p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="p-2 bg-blue-600 rounded-xl">
            <User className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900">Información Personal</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-3 md:gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 md:mb-2">Nombre</label>
              <div className="w-full border-2 border-gray-200 rounded-xl px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-gray-900">
                {profile?.firstName || '-'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 md:mb-2">Apellido</label>
              <div className="w-full border-2 border-gray-200 rounded-xl px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-gray-900">
                {profile?.lastName || '-'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 md:mb-2">Email</label>
            <div className="w-full border-2 border-gray-200 rounded-xl px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-gray-600">
              {profile?.email || '-'}
            </div>
            <p className="text-xs text-gray-500 mt-1">El email no se puede cambiar</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 md:mb-2">Teléfono</label>
            <div className="w-full border-2 border-gray-200 rounded-xl px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-gray-900">
              {profile?.phone || '-'}
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/dashboard/profile"
              className="inline-flex items-center px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-green-700 transition-all shadow-lg text-sm md:text-base"
            >
              Editar en Perfil
            </a>
          </div>
        </div>
      </div>

      {/* Seguridad - adaptativo */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-4 md:p-6 border border-green-100">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="p-2 bg-green-600 rounded-xl">
            <Lock className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900">Seguridad</h3>
        </div>
        
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all shadow-lg"
          >
            <Lock className="h-5 w-5 mr-2" />
            Cambiar Contraseña
          </button>
        ) : (
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 md:px-4 py-2 md:py-3 pr-10 md:pr-12 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="Tu contraseña actual"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 md:px-4 py-2 md:py-3 pr-10 md:pr-12 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="Nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 md:px-4 py-2 md:py-3 pr-10 md:pr-12 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="Confirma tu nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePasswordChange}
                disabled={isLoading}
                className="flex-1 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg text-sm md:text-base"
              >
                {isLoading ? 'Guardando...' : 'Guardar Contraseña'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="px-4 md:px-6 py-2 md:py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors text-sm md:text-base"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zona de Peligro - adaptativo */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-4 md:p-6 border border-red-200">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="p-2 bg-red-600 rounded-xl">
            <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-red-600">Zona de Peligro</h3>
        </div>
        
        <div className="space-y-3 md:space-y-4">
          <div className="bg-white rounded-xl p-3 md:p-4 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-base md:text-lg font-semibold text-red-800 mb-1 md:mb-2">Eliminar Cuenta</h4>
                <p className="text-red-700 mb-3 md:mb-4 text-sm md:text-base">
                  Una vez eliminada tu cuenta, no podrás recuperarla. Esta acción es permanente y eliminará todos tus datos.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 md:px-6 py-2 md:py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg text-sm md:text-base"
                >
                  Eliminar Cuenta
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-600 rounded-lg">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-base md:text-lg font-semibold text-gray-800 mb-1 md:mb-2">Exportar Datos</h4>
                <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">
                  Descarga una copia de todos tus datos personales (GDPR).
                </p>
                <button
                  onClick={handleExportData}
                  className="px-4 md:px-6 py-2 md:py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-900 transition-colors shadow-lg text-sm md:text-base"
                >
                  Exportar mis datos
                </button>
              </div>
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
                  onChange={(e) => handleThemeChange(e.target.value)}
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
                onChange={(e) => handleSoundToggle(e.target.checked)}
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
    <>
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
      <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header con gradiente - adaptativo */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 text-white">
        <div className="px-4 py-6 md:py-8">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">⚙️ Configuraciones</h1>
            <p className="text-blue-100 text-sm md:text-base">Gestiona tu cuenta, notificaciones y preferencias</p>
          </div>
        </div>
      </div>

      {/* Contenedor principal con tabs modernas - adaptativo */}
      <div className="px-4 -mt-4 relative z-10 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs modernas - adaptativas */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50">
            <nav className="flex overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-3 md:px-4 py-3 md:py-4 text-xs md:text-sm font-medium whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'text-blue-600 bg-white shadow-sm border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    <IconComponent className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content - adaptativo */}
          <div className="p-4 md:p-6 pb-6 md:pb-8">
            {activeTab === 'account' && renderAccountSettings()}
            {activeTab === 'notifications' && renderNotificationSettings()}
            {activeTab === 'privacy' && renderPrivacySettings()}
            {activeTab === 'billing' && renderBillingSettings()}
          </div>

          {/* Save Button moderno - adaptativo (no mostrar en Cuenta para evitar confusión) */}
          {activeTab !== 'billing' && activeTab !== 'account' && (
            <div className="bg-gradient-to-r from-blue-50 to-green-50 px-4 md:px-6 py-3 md:py-4 border-t border-gray-100">
              <button
                onClick={handleSaveSettings}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-green-700 transition-all disabled:opacity-50 shadow-lg text-sm md:text-base"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                )}
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          )}
        </div>
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

        {/* Toast Notification */}
        {notification.show && (
          <div 
            className="fixed top-4 right-4 z-[100] max-w-sm w-full mx-4"
            style={{
              animation: 'slideInRight 0.3s ease-out',
            }}
          >
            <div 
              className={`bg-white rounded-xl shadow-2xl border backdrop-blur-sm ${
                notification.type === 'success' ? 'border-green-200' : 
                notification.type === 'error' ? 'border-red-200' : 
                'border-blue-200'
              }`}
              style={{
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      notification.type === 'success' ? 'bg-green-100' : 
                      notification.type === 'error' ? 'bg-red-100' : 
                      'bg-blue-100'
                    }`}>
                      {notification.type === 'success' && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                      {notification.type === 'error' && (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      {notification.type === 'info' && (
                        <Bell className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-semibold ${
                      notification.type === 'success' ? 'text-green-800' : 
                      notification.type === 'error' ? 'text-red-800' : 
                      'text-blue-800'
                    }`}>
                      {notification.message}
                    </p>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <button
                      onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                      className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
                    >
                      <span className="sr-only">Cerrar</span>
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.payments.list({ page: 1, limit: 20 });
      setItems(res?.items || []);
    } catch (e: any) {
      console.error('Error cargando historial de pagos:', e);
      setError(e?.message || 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-sm text-gray-500">Cargando historial...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!items.length) return <div className="text-sm text-gray-500">Sin movimientos.</div>;

  const formatDate = (d: string) => new Date(d).toLocaleString('es-ES');
  const formatAmount = (a: number, currency?: string) => `${(a ?? 0).toFixed(2)} ${currency || 'EUR'}`;
  const statusLabel = (s: string) => {
    switch (s) {
      case 'COMPLETED':
      case 'PAID':
        return 'Completado';
      case 'PROCESSING':
        return 'Procesando';
      case 'PENDING':
        return 'Pendiente';
      case 'CANCELLED':
        return 'Cancelado';
      case 'REFUNDED':
        return 'Reembolsado';
      case 'FAILED':
        return 'Fallido';
      case 'IN_PROGRESS':
        return 'En progreso';
      default:
        return s;
    }
  };

  return (
    <div className="space-y-3">
      {items.map((p: any) => (
        <div key={`${p.paymentType}-${p.id}`} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-100 rounded-md">
              <CreditCard className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{p.paymentType === 'ORDER' ? 'Compra' : 'Reserva'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  ['COMPLETED','PAID'].includes(p.status) ? 'bg-green-100 text-green-800' :
                  ['PROCESSING','IN_PROGRESS'].includes(p.status) ? 'bg-blue-100 text-blue-800' :
                  p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  ['CANCELLED','FAILED'].includes(p.status) ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {statusLabel(p.status)}
                </span>
                {p.paymentMethod && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{p.paymentMethod}</span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {p.description || (p.paymentType === 'RESERVATION' ? 'Pago de reserva' : 'Pago de orden')}
              </div>
              <div className="text-xs text-gray-500">{formatDate(p.createdAt)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-900">{formatAmount(Number(p.amount || p.totalPrice || 0), p.currency)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}