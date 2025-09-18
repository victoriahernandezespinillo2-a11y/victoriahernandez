'use client';

import { useState, useEffect } from 'react';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  UserIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  const [settings, setSettings] = useState({
    general: {
      siteName: 'Polideportivo Victoria Hernández',
      siteDescription: 'Centro deportivo y recreativo',
      timezone: 'Europe/Madrid',
      language: 'es',
      currency: 'EUR',
      contactEmail: '',
      contactPhone: '',
      address: ''
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      maintenanceAlerts: true,
      paymentAlerts: true,
      reservationAlerts: true,
      marketingEnabled: false,
      emailProvider: 'smtp',
      smsProvider: 'twilio'
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeoutMinutes: 30,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      requireEmailVerification: false,
      requirePhoneVerification: false,
      passwordMinLength: 8,
      passwordRequireSpecial: false
    },
    business: {
      openTime: '06:00',
      closeTime: '22:00',
      advanceBookingDays: 30,
      cancellationHours: 24,
      maxReservationsPerUser: 3,
      seasonalPricing: false,
      dynamicPricing: false,
      membershipDiscounts: false
    }
  });

  const sections: SettingsSection[] = [
    {
      id: 'general',
      title: 'General',
      description: 'Configuración básica del sistema',
      icon: CogIcon
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      description: 'Configurar alertas y notificaciones',
      icon: BellIcon
    },
    {
      id: 'security',
      title: 'Seguridad',
      description: 'Configuración de seguridad y acceso',
      icon: ShieldCheckIcon
    },
    {
      id: 'business',
      title: 'Negocio',
      description: 'Configuración de horarios y políticas',
      icon: BuildingOfficeIcon
    }
  ];

  // Cargar configuración desde la API
  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Merge con valores por defecto para asegurar que todos los campos existan
          const mergedSettings = {
            general: { ...settings.general, ...data.data.general },
            notifications: { ...settings.notifications, ...data.data.notifications },
            security: { ...settings.security, ...data.data.security },
            business: { ...settings.business, ...data.data.business }
          };
          setSettings(mergedSettings);
          setOriginalSettings(mergedSettings);
        }
      } else {
        toast.error('Error cargando configuración');
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      toast.error('Error cargando configuración');
    } finally {
      setLoading(false);
    }
  };

  // Guardar configuración en la API
  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings?centerId=default', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOriginalSettings(settings);
          setHasChanges(false);
          toast.success('Configuración guardada exitosamente');
        } else {
          toast.error('Error guardando configuración');
        }
      } else {
        toast.error('Error guardando configuración');
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      toast.error('Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  // Cancelar cambios
  const cancelChanges = () => {
    if (originalSettings) {
      setSettings(originalSettings);
      setHasChanges(false);
    }
  };

  // Cargar configuración al montar el componente
  useEffect(() => {
    loadSettings();
  }, []);

  const handleSettingChange = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      {/* Información básica */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Información Básica</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del sitio *
          </label>
          <input
            type="text"
            value={settings.general?.siteName || ''}
            onChange={(e) => handleSettingChange('general', 'siteName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Polideportivo Victoria Hernández"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción
          </label>
          <textarea
            value={settings.general?.siteDescription || ''}
            onChange={(e) => handleSettingChange('general', 'siteDescription', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Centro deportivo y recreativo..."
          />
        </div>
      </div>

      {/* Información de contacto */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Información de Contacto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email de contacto
            </label>
            <input
              type="email"
              value={settings.general?.contactEmail || ''}
              onChange={(e) => handleSettingChange('general', 'contactEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="contacto@polideportivo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono de contacto
            </label>
            <input
              type="tel"
              value={settings.general?.contactPhone || ''}
              onChange={(e) => handleSettingChange('general', 'contactPhone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+34 123 456 789"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dirección
          </label>
          <input
            type="text"
            value={settings.general?.address || ''}
            onChange={(e) => handleSettingChange('general', 'address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Calle Principal 123, Ciudad"
          />
        </div>
      </div>

      {/* Configuración regional */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Configuración Regional</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zona horaria
            </label>
            <select
              value={settings.general?.timezone || 'Europe/Madrid'}
              onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Europe/Madrid">Madrid (GMT+1)</option>
              <option value="America/Bogota">Bogotá (GMT-5)</option>
              <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
              <option value="America/New_York">Nueva York (GMT-5)</option>
              <option value="Europe/London">Londres (GMT+0)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Idioma
            </label>
            <select
              value={settings.general?.language || 'es'}
              onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Moneda
            </label>
            <select
              value={settings.general?.currency || 'EUR'}
              onChange={(e) => handleSettingChange('general', 'currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">Dólar Americano (USD)</option>
              <option value="COP">Peso Colombiano (COP)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      {/* Configuración de canales */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Canales de Notificación</h3>
        <div className="space-y-4">
          {Object.entries({
            emailEnabled: 'Notificaciones por email',
            smsEnabled: 'Notificaciones por SMS',
            pushEnabled: 'Notificaciones push'
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-900">{label}</span>
                <p className="text-xs text-gray-500">
                  {key === 'emailEnabled' && 'Enviar notificaciones por correo electrónico'}
                  {key === 'smsEnabled' && 'Enviar notificaciones por mensaje de texto'}
                  {key === 'pushEnabled' && 'Enviar notificaciones push en dispositivos'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.notifications?.[key as keyof typeof settings.notifications])}
                  onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Tipos de notificaciones */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Tipos de Notificaciones</h3>
        <div className="space-y-3">
          {Object.entries({
            maintenanceAlerts: 'Alertas de mantenimiento',
            paymentAlerts: 'Alertas de pagos',
            reservationAlerts: 'Alertas de reservas',
            marketingEnabled: 'Emails de marketing'
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-900">{label}</span>
                <p className="text-xs text-gray-500">
                  {key === 'maintenanceAlerts' && 'Notificar sobre mantenimientos programados'}
                  {key === 'paymentAlerts' && 'Notificar sobre pagos y transacciones'}
                  {key === 'reservationAlerts' && 'Notificar sobre reservas y cancelaciones'}
                  {key === 'marketingEnabled' && 'Enviar promociones y ofertas especiales'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.notifications?.[key as keyof typeof settings.notifications])}
                  onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Configuración avanzada */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Configuración Avanzada</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proveedor de Email
            </label>
            <select
              value={settings.notifications?.emailProvider || 'smtp'}
              onChange={(e) => handleSettingChange('notifications', 'emailProvider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="smtp">SMTP</option>
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proveedor de SMS
            </label>
            <select
              value={settings.notifications?.smsProvider || 'twilio'}
              onChange={(e) => handleSettingChange('notifications', 'smsProvider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="twilio">Twilio</option>
              <option value="nexmo">Nexmo</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      {/* Autenticación */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Autenticación</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Autenticación de dos factores</h4>
              <p className="text-xs text-gray-500">Añade una capa extra de seguridad con 2FA</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security?.twoFactorEnabled || false}
                onChange={(e) => handleSettingChange('security', 'twoFactorEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Verificación de email</h4>
              <p className="text-xs text-gray-500">Requerir verificación de email para nuevos usuarios</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security?.requireEmailVerification || false}
                onChange={(e) => handleSettingChange('security', 'requireEmailVerification', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Verificación de teléfono</h4>
              <p className="text-xs text-gray-500">Requerir verificación de teléfono para nuevos usuarios</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security?.requirePhoneVerification || false}
                onChange={(e) => handleSettingChange('security', 'requirePhoneVerification', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Configuración de sesiones */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Configuración de Sesiones</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiempo de sesión (minutos)
            </label>
            <input
              type="number"
              min="15"
              max="1440"
              value={settings.security?.sessionTimeoutMinutes || 30}
              onChange={(e) => handleSettingChange('security', 'sessionTimeoutMinutes', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 15, máximo 1440 minutos</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Máximo intentos de login
            </label>
            <input
              type="number"
              min="3"
              max="10"
              value={settings.security?.maxLoginAttempts || 5}
              onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 3, máximo 10 intentos</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duración del bloqueo (minutos)
            </label>
            <input
              type="number"
              min="5"
              max="60"
              value={settings.security?.lockoutDurationMinutes || 15}
              onChange={(e) => handleSettingChange('security', 'lockoutDurationMinutes', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 5, máximo 60 minutos</p>
          </div>
        </div>
      </div>

      {/* Políticas de contraseñas */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Políticas de Contraseñas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Longitud mínima de contraseña
            </label>
            <input
              type="number"
              min="6"
              max="32"
              value={settings.security?.passwordMinLength || 8}
              onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 6, máximo 32 caracteres</p>
          </div>
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Requerir caracteres especiales</h4>
              <p className="text-xs text-gray-500">Forzar uso de símbolos y números</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security?.passwordRequireSpecial || false}
                onChange={(e) => handleSettingChange('security', 'passwordRequireSpecial', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBusinessSettings = () => (
    <div className="space-y-6">
      {/* Horarios de operación */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Horarios de Operación</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora de apertura
            </label>
            <input
              type="time"
              value={settings.business?.openTime || '06:00'}
              onChange={(e) => handleSettingChange('business', 'openTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora de cierre
            </label>
            <input
              type="time"
              value={settings.business?.closeTime || '22:00'}
              onChange={(e) => handleSettingChange('business', 'closeTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Políticas de reservas */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Políticas de Reservas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días de anticipación para reservas
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.business?.advanceBookingDays || 30}
              onChange={(e) => handleSettingChange('business', 'advanceBookingDays', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 1, máximo 365 días</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horas para cancelación
            </label>
            <input
              type="number"
              min="0"
              max="72"
              value={settings.business?.cancellationHours || 24}
              onChange={(e) => handleSettingChange('business', 'cancellationHours', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 0, máximo 72 horas</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Máximo reservas por usuario
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.business?.maxReservationsPerUser || 3}
              onChange={(e) => handleSettingChange('business', 'maxReservationsPerUser', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 1, máximo 10 reservas</p>
          </div>
        </div>
      </div>

      {/* Configuración de precios */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Configuración de Precios</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Precios estacionales</h4>
              <p className="text-xs text-gray-500">Aplicar precios diferentes según la temporada</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.business?.seasonalPricing || false}
                onChange={(e) => handleSettingChange('business', 'seasonalPricing', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Precios dinámicos</h4>
              <p className="text-xs text-gray-500">Ajustar precios según la demanda</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.business?.dynamicPricing || false}
                onChange={(e) => handleSettingChange('business', 'dynamicPricing', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Descuentos por membresía</h4>
              <p className="text-xs text-gray-500">Aplicar descuentos automáticos a miembros</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.business?.membershipDiscounts || false}
                onChange={(e) => handleSettingChange('business', 'membershipDiscounts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'general': return renderGeneralSettings();
      case 'notifications': return renderNotificationSettings();
      case 'security': return renderSecuritySettings();
      case 'business': return renderBusinessSettings();
      default: return renderGeneralSettings();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <CogIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600">Gestiona la configuración del sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Secciones</h2>
            </div>
            <nav className="p-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <div>
                      <div className="text-sm font-medium">{section.title}</div>
                      <div className="text-xs text-gray-500">{section.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {sections.find(s => s.id === activeSection)?.title}
              </h2>
              <p className="text-gray-600 mt-1">
                {sections.find(s => s.id === activeSection)?.description}
              </p>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">Cargando configuración...</span>
                  </div>
                </div>
              ) : (
                <>
                  {hasChanges && (
                    <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className="text-sm text-yellow-800">Tienes cambios sin guardar</span>
                      </div>
                    </div>
                  )}
                  {renderContent()}
                </>
              )}
              <div className="mt-8 flex justify-end space-x-3">
                <button 
                  onClick={cancelChanges}
                  disabled={!hasChanges || saving}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveSettings}
                  disabled={!hasChanges || saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}