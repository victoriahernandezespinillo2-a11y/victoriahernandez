'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { adminApi } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { UserCircleIcon, EnvelopeIcon, PhoneIcon, ShieldCheckIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();

  const userId = (session?.user as any)?.id as string | undefined;
  const userEmail = session?.user?.email || '';
  const userRole = (session?.user as any)?.role || 'ADMIN';
  const userName = session?.user?.name || '';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Preferencias
  const [theme, setTheme] = useState<'light'|'dark'|'system'>(() => (typeof window !== 'undefined' ? (localStorage.getItem('theme') as any) : 'system') || 'system');
  const [language, setLanguage] = useState<'es'|'en'>(() => (typeof window !== 'undefined' ? ((localStorage.getItem('lang') as 'es'|'en') || 'es') : 'es'));

  // Cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (!userName) return;
    const parts = userName.split(' ');
    setFirstName(parts[0] || '');
    setLastName(parts.slice(1).join(' ') || '');
  }, [userName]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('theme', theme);
    localStorage.setItem('lang', language);
    // Aplicar tema
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else if (theme === 'light') root.classList.remove('dark');
    // Si es system, respetar preferencia del SO
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [theme, language]);

  const canSave = !!userId && (firstName.trim().length > 0 || lastName.trim().length > 0 || phone.trim().length > 0);

  const handleSave = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      const payload: any = {};
      if (firstName.trim()) payload.firstName = firstName.trim();
      if (lastName.trim()) payload.lastName = lastName.trim();
      if (phone.trim()) payload.phone = phone.trim();
      await adminApi.users.update(userId, payload);
      showToast({ variant: 'success', title: 'Perfil actualizado', message: 'Tus cambios han sido guardados correctamente.' });
    } catch (e: any) {
      showToast({ variant: 'error', title: 'No se pudo guardar', message: e?.message || 'Error al actualizar el perfil' });
    } finally {
      setSaving(false);
    }
  };

  const canChangePassword = () => newPassword.length >= 8 && newPassword === confirmPassword && currentPassword.length > 0;

  const handleChangePassword = async () => {
    try {
      setChangingPass(true);
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showToast({ variant: 'success', title: 'Contraseña actualizada', message: 'Tu contraseña ha sido cambiada.' });
    } catch (e: any) {
      showToast({ variant: 'error', title: 'No se pudo cambiar', message: e?.message || 'Error al cambiar contraseña' });
    } finally {
      setChangingPass(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <UserCircleIcon className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-600">Gestiona tu información personal y preferencias</p>
        </div>
      </div>

      {/* Info rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Rol</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{userRole}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <EnvelopeIcon className="h-4 w-4" /> Correo
          </div>
          <div className="mt-1 text-lg font-semibold text-gray-900 break-all">{userEmail}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ShieldCheckIcon className="h-4 w-4" /> Seguridad
          </div>
          <div className="mt-1 text-sm text-gray-700">Protege tu cuenta desde Configuración</div>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Información personal</h2>
          <p className="text-gray-600 text-sm">Esta información puede ser visible para el equipo administrativo</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Tus apellidos"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <div className="relative">
              <PhoneIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ej. +57 300 123 4567"
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <a href="/settings" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            <Cog6ToothIcon className="h-5 w-5" /> Configuración
          </a>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Preferencias */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Preferencias</h2>
          <p className="text-gray-600 text-sm">Tema y lenguaje de la interfaz</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option value="system">Sistema</option>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seguridad: cambio de contraseña */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Seguridad</h2>
          <p className="text-gray-600 text-sm">Cambia tu contraseña regularmente</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button onClick={handleChangePassword} disabled={!canChangePassword() || changingPass} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60">
            {changingPass ? 'Actualizando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
}
